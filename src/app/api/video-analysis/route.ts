import type { GenerateContentResult, GenerativeModel } from '@google/generative-ai'
import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from '@google/generative-ai'
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server'
import crypto from 'crypto'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
/** Large uploads + File API processing can exceed 120s on cold starts */
export const maxDuration = 240

const SPORT_CHECKLISTS: Record<string, string> = {
  tennis: `
Evaluate each of these checkpoints explicitly:
SETUP: Ready position, split step timing, grip type
PREPARATION: Unit turn completeness, racket takeback, non-dominant arm
SWING PATH: Low-to-high brushing motion, swing plane, wrist lag
CONTACT: Contact point position (in front/to side), arm extension, head position
FOLLOW-THROUGH: Finish position, racket path over shoulder, weight transfer
FOOTWORK: Stance width, weight loading, recovery step`,

  golf: `
Evaluate each of these checkpoints explicitly:
SETUP: Grip pressure, stance width, ball position, spine angle, knee flex, alignment
BACKSWING: Club path, shoulder turn degrees, hip resistance, wrist hinge, weight shift
TRANSITION: Sequence (lower body leads), pause at top, club position
DOWNSWING: Hip slide vs rotation, lag retention, shoulder drop
IMPACT: Hands ahead of ball, weight on lead side, club face angle, divot direction
FOLLOW-THROUGH: Full extension, high finish, balance held`,

  pickleball: `
Evaluate each of these checkpoints explicitly:
SERVE: Toss or drop consistency, contact height, paddle angle, weight transfer, depth & placement
RETURN OF SERVE: Ready position, split step, block vs drive selection, depth control
DINKING: Soft hands, stable paddle face, contact in front, patience at the kitchen line
VOLLEYS / RESETS: Compact stroke, quiet paddle through contact, blocking pace, avoiding pop-ups
THIRD SHOT: Drop vs drive decision, arc over the net, targeting opponents' feet
DRIVES / SPEED-UPS: Timing, hip rotation, paddle path, target selection
FOOTWORK & POSITIONING: Kitchen discipline, lateral recovery, transition steps
DOUBLES (if visible): Stacking, middle balls, communication, poach timing`,

  basketball: `
Evaluate each of these checkpoints explicitly:
STANCE: Feet shoulder-width, knees bent, dominant foot slightly forward
GRIP: Fingertip control, guide hand position, wrist position
SHOT POCKET: Ball position, elbow alignment, set point
RELEASE: Leg drive, elbow extension, wrist snap, follow-through
BALANCE: Base, landing position, eyes on target`,
}

const SPORT_EXPERT: Record<string, string> = {
  tennis:
    'You are an elite tennis coach who has trained ATP/WTA professionals. You have deep expertise in biomechanics, stroke mechanics, and movement patterns.',
  golf:
    'You are a PGA Master Professional with 20+ years analyzing swings. You have deep expertise in golf biomechanics, club fitting, and swing sequencing.',
  pickleball:
    'You are a certified elite pickleball coach (USA Pickleball–style curriculum). You specialize in doubles positioning, kitchen play, serve and return patterns, third-shot decisions, and pace control.',
  basketball:
    'You are an elite shooting coach who has worked with NBA players. You have deep expertise in shooting mechanics, footwork, and muscle memory.',
}

type UploadedFile = { uri: string; mimeType: string; name: string }

/** Retries per model when Google returns 429 / quota / RetryInfo (then outer loop may try fallback models). */
const QUOTA_GENERATION_MAX_RETRIES = 6

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function isRetryableQuotaError(e: unknown): boolean {
  if (e instanceof GoogleGenerativeAIFetchError) {
    if (e.status === 429) return true
    const details = e.errorDetails
    if (Array.isArray(details)) {
      for (const d of details) {
        const t = typeof d?.['@type'] === 'string' ? d['@type'] : ''
        if (t.includes('QuotaFailure') || t.includes('RetryInfo')) return true
      }
    }
  }
  const msg = e instanceof Error ? e.message : String(e)
  return /Please retry in|QuotaFailure|RESOURCE_EXHAUSTED|quota exceeded|rate limit|\b429\b/i.test(msg)
}

