import { GoogleGenerativeAI } from '@google/generative-ai'
import { FileState, GoogleAIFileManager } from '@google/generative-ai/server'
import crypto from 'crypto'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
export const runtime = 'nodejs'

type InlineFrame = {
  base64?: string
  mediaType?: string
  mimeType?: string
}

type UploadedMedia = {
  uri: string
  mimeType: string
  name: string
}

type GeminiPart =
  | { text: string }
  | { inlineData: { data: string; mimeType: string } }
  | { fileData: { fileUri: string; mimeType: string } }

const SPORT_CHECKLISTS: Record<string, string> = {
  tennis: `
Reference exact timestamps whenever possible.
Evaluate the shot type context first, then visible checkpoints:
GRIP: Eastern/Western/Semi-Western/Continental? Appropriate for the selected shot?
READY POSITION: Feet width vs shoulders, knee bend, weight on balls of feet.
UNIT TURN: Full body rotation or arm-only swing; shoulder turn percentage.
TAKEBACK: Depth, loop shape, racket head height, timing by timestamp.
SWING PATH: Low-to-high angle estimate, racket lag, wrist/racket release.
CONTACT POINT: In front/beside/behind body, extension, head position at contact.
FOLLOW THROUGH: Finish path, early deceleration, balance after contact.
FOOTWORK: Stance, loading leg, weight transfer, recovery step timing.
RECOVERY: Whether the player returns to a ready/centered position.`,
  golf: `
Reference exact timestamps whenever possible.
Evaluate the shot type context first, then visible checkpoints:
ADDRESS: Feet width, ball position, spine tilt, alignment, knee flex angle.
GRIP: Hand position, grip style if visible, grip pressure clues.
TAKEAWAY: Inside/outside/on-line, one-piece motion, clubhead relation to hands.
BACKSWING PLANE: Club plane at parallel, degrees above/below plane.
SHOULDER TURN: Rotation estimate, lead shoulder depth, head stability.
HIP RESISTANCE: Hips resist shoulder turn or over-rotate.
TRANSITION: Lower body vs upper body start, sequencing, casting.
LAG: Retained lag vs early release at timestamped downswing positions.
IMPACT: Hands ahead/neutral/behind, weight on lead side, face angle if visible.
FOLLOW THROUGH: Extension, finish height, balance held.`,
  baseball: `
Reference exact timestamps whenever possible.
Evaluate the movement type context first, then visible checkpoints:
STANCE: Feet width, posture, weight distribution, bat/arm slot if visible.
LOAD: Hip coil, hand position, balance, timing.
STRIDE: Direction, stride length, front-foot landing.
SEQUENCING: Hips before hands/arm, trunk rotation timing.
PATH: Bat path or throwing arm path, plane, extension.
CONTACT/RELEASE: Contact point or release point relative to body.
FINISH: Extension, deceleration, balance, repeatability.`,
  basketball: `
Reference exact timestamps whenever possible.
Evaluate the shot type context first, then visible checkpoints:
STANCE: Feet alignment, width, balance, shooting foot turn.
SHOT POCKET: Ball location relative to torso and shooting shoulder.
ELBOW ALIGNMENT: Elbow under ball vs flared, forearm angle.
GUIDE HAND: Placement and whether it interferes with release.
LEG DRIVE: Knee bend estimate, force timing, vertical balance.
RELEASE POINT: Height, extension, timing, consistency.
WRIST SNAP: Follow-through position and backspin clues if visible.
LANDING: Balance, drift, and repeatability after release.`,
}

const SPORT_EXPERT: Record<string, string> = {
  tennis: 'You are an elite tennis coach who has trained ATP/WTA professionals. Give specific technical feedback with timestamp references, estimated measurements, and clear drills.',
  golf: 'You are a PGA Master Professional. Give specific swing analysis with timestamp references, angle estimates, sequencing details, and practical drills.',
  baseball: 'You are an elite baseball coach. Give specific hitting, pitching, and movement feedback with timestamp references and measurable fixes.',
  basketball: 'You are an elite shooting coach. Give specific technical feedback with timestamp references, body alignment details, and measurable drills.',
}

function normalizeSport(sport: unknown) {
  const key = String(sport || 'tennis').toLowerCase()
  return key === 'pickleball' ? 'tennis' : key
}

function extensionForMimeType(mimeType: string) {
  if (mimeType.includes('quicktime')) return 'mov'
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('png')) return 'png'
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg'
  return mimeType.startsWith('image/') ? 'img' : 'mp4'
}

async function writeBase64ToTempFile(base64: string, mimeType: string) {
  const clean = base64.includes(',') ? base64.split(',').pop() || '' : base64
  const filePath = path.join(
    os.tmpdir(),
    `playvia-analysis-${crypto.randomBytes(8).toString('hex')}.${extensionForMimeType(mimeType)}`
  )
  await fs.writeFile(filePath, Buffer.from(clean, 'base64'))
  return filePath
}

async function uploadBase64Media(
  fileManager: GoogleAIFileManager,
  base64: string,
  mimeType: string,
  label: string
): Promise<UploadedMedia> {
  const tmpPath = await writeBase64ToTempFile(base64, mimeType)
  try {
    const uploaded = await fileManager.uploadFile(tmpPath, {
      mimeType,
      displayName: `playvia-${label}-${Date.now()}`,
    })

    let file = await fileManager.getFile(uploaded.file.name)
    for (let i = 0; file.state === FileState.PROCESSING && i < 22; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500))
      file = await fileManager.getFile(uploaded.file.name)
    }

    if (file.state === FileState.FAILED) throw new Error(`${label} upload failed while Gemini processed the file.`)
    if (file.state !== FileState.ACTIVE) throw new Error(`${label} video is still processing. Try again in a moment.`)

    return { uri: file.uri, mimeType: file.mimeType || mimeType, name: file.name }
  } finally {
    await fs.unlink(tmpPath).catch(() => {})
  }
}

