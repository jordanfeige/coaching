import type { ExtractedVideoFrame } from '@/lib/video-frames'

type Landmark = {
  x: number
  y: number
  visibility?: number
}

type PoseResult = {
  landmarks?: Landmark[][]
}

let poseLandmarkerPromise: Promise<{
  detect: (image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement) => PoseResult
}> | null = null

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'

async function getPoseLandmarker() {
  if (!poseLandmarkerPromise) {
    poseLandmarkerPromise = import('@mediapipe/tasks-vision').then(async ({ FilesetResolver, PoseLandmarker }) => {
      const vision = await FilesetResolver.forVisionTasks(WASM_URL)
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        numPoses: 1,
      })
    })
  }
  return poseLandmarkerPromise
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load frame for pose analysis.'))
    img.src = src
  })
}

function dist(a?: Landmark, b?: Landmark) {
  if (!a || !b) return 0
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function angle(a?: Landmark, b?: Landmark, c?: Landmark) {
  if (!a || !b || !c) return null
  const ab = { x: a.x - b.x, y: a.y - b.y }
  const cb = { x: c.x - b.x, y: c.y - b.y }
  const dot = ab.x * cb.x + ab.y * cb.y
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y)
  if (!mag) return null
  return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * (180 / Math.PI)
}

function visible(l?: Landmark) {
  return !!l && (l.visibility ?? 1) > 0.45
}

function avg(nums: number[]) {
  return nums.length ? nums.reduce((sum, n) => sum + n, 0) / nums.length : 0
}

function pct(n: number) {
  return Math.round(n * 100)
}

function issue({
  area,
  severity,
  what,
  ideal,
  why,
  fix,
  drill,
  drill_instruction,
  drill_media_ref,
}: {
  area: string
  severity: 'critical' | 'moderate' | 'minor'
  what: string
  ideal: string
  why: string
  fix: string
  drill: string
  drill_instruction: string
  drill_media_ref: string
}) {
  return {
    area,
    severity,
    description: `What I see: ${what}\n\nWhat should happen: ${ideal}\n\nWhy it matters: ${why}\n\nHow to fix it: ${fix}`,
    drill,
    drill_instruction,
    drill_media_ref,
  }
}

