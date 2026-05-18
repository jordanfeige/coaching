import { GoogleGenerativeAI } from '@google/generative-ai'
import { FileState, GoogleAIFileManager } from '@google/generative-ai/server'
import crypto from 'crypto'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { calculateScore, extractCheckpointScores } from '@/lib/scoring'
import { sendAnalysisComplete } from '@/lib/email'

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

type AnalysisIssue = {
  area?: string
  severity?: string
}

type AnalysisResult = {
  areas_to_improve?: Array<AnalysisIssue | string>
  strengths?: unknown[]
  overall_rating?: string
  biggest_win?: string
  confidence?: string
}

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
  pickleball: `
Reference exact timestamps whenever possible.
Evaluate: Ready position & paddle height, Serve mechanics, Dinking (quiet wrist, kitchen line discipline, soft hands), Volley & reset technique, Third shot drop vs drive decision, Overhead/ATP shots, Footwork & transition zone movement, Doubles positioning.`,
}

const SPORT_EXPERT: Record<string, string> = {
  tennis: 'You are an elite tennis coach who has trained ATP/WTA professionals. Give specific technical feedback with timestamp references, estimated measurements, and clear drills.',
  golf: 'You are a PGA Master Professional. Give specific swing analysis with timestamp references, angle estimates, sequencing details, and practical drills.',
  baseball: 'You are an elite baseball coach. Give specific hitting, pitching, and movement feedback with timestamp references and measurable fixes.',
  basketball: 'You are an elite shooting coach. Give specific technical feedback with timestamp references, body alignment details, and measurable drills.',
  pickleball: 'You are an elite pickleball coach with deep expertise in the kitchen game, transition zone, and doubles positioning. Give specific feedback with timestamps and measurable targets.',
}