function inlineParts(frames: InlineFrame[] | undefined, imageBase64?: string, mediaType?: string): GeminiPart[] {
  if (Array.isArray(frames) && frames.length > 0) {
    return frames
      .filter(frame => frame.base64)
      .map(frame => ({
        inlineData: {
          data: frame.base64!,
          mimeType: frame.mediaType || frame.mimeType || 'image/jpeg',
        },
      }))
  }
  if (imageBase64) {
    return [{ inlineData: { data: imageBase64, mimeType: mediaType || 'image/jpeg' } }]
  }
  return []
}

function parseJsonFromModel(text: string) {
  const clean = text.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(clean)
  } catch {
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1))
    throw new Error('Model returned invalid JSON.')
  }
}

function buildPrompt({
  sport,
  playerName,
  shotType,
  cameraAngle,
  playerHistory,
  isComparison,
}: {
  sport: string
  playerName?: string
  shotType?: string
  cameraAngle?: string
  playerHistory?: string
  isComparison: boolean
}) {
  const expert = SPORT_EXPERT[sport] || SPORT_EXPERT.tennis
  const checklist = SPORT_CHECKLISTS[sport] || SPORT_CHECKLISTS.tennis
  const history = playerHistory ? `\nPlayer history:\n${playerHistory}\n` : ''

  return `${expert}
PLAYER: ${playerName || 'Unknown'} | SPORT: ${sport} | SHOT TYPE: ${shotType || 'not specified'} | ANGLE: ${cameraAngle || 'unknown'}
${history}
${checklist}

${isComparison
  ? 'Compare the first media item against the second media item. Describe before/after changes using timestamps from each video when available.'
  : 'Analyze the full media item. Use timestamps instead of frame numbers whenever video is provided.'}

Rules:
- Return ONLY valid JSON. No markdown.
- Be specific and useful. Avoid generic praise.
- Reference timestamps like "0:03" or "at 2.4s" whenever motion is visible.
- Estimate measurements when exact values are not possible: degrees, inches, percentage, distance from body, or timing.
- Do not invent ball flight, make/miss, shot result, contact quality, or tactical outcome if not visible.
- Prioritize the top 2-4 improvements, each with a drill the player can perform.

Return this exact JSON shape:
{
  "observations": "timestamp-by-timestamp breakdown with specific measurements",
  "technique_notes": "biomechanical implications paragraph with timestamp references",
  "strengths": [{"area": "checkpoint name", "what_i_see": "exact description with timestamp and measurement", "why_it_helps": "specific biomechanical benefit"}],
  "areas_to_improve": [{"area": "checkpoint name", "severity": "critical|moderate|minor", "what_i_see": "exact with timestamp and measurement", "ideal": "target measurement", "consequence": "specific chain reaction this causes", "drill": "specific drill name", "drill_sets_reps": "e.g. 3 sets of 10", "drill_instruction": "step by step instructions", "success_criteria": "how player self-checks correctness", "simple_cue": "one short memorable phrase"}],
  "overall_rating": "beginner|developing|intermediate|advanced|elite",
  "biggest_win": "single most impactful change with specific target measurement",
  "priority_focus": "what to drill every day this week with specific target",
  "confidence": "high|medium|low",
  "annotations": [{"label": "3-4 word label", "issue": "good|warning|error", "severity": "critical|moderate|minor", "x": 0.5, "y": 0.3, "note": "specific coaching cue with measurement"}]
}`
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
  }

  const body = await req.json()
  const {
    videoBase64,
    videoMimeType = 'video/mp4',
    compareVideoBase64,
    compareVideoMimeType = 'video/mp4',
    frames,
    imageBase64,
    mediaType,
    compareFrames,
    compareImageBase64,
    compareMediaType,
    playerName,
    sport = 'tennis',
    shotType,
    playerHistory = '',
    cameraAngle = 'side-on',
  } = body

  const normalizedSport = normalizeSport(sport)
  const fileManager = new GoogleAIFileManager(apiKey)
  const uploadedFiles: UploadedMedia[] = []

  try {
    const parts: GeminiPart[] = []

    if (videoBase64) {
      const uploaded = await uploadBase64Media(fileManager, videoBase64, videoMimeType, 'primary')
      uploadedFiles.push(uploaded)
      parts.push({ fileData: { fileUri: uploaded.uri, mimeType: uploaded.mimeType } })
    } else {
      parts.push(...inlineParts(frames, imageBase64, mediaType))
    }

    if (compareVideoBase64) {
      const uploaded = await uploadBase64Media(fileManager, compareVideoBase64, compareVideoMimeType, 'comparison')
      uploadedFiles.push(uploaded)
      parts.push({ fileData: { fileUri: uploaded.uri, mimeType: uploaded.mimeType } })
    } else {
      parts.push(...inlineParts(compareFrames, compareImageBase64, compareMediaType))
    }

    if (parts.length === 0) {
      return NextResponse.json({ error: 'No video, image, or frame data provided' }, { status: 400 })
    }

    const prompt = buildPrompt({
      sport: normalizedSport,
      playerName,
      shotType,
      cameraAngle,
      playerHistory,
      isComparison: Boolean(compareVideoBase64 || compareFrames?.length || compareImageBase64),
    })

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    })

    const result = await model.generateContent([...parts, { text: prompt }])
    const data = parseJsonFromModel(result.response.text())
    return NextResponse.json(data)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to analyze video'
    console.error('Video analysis error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    await Promise.all(uploadedFiles.map(file => fileManager.deleteFile(file.name).catch(() => {})))
  }
}