export async function analyzePoseFrames({
  frames,
  playerName,
  sport,
  focusNote,
}: {
  frames: ExtractedVideoFrame[]
  playerName?: string | null
  sport?: string | null
  focusNote?: string
}) {
  const poseLandmarker = await getPoseLandmarker()
  const frameAnalyses = []

  for (const frame of frames) {
    const image = await loadImage(frame.dataUrl)
    const result = poseLandmarker.detect(image)
    const landmarks = result.landmarks?.[0] ?? []
    const leftShoulder = landmarks[11]
    const rightShoulder = landmarks[12]
    const leftHip = landmarks[23]
    const rightHip = landmarks[24]
    const leftKnee = landmarks[25]
    const rightKnee = landmarks[26]
    const leftAnkle = landmarks[27]
    const rightAnkle = landmarks[28]

    const visibleCount = landmarks.filter(visible).length
    const shoulderWidth = dist(leftShoulder, rightShoulder)
    const stanceWidth = dist(leftAnkle, rightAnkle)
    const stanceRatio = shoulderWidth > 0 ? stanceWidth / shoulderWidth : 0
    const kneeAngles = [
      angle(leftHip, leftKnee, leftAnkle),
      angle(rightHip, rightKnee, rightAnkle),
    ].filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
    const kneeBend = avg(kneeAngles)
    const shoulderTilt = visible(leftShoulder) && visible(rightShoulder) ? Math.abs(leftShoulder.y - rightShoulder.y) : 0
    const hipTilt = visible(leftHip) && visible(rightHip) ? Math.abs(leftHip.y - rightHip.y) : 0

    frameAnalyses.push({
      frame,
      landmarks,
      visibleCount,
      stanceRatio,
      kneeBend,
      shoulderTilt,
      hipTilt,
      points: { leftShoulder, rightShoulder, leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle },
    })
  }

  const detectedFrames = frameAnalyses.filter(f => f.visibleCount >= 10)
  const sortedByVisibility = [...detectedFrames].sort((a, b) => b.visibleCount - a.visibleCount)
  const best = sortedByVisibility[0] ?? frameAnalyses[0]
  const avgStance = avg(detectedFrames.map(f => f.stanceRatio).filter(Boolean))
  const avgKneeBend = avg(detectedFrames.map(f => f.kneeBend).filter(Boolean))
  const avgShoulderTilt = avg(detectedFrames.map(f => f.shoulderTilt).filter(Boolean))
  const avgHipTilt = avg(detectedFrames.map(f => f.hipTilt).filter(Boolean))
  const narrowest = [...detectedFrames].filter(f => f.stanceRatio > 0).sort((a, b) => a.stanceRatio - b.stanceRatio)[0]
  const tallest = [...detectedFrames].filter(f => f.kneeBend > 0).sort((a, b) => b.kneeBend - a.kneeBend)[0]
  const mostTilted = [...detectedFrames].sort((a, b) => (b.shoulderTilt + b.hipTilt) - (a.shoulderTilt + a.hipTilt))[0]

  const areas = []
  if (!detectedFrames.length) {
    areas.push(issue({
      area: 'Camera angle',
      severity: 'moderate',
      what: 'The athlete body was not detected clearly enough across the sampled frames.',
      ideal: 'The full body should stay visible from feet through shoulders for the entire stroke or movement.',
      why: 'Pose detection needs hips, knees, ankles, and shoulders to measure balance, base width, and posture reliably.',
      fix: 'Record from a side or 45-degree angle, step farther back, keep the athlete centered, and avoid cutting off the feet.',
      drill: 'Full-body setup check',
      drill_instruction: 'Record 5 seconds with feet, hips, shoulders, and racket/paddle visible before starting the movement.',
      drill_media_ref: 'setup-camera-angle',
    }))
  } else {
    if (avgStance > 0 && avgStance < 1.15) {
      areas.push(issue({
        area: 'Base width',
        severity: 'moderate',
        what: `Across the sampled clip, the stance averaged about ${avgStance.toFixed(1)}x shoulder width, which is on the narrow side for an athletic ready position.`,
        ideal: 'The feet should usually be a little wider than the shoulders, with the athlete able to push in either direction without first resetting the feet.',
        why: 'A narrow base makes the body taller and less stable. In tennis and pickleball, that often leads to late reactions, reaching, and weaker recovery after contact.',
        fix: 'Cue the athlete to land the split step with feet just outside shoulder width, knees soft, and weight on the balls of the feet before the swing starts.',
        drill: 'Split-step base holds',
        drill_instruction: 'Start in ready position, call “split,” land wider than shoulder width, hold for 3 seconds, then recover. Do 8 reps before hitting balls.',
        drill_media_ref: 'athletic-base',
      }))
    }
    if (avgKneeBend > 162) {
      areas.push(issue({
        area: 'Athletic posture',
        severity: 'moderate',
        what: `The average knee angle was about ${Math.round(avgKneeBend)} degrees, which suggests the athlete is staying fairly upright through the movement.`,
        ideal: 'The knees should stay softly flexed with the hips slightly loaded, so the athlete can drive from the ground instead of standing tall and reaching.',
        why: 'When the legs are too straight, the athlete loses ground force, balance, and quick adjustment steps. The upper body often compensates by leaning or arming the shot.',
        fix: 'Have the athlete lower the hips slightly before the ball arrives and keep that height through contact, then recover back to the same athletic posture.',
        drill: 'Ready-position bounce',
        drill_instruction: 'Bounce lightly in ready position for 20 seconds while keeping hips low, chest quiet, and heels barely off the ground.',
        drill_media_ref: 'ready-position',
      }))
    }
    if (avgShoulderTilt > 0.08 || avgHipTilt > 0.08) {
      areas.push(issue({
        area: 'Postural balance',
        severity: 'minor',
        what: `The shoulders or hips drifted off-level in several sampled frames, with shoulder tilt around ${pct(avgShoulderTilt)}% and hip tilt around ${pct(avgHipTilt)}%.`,
        ideal: 'The torso should stay stacked over the hips with the head quiet, so rotation happens around a stable center instead of through a side bend.',
        why: 'Excess tilt can pull the contact point off line and make timing inconsistent, especially when the athlete is moving or under pressure.',
        fix: 'Use a “head over belly button” cue and ask the athlete to finish balanced enough to hold the position for one second.',
        drill: 'Mirror balance reps',
        drill_instruction: 'Pause at setup and contact, checking that shoulders and hips stay stacked over the base.',
        drill_media_ref: 'balance-check',
      }))
    }
  }

  if (!areas.length) {
    areas.push(issue({
      area: 'Next progression',
      severity: 'minor',
      what: 'The measured posture looks reasonably balanced in the sampled frames.',
      ideal: 'The next step is to pair that balanced base with a repeatable contact point and clean recovery after the stroke.',
      why: 'Good posture is the platform. The athlete still needs to repeat timing, spacing, and recovery under movement.',
      fix: 'Use freeze-at-contact reps and compare whether the same balance shows up at the start, contact, and finish of the motion.',
      drill: 'Contact freeze',
      drill_instruction: 'Freeze at contact for one second after each rep to check balance and spacing.',
      drill_media_ref: 'contact-freeze',
    }))
  }

  const athlete = playerName?.trim() || 'the athlete'
  const sportName = sport === 'pickleball' ? 'pickleball' : 'tennis'
  const confidence = detectedFrames.length >= 2 ? 'high' : detectedFrames.length === 1 ? 'medium' : 'low'
  const keyCandidates = [best, narrowest, tallest, mostTilted]
    .filter(Boolean)
    .filter((frame, index, arr) => arr.findIndex(f => f?.frame.index === frame?.frame.index) === index)
    .slice(0, 4)
  const annotations = keyCandidates.flatMap(frame => {
    if (!frame) return []
    return [
      { frame_index: frame.frame.index, label: 'Shoulders', issue: frame.shoulderTilt > 0.08 ? 'warning' : 'good', severity: 'minor', x: (frame.points.leftShoulder?.x ?? 0.5), y: (frame.points.leftShoulder?.y ?? 0.25), note: frame.shoulderTilt > 0.08 ? 'Shoulders are tilted; look for a quieter upper body.' : 'Shoulders are a useful alignment reference here.' },
      { frame_index: frame.frame.index, label: 'Hips', issue: frame.hipTilt > 0.08 ? 'warning' : 'good', severity: 'minor', x: (frame.points.leftHip?.x ?? 0.5), y: (frame.points.leftHip?.y ?? 0.55), note: frame.hipTilt > 0.08 ? 'Hips are drifting off level; check balance.' : 'Hips look reasonably centered.' },
      { frame_index: frame.frame.index, label: 'Base', issue: frame.stanceRatio && frame.stanceRatio < 1.15 ? 'warning' : 'good', severity: 'moderate', x: (frame.points.leftAnkle?.x ?? 0.5), y: (frame.points.leftAnkle?.y ?? 0.9), note: `Stance is about ${frame.stanceRatio ? frame.stanceRatio.toFixed(1) : 'unknown'}x shoulder width.` },
    ] as const
  })

  return {
    session_headline: `Fast posture check for ${athlete}`,
    overview_bullets: [
      detectedFrames.length ? `Sampled ${frames.length} frames across the clip and detected pose landmarks in ${detectedFrames.length}.` : 'Pose detection needs clearer full-body footage.',
      avgKneeBend ? `Estimated knee angle: ${Math.round(avgKneeBend)} degrees.` : 'Knee bend could not be measured reliably.',
      `Priority focus: ${areas[0]?.area || 'full-body posture'}.`,
    ],
    observations: detectedFrames.length
      ? `Local pose detection sampled the full ${sportName} clip instead of analyzing one moment. Across ${detectedFrames.length} detected frame${detectedFrames.length === 1 ? '' : 's'}, stance width was about ${avgStance ? avgStance.toFixed(1) : 'unknown'}x shoulder width, average knee angle was ${avgKneeBend ? Math.round(avgKneeBend) : 'unknown'} degrees, shoulder tilt was ${pct(avgShoulderTilt)}%, and hip tilt was ${pct(avgHipTilt)}%. Use the key frames as checkpoints: setup/ready shape, the most upright moment, the narrowest base, and the most tilted posture when available.`
      : 'No reliable full-body pose was detected. Try recording with the full athlete visible and good lighting.',
    technique_notes:
      `${focusNote?.trim() ? `Coach-selected focus: ${focusNote.trim()}\n\n` : ''}This analysis is based only on the frames selected for review. It is strongest for posture, balance, stance width, knee flex, and body alignment. It does not yet understand racket face, ball flight, contact quality, or tactical decision-making, so those should still be reviewed by the coach.`,
    strengths: detectedFrames.length
      ? [{
          area: 'Body position is visible',
          description: 'The selected frames show enough of the athlete to review posture, balance, stance width, and knee bend. That gives the player a clear starting point for improvement.',
        }]
      : [],
    areas_to_improve: areas,
    recommended_drills: areas.slice(0, 2).map(area => ({
      title: area.drill,
      focus: area.area,
      description: area.drill_instruction,
      media_ref: area.drill_media_ref,
    })),
    overall_rating: detectedFrames.length ? 'developing' : 'beginner',
    coach_tip:
      detectedFrames.length
        ? 'Use the annotated frame to check posture first, then compare it with live coaching observations.'
        : 'Re-record with the full body in frame before relying on the analysis.',
    priority_focus: areas[0]?.area || 'Athletic posture',
    confidence,
    key_frames: keyCandidates.map(frame => ({
      frame_index: frame!.frame.index,
      timestamp_label: `${frame!.frame.timestamp.toFixed(1)}s`,
      reason:
        frame === narrowest
          ? 'Narrowest detected base'
          : frame === tallest
            ? 'Most upright detected posture'
            : frame === mostTilted
              ? 'Most visible shoulder/hip tilt'
              : 'Best detected body landmarks',
    })),
    annotations,
    analysis_method: 'browser_pose_detection',
    selected_frame_indices: frames.map(frame => frame.index),
    coach_selected_focus: focusNote?.trim() || null,
  }
}
