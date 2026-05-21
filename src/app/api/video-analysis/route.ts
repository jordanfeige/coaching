import { GoogleGenerativeAI } from '@google/generative-ai'
import { FileState, GoogleAIFileManager } from '@google/generative-ai/server'
import crypto from 'crypto'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { calculateScore, extractCheckpointScores } from '@/lib/scoring'
import { sendAnalysisComplete } from '@/lib/email'
import { ADMIN_EMAILS } from '@/lib/admin'
import { fullStoragePath, parseStoragePath } from '@/lib/reel-storage'

export const maxDuration = 120
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
  root_cause?: string
  caused_by?: string
}

type AnalysisResult = {
  areas_to_improve?: Array<AnalysisIssue | string>
  strengths?: unknown[]
  overall_rating?: string
  biggest_win?: string
  confidence?: string
  confidence_note?: string
}

type FeedbackExample = {
  full_analysis: unknown
  comment?: string | null
}

type PosePromptData = {
  promptText?: string
  measurements?: unknown[]
  overallPostureScore?: number
}

const SPORT_EXPERT: Record<string, string> = {
  tennis: `You are Miguel Santos, a biomechanics PhD and USPTA Elite Professional with 22 years of experience coaching ATP and WTA tour players. You have published research on kinetic chain sequencing in tennis strokes and are known for your obsessive precision — you never say "your elbow is high" when you can say "your hitting elbow is 23 degrees above your shoulder plane at contact, where optimal is 8-12 degrees." You identify ROOT CAUSE issues, not compensations. You have seen thousands of forehands, backhands, and serves and can immediately spot the 1-2 fundamental flaws that are causing all the other problems. Your feedback is direct, specific, and immediately actionable.`,

  golf: `You are Dr. James Mackay, a biomechanics PhD, PGA Master Professional, and former biomechanics consultant to the European Tour. You have spent 25 years analyzing swings using TrackMan, force plates, and high-speed cameras. You think in degrees, inches, and milliseconds. You never give vague feedback — if a player's hip rotation is insufficient you say "your lead hip has rotated approximately 35 degrees at impact where Tour average for this shot is 45-55 degrees." You identify the ROOT CAUSE of swing faults — most amateurs have 1-2 fundamental issues that create 5-6 compensations, and you always find the root. You are direct, precise, and your feedback changes swings permanently.`,

  baseball: `You are Coach Ray Deluca, a former MLB hitting coordinator with 18 years of professional player development experience. You have worked with 12 MLB All-Stars and are known for your ability to identify mechanical flaws that scouts miss. You think in launch angles, hip-to-shoulder separation degrees, and bat path angles. You never say "your swing is flat" when you can say "your bat path enters the hitting zone at approximately -8 degrees where an optimal contact angle for this pitch height is -2 to +2 degrees." You identify the ROOT CAUSE of swing faults and your drills have a track record of fixing issues in 2-3 sessions.`,

  basketball: `You are Coach Diana Reyes, a former WNBA shooting coach and biomechanics specialist who has worked with NBA organizations for 14 years. You have broken down over 10,000 shot attempts on film and can identify micro-flaws in release mechanics that most coaches miss entirely. You think in degrees of elbow alignment, wrist snap timing, and leg drive sequencing. You never say "your release is off" when you can say "your guide hand index finger is applying lateral pressure at release — visible at 0:02 — causing a 3-5 degree clockwise rotation that produces consistent right-side misses." Your feedback is precise enough that players can feel the correction immediately.`,

  pickleball: `You are Coach Teresa Nguyen, a Professional Pickleball Association certified coach and former tennis professional who has been coaching pickleball since its early growth phase. You have coached 3 national champions and specialize in the transition game and kitchen discipline. You think in paddle angles, contact point distances from the body, and kitchen line positioning. You are obsessive about the fundamentals that recreational players ignore — quiet wrist at the kitchen, soft hands on resets, third shot drop arc height — and your feedback identifies the 1-2 root issues that are costing players the most points.`,
}