function normalizeSport(sport: unknown) {
  const key = String(sport || 'tennis').toLowerCase()
  return key
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

async function writeUrlToTempFile(url: string, mimeType: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Could not fetch uploaded video (${response.status})`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const filePath = path.join(
    os.tmpdir(),
    `playvia-analysis-${crypto.randomBytes(8).toString('hex')}.${extensionForMimeType(mimeType)}`
  )
  await fs.writeFile(filePath, Buffer.from(arrayBuffer))
  return filePath
}

async function uploadUrlMedia(
  fileManager: GoogleAIFileManager,
  url: string,
  mimeType: string,
  label: string
): Promise<UploadedMedia> {
  const tmpPath = await writeUrlToTempFile(url, mimeType)
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

function issueSeverity(issue: AnalysisIssue | string) {
  return typeof issue === 'string' ? 'moderate' : issue.severity
}

function issueArea(issue: AnalysisIssue | string) {
  return typeof issue === 'string' ? issue : issue.area || null
}

function issueCount(issues: Array<AnalysisIssue | string>, severity: string) {
  return issues.filter(issue => issueSeverity(issue) === severity).length
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
- MANDATORY: areas_to_improve MUST contain at least 2 items on every analysis — no exceptions.
- MANDATORY: A real athlete always has something to improve. Returning 0 or 1 issues is never acceptable.
- MANDATORY: Do not add extra strengths to compensate for lack of issues — only list genuine observed strengths with clear visual evidence.
- Typical amateur: 1 critical + 2 moderate + 1 minor issues. Typical intermediate: 2 moderate + 2 minor. Even elite players have minor issues.
- If video quality limits visibility, still identify the most likely issues from what IS visible and set confidence to low.
- strengths array should have a maximum of 3 items — be selective and honest.

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
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Please sign up to analyze videos', requiresSignup: true },
      { status: 401 }
    )
  }

  const {
    videoBase64,
    videoUrl,
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
    cameraAngle,
  } = body

  const { data: profile } = await supabase
    .from('profiles')
    .select('analyses_used, is_subscribed')
    .eq('id', user.id)
    .single()
  const analysesUsed = Number(profile?.analyses_used || 0)
  const isSubscribed = Boolean(profile?.is_subscribed)

  if (!isSubscribed && analysesUsed >= 3) {
    const { data: scoreRows } = await supabase
      .from('analysis_sessions')
      .select('overall_score')
      .eq('user_id', user.id)
      .order('analyzed_at', { ascending: false })
      .limit(3)
    const scorePreview = (scoreRows ?? [])
      .map(row => row.overall_score)
      .filter((score): score is number => typeof score === 'number')
      .reverse()

    return NextResponse.json(
      {
        error: 'Free limit reached',
        requiresUpgrade: true,
        analyses_used: analysesUsed,
        score_preview: scorePreview.length ? scorePreview : null,
      },
      { status: 402 }
    )
  }

  const normalizedSport = normalizeSport(sport)
  const normalizedCameraAngle = cameraAngle || 'side-on'
  const fileManager = new GoogleAIFileManager(apiKey)
  const uploadedFiles: UploadedMedia[] = []

  try {
    const parts: GeminiPart[] = []

    if (videoUrl) {
      const uploaded = await uploadUrlMedia(fileManager, videoUrl, videoMimeType, 'primary')
      uploadedFiles.push(uploaded)
      parts.push({ fileData: { fileUri: uploaded.uri, mimeType: uploaded.mimeType } })
    } else if (videoBase64) {
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
      cameraAngle: normalizedCameraAngle,
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
    const data = parseJsonFromModel(result.response.text()) as AnalysisResult
    const overallScore = calculateScore(data)
    console.log('Score breakdown:', {
      sport,
      areas_count: data.areas_to_improve?.length || 0,
      strengths_count: data.strengths?.length || 0,
      rating: data.overall_rating,
      confidence: data.confidence,
      final_score: overallScore,
      issues: data.areas_to_improve?.map((i: any) => ({
        area: i.area || i,
        severity: i.severity || 'moderate',
      })),
    })
    const checkpointScores = extractCheckpointScores(data, normalizedSport || 'tennis')
    const issues = Array.isArray(data.areas_to_improve) ? data.areas_to_improve : []
    const topIssue = issues.length ? issueArea(issues[0]) : null

    const { data: previousRows } = await supabase
      .from('analysis_sessions')
      .select('overall_score')
      .eq('user_id', user.id)
      .order('analyzed_at', { ascending: false })
      .limit(1)
    const previousScore = typeof previousRows?.[0]?.overall_score === 'number'
      ? previousRows[0].overall_score
      : null

    await supabase.from('analysis_sessions').insert({
      user_id: user.id,
      sport: normalizedSport || 'tennis',
      shot_type: shotType || null,
      overall_score: overallScore,
      rating: data.overall_rating,
      strengths_count: data.strengths?.length || 0,
      critical_count: issueCount(issues, 'critical'),
      moderate_count: issueCount(issues, 'moderate'),
      minor_count: issueCount(issues, 'minor'),
      top_issue: topIssue,
      biggest_win: data.biggest_win || null,
      checkpoint_scores: checkpointScores,
      full_result: data,
    })
    await supabase
      .from('profiles')
      .update({ analyses_used: analysesUsed + 1 })
      .eq('id', user.id)

    if (user.email && overallScore) {
      await sendAnalysisComplete({
        to: user.email,
        playerName: playerName || 'Athlete',
        sport: normalizedSport || 'tennis',
        shotType: shotType || '',
        overallScore,
        rating: data.overall_rating || 'developing',
        topIssue: topIssue || 'technique',
        biggestWin: data.biggest_win || '',
        analysisUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://playvia.studio'}/player/progress`,
      })
    }

    return NextResponse.json({
      ...data,
      overall_score: overallScore,
      checkpoint_scores: checkpointScores,
      previous_score: previousScore,
      score_delta: previousScore === null ? null : overallScore - previousScore,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to analyze video'
    console.error('Video analysis error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    await Promise.all(uploadedFiles.map(file => fileManager.deleteFile(file.name).catch(() => {})))
  }
}