/** Parses RetryInfo.retryDelay (protobuf Duration e.g. "2.093800413s") or "Please retry in 2.09s" in message. */
function retryDelayMsFromError(e: unknown): number | null {
  const msg = e instanceof Error ? e.message : ''
  const fromMsg = msg.match(/retry in ([\d.]+)\s*s\b/i)
  if (fromMsg) {
    const sec = parseFloat(fromMsg[1])
    if (!Number.isNaN(sec)) return Math.min(120_000, Math.ceil(sec * 1000) + 250)
  }
  if (e instanceof GoogleGenerativeAIFetchError && Array.isArray(e.errorDetails)) {
    for (const d of e.errorDetails) {
      const t = typeof d?.['@type'] === 'string' ? d['@type'] : ''
      if (!t.includes('RetryInfo')) continue
      const rd = d.retryDelay
      if (typeof rd === 'string') {
        const mm = rd.match(/^([\d.]+)s?$/)
        if (mm) {
          const sec = parseFloat(mm[1])
          if (!Number.isNaN(sec)) return Math.min(120_000, Math.ceil(sec * 1000) + 250)
        }
      }
    }
  }
  return null
}

async function generateContentWithBackoff(
  model: GenerativeModel,
  parts: Parameters<GenerativeModel['generateContent']>[0],
  opts: { maxRetries: number }
): Promise<GenerateContentResult> {
  let lastErr: unknown
  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      return await model.generateContent(parts)
    } catch (e) {
      lastErr = e
      if (!isRetryableQuotaError(e) || attempt === opts.maxRetries - 1) {
        throw e
      }
      const fromApi = retryDelayMsFromError(e)
      const fallback = Math.min(60_000, 2000 * 2 ** attempt)
      const waitMs = fromApi ?? fallback
      console.warn(`[video-analysis] quota/rate limit (${attempt + 1}/${opts.maxRetries}), waiting ${waitMs}ms`)
      await sleep(waitMs)
    }
  }
  throw lastErr
}

/** Prefer GEMINI_MODEL, then GEMINI_MODEL_FALLBACK (comma-separated), then stable defaults. */
function geminiModelIds(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim()
  const extra =
    process.env.GEMINI_MODEL_FALLBACK?.split(',')
      .map(s => s.trim())
      .filter(Boolean) ?? []
  const defaults = ['gemini-2.0-flash', 'gemini-2.0-flash-001', 'gemini-1.5-flash-latest', 'gemini-1.5-flash']
  const ordered = [...(primary ? [primary] : []), ...extra, ...defaults]
  return [...new Set(ordered)]
}

function assertHttpUrl(url: string, label: string) {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
      throw new Error('bad protocol')
    }
  } catch {
    throw new Error(`Invalid ${label} URL. Open the video once, then try Analyze again.`)
  }
}

async function uploadRemoteVideo(
  fileManager: GoogleAIFileManager,
  url: string,
  label: string
): Promise<UploadedFile> {
  assertHttpUrl(url, label)
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) {
    throw new Error(
      `Could not download video (HTTP ${res.status}). The signed link may have expired — reload the page and try again.`
    )
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const ct = (res.headers.get('content-type') || '').split(';')[0].trim()
  const ext =
    ct.includes('webm') ? 'webm' : ct.includes('quicktime') ? 'mov' : ct.includes('x-msvideo') ? 'avi' : 'mp4'
  const mime = ct.startsWith('video/') ? ct : 'video/mp4'

  const tmp = path.join(os.tmpdir(), `playvia-${label}-${crypto.randomBytes(6).toString('hex')}.${ext}`)
  await fs.writeFile(tmp, buf)
  try {
    const uploaded = await fileManager.uploadFile(tmp, {
      mimeType: mime,
      displayName: `playvia-${label}-${Date.now()}`,
    })
    let meta = await fileManager.getFile(uploaded.file.name)
    let tries = 0
    while (meta.state === FileState.PROCESSING && tries < 45) {
      await new Promise(r => setTimeout(r, 2000))
      meta = await fileManager.getFile(uploaded.file.name)
      tries++
    }
    if (meta.state === FileState.FAILED) throw new Error('Video processing failed on Gemini File API')
    if (meta.state !== FileState.ACTIVE) throw new Error('Video is still processing — try again in a moment')
    return { uri: meta.uri, mimeType: meta.mimeType, name: meta.name }
  } finally {
    await fs.unlink(tmp).catch(() => {})
  }
}