const SPORT_CHECKLISTS: Record<string, string> = {
  tennis: `
BIOMECHANICAL ANALYSIS PROTOCOL — TENNIS:
Evaluate ALL of the following checkpoints. For each one visible 
in the footage, provide a specific measurement or observation.

1. GRIP: Identify grip type (Eastern/Semi-Western/Western/Continental). 
   Note bevel contact point. Flag if grip is causing early wrist 
   pronation or limiting spin potential.

2. READY POSITION & SPLIT STEP: Evaluate stance width (shoulder-width 
   is optimal), weight distribution (60/40 forward), and split step 
   timing relative to opponent contact.

3. UNIT TURN / SHOULDER ROTATION: Measure shoulder rotation degrees. 
   Optimal forehand unit turn is 90+ degrees. Note if hips and 
   shoulders rotate together (bad) or sequentially (good).

4. TAKEBACK / RACKET PREPARATION: Evaluate racket head position at 
   top of takeback. Note loop vs straight back. Flag late preparation.

5. SWING PATH: Identify swing plane (low-to-high for topspin = optimal 
   45-60 degree upward angle through contact zone). Note inside-out 
   vs outside-in path.

6. CONTACT POINT: Measure contact point distance from body (optimal 
   is 18-24 inches in front of lead hip). Note contact height 
   relative to ideal strike zone.

7. WRIST LAG & ACCELERATION: Note wrist snap timing. Premature 
   wrist release before contact loses significant racket head speed.

8. FOLLOW THROUGH: Measure follow through completion. Full topspin 
   follow through should finish over opposite shoulder with racket 
   face down. Note if arm decelerates before completion.

9. FOOTWORK & COURT POSITIONING: Evaluate stance (open/semi-open/closed), 
   foot plant timing, and weight transfer direction through contact.

10. RECOVERY STEP: Note recovery split step timing and return to 
    ready position. Flag if player watches the ball instead of recovering.

ROOT CAUSE PROTOCOL: After identifying all issues, determine which 
are PRIMARY (root causes) and which are SECONDARY (compensations). 
Most players have 1-2 root causes generating 3-4 compensations. 
Fixing a compensation without fixing the root is useless.`,

  golf: `
BIOMECHANICAL ANALYSIS PROTOCOL — GOLF:
Evaluate ALL of the following checkpoints with precise measurements.

1. ADDRESS & SETUP: Evaluate spine angle (optimal 30-35 degrees from 
   vertical), stance width (shoulder width for irons, slightly wider 
   for driver), ball position, weight distribution (50/50 for irons, 
   60% trail foot for driver), and grip pressure.

2. GRIP: Identify grip type (neutral/strong/weak). Note V's formed 
   by thumbs and forefingers. Flag if grip is causing face angle issues.

3. TAKEAWAY (0-18 inches): Club should move on a single plane with 
   hands, arms, and shoulders as one unit. Flag any early wrist hinge, 
   inside takeaway (causes over-the-top), or outside takeaway.

4. BACKSWING PLANE: At parallel, shaft should point at the target line 
   or slightly inside. Measure hip rotation (45 degrees optimal) vs 
   shoulder rotation (90 degrees optimal) to identify X-factor.

5. SHOULDER TURN & X-FACTOR: Measure shoulder turn vs hip turn 
   separation. Elite players achieve 45+ degrees of X-factor. 
   Note if shoulders and hips rotate together (power leak).

6. TRANSITION & SEQUENCING: Lower body should initiate downswing 
   before backswing completes. Flag if upper body fires first 
   (causes over-the-top, pull, or slice).

7. LAG & WRIST ANGLES: Measure wrist hinge retention into impact. 
   Early release (casting) costs significant distance. Optimal lag 
   angle at parallel on downswing is 90+ degrees.

8. IMPACT POSITION: This is the moment of truth. Evaluate hip position 
   (should be 45 degrees open at impact), shaft lean (forward lean 
   for irons = compression), head position (behind ball), and 
   weight shift (80%+ lead side at impact).

9. FOLLOW THROUGH & EXTENSION: Measure arm extension through the 
   ball. Both arms should be fully extended 12 inches past impact. 
   Note chicken wing (early arm breakdown = power and accuracy loss).

10. FINISH POSITION & BALANCE: Full finish should have 90%+ weight 
    on lead foot, trail foot on toe, belt buckle facing target, 
    hands high. Flag if player falls back (reverse pivot) or 
    loses balance.

ROOT CAUSE PROTOCOL: Identify which issues are PRIMARY vs SECONDARY. 
Most amateur faults trace to 1-2 setup issues or one transition flaw 
that creates multiple downstream compensations.`,

  baseball: `
BIOMECHANICAL ANALYSIS PROTOCOL — BASEBALL/SOFTBALL:
Evaluate ALL checkpoints with precise measurements.

1. STANCE & SETUP: Evaluate stance width (slightly wider than 
   shoulder width optimal), weight distribution (even to slight 
   load on back foot), hand position (letters height, away from body), 
   and bat angle (45 degrees optimal).

2. LOAD & WEIGHT SHIFT: Measure timing and depth of load. Back knee 
   should move inward (not backward) approximately 2-3 inches. 
   Flag premature weight shift forward.

3. STRIDE & TIMING: Evaluate stride length (6-8 inches optimal), 
   stride direction (straight to pitcher), and foot plant timing 
   relative to pitch arrival. Flag long stride (causes head movement 
   and timing issues).

4. HIP-TO-SHOULDER SEPARATION: Measure hip rotation initiation before 
   shoulder rotation. Elite hitters achieve 40-50 degrees of 
   separation. Hips should clear before hands begin path to ball.

5. BAT PATH & ATTACK ANGLE: Identify bat path plane. Optimal attack 
   angle is -5 to +5 degrees for line drives, +8 to +12 for 
   elevation. Flag steep chop (ground balls) or uppercut (pop-ups).

6. CONTACT POINT: Measure contact point position. Pull side contact 
   should be 6-8 inches in front of lead hip. Opposite field contact 
   slightly deeper. Note if player is reaching (too extended) or 
   jamming (too close).

7. EXTENSION THROUGH CONTACT: Evaluate arm extension 6-12 inches 
   past contact. Flag if player decelerates or rolls wrists early 
   (causes weak contact to pull side).

8. FOLLOW THROUGH: Full follow through should have both hands 
   extending to opposite field, then wrapping around naturally. 
   Flag one-handed finish (power leak) or barring of lead arm.

ROOT CAUSE PROTOCOL: Most hitting issues trace to timing (stride/load) 
or hip rotation. Identify root before listing compensations.`,

  basketball: `
BIOMECHANICAL ANALYSIS PROTOCOL — BASKETBALL SHOOTING:
Evaluate ALL checkpoints with precise measurements.

1. STANCE & BALANCE: Evaluate foot positioning (shooting foot 
   slightly forward, shoulder width apart), knee bend (15-20 degrees), 
   and weight distribution (balanced, ready to drive upward).

2. SHOT POCKET & BALL POSITION: Ball should be positioned at chest 
   to chin height in shot pocket, approximately 6-8 inches from body. 
   Flag if ball is too low (slow release) or too far from body (loss of control).

3. ELBOW ALIGNMENT: Shooting elbow should be directly under the ball, 
   pointing at the basket (not flared out). Measure elbow angle — 
   90 degrees at set point is optimal. Flag elbow flare (causes 
   lateral miss tendency).

4. GUIDE HAND POSITION: Guide hand should be on the side of the ball, 
   NOT under it. Fingers pointing up. Flag if guide hand thumb is 
   pointing toward basket (causes ball rotation issues).

5. LEG DRIVE & TIMING: Evaluate leg drive initiation timing relative 
   to arm extension. Power should flow from legs through core to 
   shooting arm in one fluid sequence. Flag if arms and legs work 
   independently (loss of power and consistency).

6. RELEASE POINT & ARC: Measure release point height (higher is 
   better — harder to block, better arc angle). Optimal arc angle 
   at the basket is 45-52 degrees. Note if ball is released too 
   early (flat trajectory) or too late.

7. WRIST SNAP & FOLLOW THROUGH: Evaluate wrist snap completion. 
   Index and middle fingers should be the last to leave the ball. 
   Follow through wrist should be fully flexed downward ("goose neck"). 
   Hold follow through until ball hits the rim — flag if player 
   drops hand early.

ROOT CAUSE PROTOCOL: Most shooting issues trace to elbow alignment 
or guide hand interference. Identify root cause first.`,

  pickleball: `
BIOMECHANICAL ANALYSIS PROTOCOL — PICKLEBALL:
Evaluate ALL checkpoints with precise measurements.

1. READY POSITION: Evaluate paddle height (waist height optimal, 
   not dangling at side), stance width (athletic, shoulder-width), 
   weight distribution (slightly forward on balls of feet), and 
   split step timing.

2. SERVE MECHANICS: Evaluate contact point (below waist per rules), 
   paddle angle at contact, and follow through direction. Note if 
   serve has adequate depth and spin.

3. DINKING — KITCHEN DISCIPLINE: This is the most important 
   fundamental. Evaluate: quiet wrist (no wrist break), contact 
   point (in front of body), paddle angle (slightly open face for 
   net clearance), and follow through direction. Flag any wrist 
   flick (causes unforced errors at kitchen).

4. VOLLEYS & RESETS: Evaluate grip pressure (should lighten for 
   resets — "soft hands"), contact point (in front of body), 
   and paddle face angle. Flag if player is reaching back (causes 
   popping up).

5. THIRD SHOT DROP: Evaluate arc height (should peak at 8-10 feet 
   and drop into the kitchen), contact point, and follow through. 
   Flag if player is hitting too hard (attackable) or too soft 
   (hits net).

6. DRIVES & OVERHEAD ATTACKS: Evaluate swing path, contact point 
   height, and follow through. Note if player is creating topspin 
   (optimal) or hitting flat (predictable).

7. FOOTWORK & TRANSITION ZONE: Evaluate movement from baseline to 
   kitchen line. Flag if player stops in no man's land, doesn't 
   split step, or approaches with poor balance.

8. DOUBLES POSITIONING: Evaluate court positioning relative to 
   partner. Flag stacking errors, poaching opportunities missed, 
   and communication issues visible in body language.

ROOT CAUSE PROTOCOL: Most pickleball errors trace to kitchen 
discipline (wrist control) or transition zone positioning. 
Identify root cause before listing compensations.`,
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

function repairJSON(raw: string): string {
  let cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')

  if (firstBrace === -1) throw new Error('No JSON object found in response')

  if (lastBrace === -1 || lastBrace < firstBrace) {
    cleaned = cleaned.substring(firstBrace)
    let openBraces = 0
    let openBrackets = 0
    let inString = false
    let escape = false

    for (const char of cleaned) {
      if (escape) {
        escape = false
        continue
      }
      if (char === '\\' && inString) {
        escape = true
        continue
      }
      if (char === '"') {
        inString = !inString
        continue
      }
      if (inString) continue
      if (char === '{') openBraces++
      if (char === '}') openBraces--
      if (char === '[') openBrackets++
      if (char === ']') openBrackets--
    }

    cleaned += ']'.repeat(Math.max(0, openBrackets))
    cleaned += '}'.repeat(Math.max(0, openBraces))
  } else {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1)
  }

  return cleaned
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

function validateAndEnhanceAnalysis(data: AnalysisResult, sport: string): AnalysisResult {
  if (!data.areas_to_improve || data.areas_to_improve.length < 2) {
    console.warn('AI returned fewer than 2 issues — this should not happen with new prompt', { sport })
  }

  if (data.strengths && data.strengths.length > 3) {
    data.strengths = data.strengths.slice(0, 3)
  }

  if (data.areas_to_improve) {
    data.areas_to_improve = data.areas_to_improve.map(issue => {
      if (typeof issue === 'string') {
        return {
          area: issue,
          severity: 'moderate',
          root_cause: 'primary',
        }
      }

      return {
        root_cause: 'primary',
        ...issue,
      }
    })
  }

  if (!data.confidence_note) {
    data.confidence_note = data.confidence === 'high'
      ? 'Clear footage with good angle — high confidence in all assessments.'
      : 'Some aspects of technique were not fully visible in this footage.'
  }

  return data
}

async function getFewShotExamples(
  sport: string,
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
): Promise<string> {
  const { data: goodExamples } = await supabase
    .from('analysis_feedback')
    .select('full_analysis, comment')
    .eq('sport', sport)
    .eq('rating', 'positive')
    .eq('feedback_type', 'analysis')
    .not('full_analysis', 'is', null)
    .order('created_at', { ascending: false })
    .limit(2)
  const { data: badExamples } = await supabase
    .from('analysis_feedback')
    .select('full_analysis, comment')
    .eq('sport', sport)
    .eq('rating', 'negative')
    .eq('feedback_type', 'analysis')
    .not('full_analysis', 'is', null)
    .order('created_at', { ascending: false })
    .limit(2)

  const examples = (goodExamples ?? []) as FeedbackExample[]
  const antiExamples = (badExamples ?? []) as FeedbackExample[]
  if (examples.length === 0 && antiExamples.length === 0) return ''

  const formattedExamples = examples
    .map((example, index) => `EXAMPLE ${index + 1} OF EXCELLENT ${sport.toUpperCase()} ANALYSIS:\n${JSON.stringify(example.full_analysis, null, 2)}`)
    .join('\n\n')
  const formattedAntiExamples = antiExamples
    .map((example, index) => `NEGATIVE FEEDBACK EXAMPLE ${index + 1} — AVOID THIS FAILURE MODE:\nUser complaint: ${example.comment || 'No comment provided'}\nAnalysis that received negative feedback:\n${JSON.stringify(example.full_analysis, null, 2)}`)
    .join('\n\n')

  return `\n================================================================
EXAMPLES OF EXCELLENT ANALYSES FOR REFERENCE
Use these as your quality bar. Match or exceed this level of specificity.
================================================================\n${formattedExamples}

================================================================
NEGATIVE FEEDBACK EXAMPLES
Avoid repeating these failure modes. Use the user complaints to make this analysis more specific, accurate, and useful.
================================================================\n${formattedAntiExamples}\n`
}

function buildPrompt({
  sport,
  playerName,
  shotType,
  cameraAngle,
  playerHistory,
  fewShotExamples,
  poseData,
  isComparison,
}: {
  sport: string
  playerName?: string
  shotType?: string
  cameraAngle?: string
  playerHistory?: string
  fewShotExamples?: string
  poseData?: PosePromptData | null
  isComparison: boolean
}) {
  const expert = SPORT_EXPERT[sport] || SPORT_EXPERT.tennis
  const checklist = SPORT_CHECKLISTS[sport] || SPORT_CHECKLISTS.tennis
  const history = playerHistory || ''

  return `${expert}

${poseData?.promptText ? poseData.promptText : ''}

${poseData?.measurements?.length ? `
IMPORTANT: The biomechanical measurements above are EXACT values extracted via pose estimation.
Reference these specific degree values in your analysis. For any joint outside the ideal range,
your drill prescription MUST target that specific deficit. Do not estimate - use the provided measurements.
Overall posture score from pose estimation: ${poseData.overallPostureScore ?? 'not available'}.
` : ''}

${fewShotExamples || ''}

================================================================
PLAYER CONTEXT
================================================================
Player: ${playerName || 'Unknown athlete'}
Sport: ${sport.toUpperCase()}
${shotType ? `Shot/Skill: ${shotType}` : ''}
${cameraAngle ? `Camera angle: ${cameraAngle}` : ''}
${history ? `Previous session notes:\n${history}` : ''}

================================================================
ANALYSIS PROTOCOL — FOLLOW THIS EXACT ORDER
================================================================

STEP 1 — OBSERVATION PASS (do this mentally first, before writing output):
Watch the complete footage from start to finish. Note every 
timestamp where a key biomechanical event occurs. Identify 
the athlete's skill level from their movement patterns.

STEP 2 — CHECKPOINT EVALUATION:
${checklist}

STEP 3 — ROOT CAUSE IDENTIFICATION:
Before writing your response, determine:
- Which issues are PRIMARY (root causes)?
- Which issues are SECONDARY (compensations for root causes)?
- What is the single most important thing this player can fix?
- If they fix that one thing, what else will likely self-correct?

STEP 4 — WRITE YOUR RESPONSE in the exact JSON format below.

================================================================
MANDATORY RULES — NON-NEGOTIABLE
================================================================
- areas_to_improve MUST have minimum 2 items — no athlete is perfect
- Maximum 3 strengths — only genuine, clearly visible strengths
- Every measurement must include a number: degrees, inches, 
  percentage, or timing reference (not "too high" but "15 degrees 
  above optimal")
- Every timestamp must be specific: "at 0:03" not "during the swing"
- JSON string values must stay valid JSON — escape internal quotes and line breaks
- Every issue must have a root_cause field: "primary" or "secondary"
- If secondary, add a caused_by field naming the primary issue
- Drills must be executable TODAY with no equipment unless specified
- simple_cue must be 5 words or fewer — something a player can 
  repeat to themselves between shots
- Do NOT invent ball flight, shot result, or outcome if not visible
- Do NOT give generic praise — only specific, evidence-based strengths
- If video quality is poor, lower confidence but still analyze 
  what IS visible

QUALITY BAR: Would a Tour-level coach be embarrassed to send 
this feedback to a serious student? If yes, rewrite it.

${isComparison
  ? `COMPARISON MODE: Analyze the FIRST video as the "before" and 
     the SECOND video as the "after". For each metric, state the 
     specific change: "Hip rotation improved from approximately 
     35 degrees to 48 degrees." Do not just say "improved" — 
     quantify every change you can observe.`
  : `Analyze the complete footage. Reference specific timestamps 
     for every observation. If multiple repetitions are visible, 
     note consistency across reps.`}

================================================================
RETURN THIS EXACT JSON — NO MARKDOWN, NO PREAMBLE
================================================================
{
  "observations": "Key timestamps only — 5-6 most important biomechanical events. Format: '0:00 — [event and significance]'. Focus on the moments that directly support your identified issues.",
  
  "technique_notes": "2-3 paragraph biomechanical analysis. Paragraph 1: Overall movement quality and skill level assessment. Paragraph 2: The primary fault and its downstream consequences — explain the kinetic chain reaction. Paragraph 3: What this player does well and how to build on it.",
  
  "strengths": [
    {
      "area": "checkpoint name matching the sport checklist",
      "what_i_see": "Specific description with timestamp and measurement — e.g. 'At 0:02, shoulder rotation reaches approximately 95 degrees — above the 90-degree threshold that separates recreational from competitive technique'",
      "why_it_helps": "Specific biomechanical benefit — not 'good for power' but 'this shoulder coil stores elastic energy that, when released sequentially, contributes an estimated 15-20% of total racket head speed at contact'"
    }
  ],
  
  "areas_to_improve": [
    {
      "area": "checkpoint name",
      "severity": "critical|moderate|minor",
      "root_cause": "primary|secondary",
      "caused_by": "name of primary issue if this is secondary — omit if primary",
      "what_i_see": "Specific observation with timestamp and measurement — e.g. 'At 0:03, your right elbow is approximately 18 degrees above your shoulder plane — optimal range is 5-8 degrees above'",
      "ideal": "Specific target with measurement — e.g. 'Elbow should be 5-8 degrees above shoulder plane at this point, keeping the swing on plane and maximizing power transfer'",
      "consequence": "Specific chain reaction — e.g. 'This elevated elbow forces the club over the top on the downswing, producing an out-to-in swing path that causes the pull-fade miss pattern most visible on 0:05'",
      "biomechanical_impact": "One sentence explaining the downstream consequence of this issue on performance — same kinetic-chain insight as consequence, written for athlete-facing cards",
      "drill": "Specific named drill",
      "drill_sets_reps": "e.g. 3 sets of 10 repetitions, daily",
      "drill_instruction": "3-4 steps maximum. 1) Setup. 2) Key action. 3) What correct feels like. 4) Success check.",
      "success_criteria": "Specific self-check — e.g. 'At the top of your backswing, your right elbow should touch or nearly touch your right hip pocket. If it does not, the drill is not working yet'",
      "simple_cue": "5 words max — e.g. 'Elbow in the slot'"
    }
  ],
  
  "overall_rating": "beginner|developing|intermediate|advanced|elite",
  
  "biggest_win": "The single most impactful change with specific expected improvement — e.g. 'Fixing the early hip extension will immediately improve your contact consistency and is estimated to add 15-20 yards to your drives once the new pattern is grooved'",
  
  "priority_focus": "Exactly what to practice this week — specific drill, specific feel, specific checkpoint to monitor — e.g. 'Every practice session this week: 20 minutes of shadow swings focusing exclusively on keeping your trail elbow below your lead elbow at the top. Film yourself from behind and compare to today's footage'",
  
  "confidence": "high|medium|low",
  
  "confidence_note": "If medium or low, explain why — e.g. 'Camera angle did not capture the impact zone clearly — front-on view would allow more precise contact point analysis'",
  
  "annotations": [
    {
      "label": "3-4 word label",
      "issue": "good|warning|error", 
      "severity": "critical|moderate|minor",
      "x": 0.5,
      "y": 0.3,
      "note": "Specific coaching cue with measurement — e.g. 'Elbow 18° above plane — should be 5-8°'"
    }
  ]
}`
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
    return NextResponse.json(
      {
        error:
          'Request body too large. Reload the page and try again — videos should upload by URL, not inline data.',
      },
      { status: 413 },
    )
  }
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
    compareVideoUrl,
    compareVideoMimeType = 'video/mp4',
    existingVideoId,
    frames,
    imageBase64,
    mediaType,
    compareFrames,
    compareImageBase64,
    compareMediaType,
    playerName,
    playerId,
    sport = 'tennis',
    shotType,
    playerHistory = '',
    cameraAngle,
    poseData,
    storagePath: storagePathInput,
    videoDurationSeconds,
    lessonId,
  } = body as {
    videoBase64?: string
    videoUrl?: string
    videoMimeType?: string
    compareVideoBase64?: string
    compareVideoUrl?: string
    compareVideoMimeType?: string
    existingVideoId?: string
    frames?: InlineFrame[]
    imageBase64?: string
    mediaType?: string
    compareFrames?: InlineFrame[]
    compareImageBase64?: string
    compareMediaType?: string
    playerName?: string
    playerId?: string
    sport?: string
    shotType?: string
    playerHistory?: string
    cameraAngle?: string
    poseData?: PosePromptData
    storagePath?: string
    videoDurationSeconds?: number
    lessonId?: string
    mode?: string
    localAnalysis?: Record<string, unknown>
    focusNote?: string
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('analyses_used, is_subscribed, role')
    .eq('id', user.id)
    .single()
  const isAdmin = Boolean(user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()))
  const isSubscribed = profile?.is_subscribed === true
  const isCoach = profile?.role === 'coach'
  const analysesUsed = profile?.analyses_used || 0
  const reelLimitDisabled = process.env.DISABLE_REEL_LIMIT === 'true'

  if (
    !reelLimitDisabled &&
    !isAdmin &&
    !isSubscribed &&
    !isCoach &&
    analysesUsed >= 3
  ) {
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

    if (compareVideoUrl) {
      const uploaded = await uploadUrlMedia(
        fileManager,
        compareVideoUrl,
        compareVideoMimeType,
        'comparison',
      )
      uploadedFiles.push(uploaded)
      parts.push({ fileData: { fileUri: uploaded.uri, mimeType: uploaded.mimeType } })
    } else if (compareVideoBase64) {
      const uploaded = await uploadBase64Media(fileManager, compareVideoBase64, compareVideoMimeType, 'comparison')
      uploadedFiles.push(uploaded)
      parts.push({ fileData: { fileUri: uploaded.uri, mimeType: uploaded.mimeType } })
    } else {
      parts.push(...inlineParts(compareFrames, compareImageBase64, compareMediaType))
    }

    if (parts.length === 0) {
      return NextResponse.json({ error: 'No video, image, or frame data provided' }, { status: 400 })
    }

    const fewShotExamples = await getFewShotExamples(normalizedSport, supabase)
    const prompt = buildPrompt({
      sport: normalizedSport,
      playerName,
      shotType,
      cameraAngle: normalizedCameraAngle,
      playerHistory,
      fewShotExamples,
      poseData,
      isComparison: Boolean(
        compareVideoUrl ||
          compareVideoBase64 ||
          compareFrames?.length ||
          compareImageBase64,
      ),
    })

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90000)
    let result: Awaited<ReturnType<typeof model.generateContent>>
    try {
      result = await Promise.race([
        model.generateContent([...parts, { text: prompt }]),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => reject(new Error('Gemini analysis timed out after 90 seconds')))
        }),
      ])
    } finally {
      clearTimeout(timeout)
    }
    const responseText = result.response.text()
    let rawData: AnalysisResult
    try {
      const cleaned = repairJSON(responseText)
      rawData = JSON.parse(cleaned) as AnalysisResult
    } catch (parseError: unknown) {
      console.error('Gemini returned malformed JSON; attempting repair', {
        error: parseError instanceof Error ? parseError.message : 'Unknown JSON parse error',
        preview: responseText.substring(0, 200),
      })

      try {
        const lastGoodBrace = responseText.lastIndexOf('},')
        if (lastGoodBrace > 0) {
          const truncated = `${responseText.substring(0, lastGoodBrace)}}]}`
          rawData = JSON.parse(repairJSON(truncated)) as AnalysisResult
        } else {
          throw new Error('Model returned invalid JSON that could not be repaired.')
        }
      } catch {
        return NextResponse.json(
          { error: 'Reel failed — the AI response was malformed. Please try again.' },
          { status: 500 }
        )
      }
    }
    const data = validateAndEnhanceAnalysis(rawData, normalizedSport)
    const overallScore = calculateScore(data)
    console.log('Score breakdown:', {
      sport,
      areas_count: data.areas_to_improve?.length || 0,
      strengths_count: data.strengths?.length || 0,
      rating: data.overall_rating,
      confidence: data.confidence,
      final_score: overallScore,
      issues: data.areas_to_improve?.map(issue => ({
        area: issueArea(issue),
        severity: issueSeverity(issue) || 'moderate',
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

    let insertedSession: { id: string } | null = null
    const shouldSave = data.confidence !== 'low' || overallScore > 15

    if (shouldSave) {
      let persistedStoragePath: string | null = null
      let videoId: string | null = null

      if (typeof existingVideoId === 'string' && existingVideoId.trim()) {
        videoId = existingVideoId.trim()
        if (typeof storagePathInput === 'string' && storagePathInput.trim()) {
          const raw = storagePathInput.trim().replace(/^\/+/, '')
          persistedStoragePath = raw.includes('/')
            ? raw
            : fullStoragePath('videos', raw)
        }
      } else if (typeof storagePathInput === 'string' && storagePathInput.trim()) {
        const raw = storagePathInput.trim().replace(/^\/+/, '')
        persistedStoragePath = raw.includes('/')
          ? raw
          : fullStoragePath('videos', raw)
        const { path: objectPath } = parseStoragePath(persistedStoragePath)

        if (playerId && objectPath) {
          const { data: videoRow } = await supabase
            .from('videos')
            .insert({
              player_id: playerId,
              storage_path: objectPath,
              title: `${normalizedSport || 'tennis'} reel · ${new Date().toLocaleDateString()}`,
            })
            .select('id')
            .single()
          if (videoRow?.id) videoId = videoRow.id
        }
      }

      const durationSeconds =
        typeof videoDurationSeconds === 'number' && Number.isFinite(videoDurationSeconds)
          ? Math.round(videoDurationSeconds)
          : null

      const { data: savedSession } = await supabase.from('analysis_sessions').insert({
        user_id: user.id,
        player_id: playerId || null,
        lesson_id: lessonId || null,
        sport: normalizedSport || 'tennis',
        source: 'video',
        published_to_player: isCoach ? false : true,
        coach_verified: false,
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
        storage_path: persistedStoragePath,
        video_duration_seconds: durationSeconds,
        video_id: videoId,
      }).select('id').single()
      insertedSession = savedSession
    } else {
      console.log('Skipping save - low confidence + low score')
    }
    if (!isCoach) {
      await supabase
        .from('profiles')
        .update({ analyses_used: analysesUsed + 1 })
        .eq('id', user.id)
    }

    if (playerId && process.env.SUPABASE_SERVICE_ROLE_KEY && insertedSession?.id) {
      try {
        const { syncCoachabilityForPlayer } = await import(
          '@/lib/journey-coachability-sync'
        )
        const admin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } },
        )
        void syncCoachabilityForPlayer(admin, playerId).catch(err => {
          console.error('[video-analysis] coachability sync failed:', err)
        })
      } catch (e) {
        console.error('[video-analysis] coachability sync import failed:', e)
      }
    }

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
      session_id: insertedSession?.id || null,
      sessionId: insertedSession?.id || null,
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