function parseJsonFromModel(text: string) {
  const clean = text.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(clean)
  } catch {
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1))
    throw new Error('Model returned invalid JSON — try again or shorten the clip.')
  }
}

/** response.text() throws when the prompt or candidate is blocked; recover details when possible. */
function extractModelText(result: GenerateContentResult): string {
  const response = result.response
  const blockReason = response.promptFeedback?.blockReason
  if (blockReason) {
    throw new Error(`Request blocked (${blockReason}). Try different footage or a shorter clip.`)
  }

  try {
    return response.text()
  } catch {
    const cand = response.candidates?.[0]
    const parts = cand?.content?.parts as Array<{ text?: string }> | undefined
    const joined = parts?.map(p => p?.text ?? '').join('').trim()
    if (joined) return joined

    const finish = cand?.finishReason
    if (finish) {
      throw new Error(`Generation stopped (${finish}). Try a shorter or lower-resolution video.`)
    }
    throw new Error('Empty response from Gemini — try again or switch GEMINI_MODEL in env.')
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    frames,
    imageBase64,
    mediaType,
    compareFrames,
    compareImageBase64,
    compareMediaType,
    playerName,
    sport = 'tennis',
    playerHistory = '',
    cameraAngle = 'side-on',
    videoUrl,
    compareVideoUrl,
  } = body as Record<string, unknown>

  const athleteLabel =
    typeof playerName === 'string' && playerName.trim().length > 0 ? playerName.trim() : 'the athlete'

  const sportRaw =
    typeof sport === 'string' && sport.trim().length > 0 ? sport.trim().toLowerCase() : 'tennis'
  const sportKey = sportRaw === 'baseball' ? 'pickleball' : sportRaw

  const expert = SPORT_EXPERT[sportKey] || SPORT_EXPERT.tennis
  const checklist = SPORT_CHECKLISTS[sportKey] || SPORT_CHECKLISTS.tennis
  const historyContext =
    typeof playerHistory === 'string' && playerHistory.trim().length > 0
      ? `\nPlayer history & known issues:\n${playerHistory}\n`
      : ''

  const hasCompare = !!(
    (compareFrames as unknown[])?.length ||
    compareImageBase64 ||
    (typeof compareVideoUrl === 'string' && compareVideoUrl.trim().length > 0)
  )
  const isComparison = hasCompare

  const prompt = isComparison
    ? `${expert}

You are comparing two recordings of ${athleteLabel} — FIRST video is the older/baseline clip; SECOND video is the newer clip.
Camera angle: ${cameraAngle}
${historyContext}

${checklist}

Keep written fields concise but specific. session_headline max ~100 characters. overview_bullets: exactly 3 short bullets (progress, biggest gap, next action).

Respond with ONLY a JSON object (no markdown) using keys:
session_headline, overview_bullets, observations_old, observations_new, improvements (array of {area, description}), still_needs_work (array of {area, severity, description, drill, drill_instruction}), technique_notes, progress_summary, priority_focus, annotations (array of {label, issue: good|warning|error, severity: critical|moderate|minor, x, y, note}).`
    : `${expert}

You are analyzing ${athleteLabel}'s ${sportKey} technique from the attached visual media (video and/or frames).
Camera angle: ${cameraAngle}
${historyContext}

${checklist}

Keep written fields concise but specific. session_headline max ~100 characters. overview_bullets: exactly 3 short bullets (what's working, biggest fix, one drill to run).

Respond with ONLY a JSON object (no markdown) using keys:
session_headline, overview_bullets, observations, technique_notes, strengths (array of {area, description}), areas_to_improve (array of {area, severity, description, drill, drill_instruction}), overall_rating (beginner|developing|intermediate|advanced|elite), coach_tip, priority_focus, confidence (high|medium|low), annotations (array of {label, issue: good|warning|error, severity: critical|moderate|minor, x, y, note}).`

  const fileManager = new GoogleAIFileManager(apiKey)
  const genAI = new GoogleGenerativeAI(apiKey)

  const uploadedRemote: string[] = []

  try {
    const parts: any[] = []

    const vu = typeof videoUrl === 'string' ? videoUrl.trim() : ''
    const cvu = typeof compareVideoUrl === 'string' ? compareVideoUrl.trim() : ''

    if (vu) {
      const primary = await uploadRemoteVideo(fileManager, vu, 'primary')
      uploadedRemote.push(primary.name)
      parts.push({ fileData: { mimeType: primary.mimeType, fileUri: primary.uri } })
      if (cvu) {
        const secondary = await uploadRemoteVideo(fileManager, cvu, 'compare')
        uploadedRemote.push(secondary.name)
        parts.push({ fileData: { mimeType: secondary.mimeType, fileUri: secondary.uri } })
      }
    }

    if (!parts.length && Array.isArray(frames) && frames.length) {
      for (const f of frames as Array<{ mediaType?: string; base64: string }>) {
        parts.push({
          inlineData: {
            mimeType: f.mediaType || 'image/jpeg',
            data: f.base64,
          },
        })
      }
      if (Array.isArray(compareFrames) && compareFrames.length) {
        for (const f of compareFrames as Array<{ mediaType?: string; base64: string }>) {
          parts.push({
            inlineData: {
              mimeType: f.mediaType || 'image/jpeg',
              data: f.base64,
            },
          })
        }
      }
    }

    if (!parts.length && typeof imageBase64 === 'string' && imageBase64.length > 0) {
      parts.push({
        inlineData: {
          mimeType: typeof mediaType === 'string' ? mediaType : 'image/jpeg',
          data: imageBase64,
        },
      })
      if (typeof compareImageBase64 === 'string' && compareImageBase64.length > 0) {
        parts.push({
          inlineData: {
            mimeType: typeof compareMediaType === 'string' ? compareMediaType : 'image/jpeg',
            data: compareImageBase64,
          },
        })
      }
    }

    if (!parts.length) {
      return NextResponse.json(
        { error: 'Provide videoUrl, frames, or imageBase64 for analysis' },
        { status: 400 }
      )
    }

    parts.push({ text: prompt })

    const models = geminiModelIds()
    let lastErr = 'Video analysis failed'
    let lastWasQuota = false

    for (const modelId of models) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelId,
          generationConfig: {
            temperature: 0.35,
            // Do not force responseMimeType: JSON — it often errors with File API video on some models/API revisions.
          },
        })
        const result = await generateContentWithBackoff(model, parts, {
          maxRetries: QUOTA_GENERATION_MAX_RETRIES,
        })
        const text = extractModelText(result)
        const data = parseJsonFromModel(text)
        return NextResponse.json(data)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        lastErr = msg
        lastWasQuota = isRetryableQuotaError(e)
        console.error(`[video-analysis] model ${modelId} failed:`, msg)
      }
    }

    return NextResponse.json(
      {
        error: lastWasQuota
          ? `${lastErr} If this persists, wait and retry, use GEMINI_MODEL_FALLBACK, or review https://ai.google.dev/gemini-api/docs/rate-limits`
          : lastErr,
      },
      { status: lastWasQuota ? 503 : 500 }
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to analyze video'
    console.error('[video-analysis]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    for (const name of uploadedRemote) {
      await fileManager.deleteFile(name).catch(() => {})
    }
  }
}
