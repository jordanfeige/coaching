import {
  FilesetResolver,
  PoseLandmarker,
  DrawingUtils,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'

export { DrawingUtils }

export const LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
}

export const IDEAL_ANGLES: Record<string, Record<string, {
  min: number
  max: number
  label: string
}>> = {
  tennis: {
    elbow_contact: { min: 80, max: 110, label: 'Elbow at contact' },
    shoulder_rotation: { min: 85, max: 100, label: 'Shoulder turn' },
    hip_knee_bend: { min: 130, max: 160, label: 'Knee bend' },
    hip_shoulder_sep: { min: 40, max: 60, label: 'Hip-shoulder separation' },
  },
  golf: {
    elbow_backswing: { min: 85, max: 100, label: 'Lead arm at backswing' },
    hip_rotation: { min: 35, max: 55, label: 'Hip rotation' },
    knee_bend: { min: 140, max: 165, label: 'Knee flex at address' },
    shoulder_turn: { min: 85, max: 100, label: 'Shoulder turn' },
  },
  baseball: {
    elbow_launch: { min: 85, max: 100, label: 'Elbow at launch' },
    hip_rotation: { min: 40, max: 60, label: 'Hip rotation' },
    knee_stride: { min: 140, max: 165, label: 'Stride knee' },
  },
  basketball: {
    elbow_release: { min: 80, max: 100, label: 'Elbow at release' },
    knee_bend: { min: 120, max: 150, label: 'Knee bend pre-shot' },
    wrist_angle: { min: 70, max: 90, label: 'Wrist at release' },
  },
  pickleball: {
    elbow_dink: { min: 140, max: 165, label: 'Elbow at dink' },
    knee_ready: { min: 130, max: 155, label: 'Knee in ready position' },
    shoulder_reset: { min: 75, max: 95, label: 'Shoulder at reset' },
  },
}

export function calculateAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs((radians * 180) / Math.PI)
  if (angle > 180) angle = 360 - angle
  return Math.round(angle)
}

export interface JointMeasurement {
  joint: string
  label: string
  measured: number
  idealMin: number
  idealMax: number
  deficit: number
  status: 'good' | 'warning' | 'critical'
  side?: 'left' | 'right'
}

export interface PoseAnalysisResult {
  measurements: JointMeasurement[]
  landmarks: NormalizedLandmark[]
  keyFrameIndex: number
  overallPostureScore: number
}

function evaluateMeasurement(
  joint: string,
  label: string,
  measured: number,
  idealMin: number,
  idealMax: number,
  side?: 'left' | 'right',
): JointMeasurement {
  const deficit = measured < idealMin ? idealMin - measured : measured > idealMax ? measured - idealMax : 0
  const status = deficit === 0 ? 'good' : deficit <= 15 ? 'warning' : 'critical'

  return {
    joint,
    label,
    measured,
    idealMin,
    idealMax,
    deficit,
    status,
    side,
  }
}

export function extractMeasurements(landmarks: NormalizedLandmark[], sport: string): JointMeasurement[] {
  if (!landmarks || landmarks.length < 29) return []
  const lm = landmarks
  const measurements: JointMeasurement[] = []
  const ideals = IDEAL_ANGLES[sport] || IDEAL_ANGLES.tennis

  try {
    if (sport === 'tennis' || sport === 'pickleball') {
      const rightElbow = calculateAngle(lm[LANDMARKS.RIGHT_SHOULDER], lm[LANDMARKS.RIGHT_ELBOW], lm[LANDMARKS.RIGHT_WRIST])
      const leftElbow = calculateAngle(lm[LANDMARKS.LEFT_SHOULDER], lm[LANDMARKS.LEFT_ELBOW], lm[LANDMARKS.LEFT_WRIST])
      const dominantElbow = rightElbow < leftElbow ? rightElbow : leftElbow
      const dominantSide = rightElbow < leftElbow ? 'right' : 'left'
      const elbowIdeal = sport === 'tennis' ? ideals.elbow_contact : ideals.elbow_dink

      measurements.push(evaluateMeasurement('elbow', elbowIdeal.label, dominantElbow, elbowIdeal.min, elbowIdeal.max, dominantSide))

      const rightKnee = calculateAngle(lm[LANDMARKS.RIGHT_HIP], lm[LANDMARKS.RIGHT_KNEE], lm[LANDMARKS.RIGHT_ANKLE])
      const kneeIdeal = ideals.hip_knee_bend || ideals.knee_ready
      if (kneeIdeal) {
        measurements.push(evaluateMeasurement('knee', kneeIdeal.label, rightKnee, kneeIdeal.min, kneeIdeal.max, 'right'))
      }

      const leftHip = lm[LANDMARKS.LEFT_HIP]
      const rightHip = lm[LANDMARKS.RIGHT_HIP]
      const leftShoulder = lm[LANDMARKS.LEFT_SHOULDER]
      const rightShoulder = lm[LANDMARKS.RIGHT_SHOULDER]
      const hipAngle = (Math.atan2(rightHip.y - leftHip.y, rightHip.x - leftHip.x) * 180) / Math.PI
      const shoulderAngle = (Math.atan2(rightShoulder.y - leftShoulder.y, rightShoulder.x - leftShoulder.x) * 180) / Math.PI
      const separation = Math.abs(Math.round(Math.abs(hipAngle - shoulderAngle)))

      if (ideals.hip_shoulder_sep) {
        measurements.push(
          evaluateMeasurement(
            'hip_shoulder_sep',
            ideals.hip_shoulder_sep.label,
            separation,
            ideals.hip_shoulder_sep.min,
            ideals.hip_shoulder_sep.max,
          ),
        )
      }
    }

    if (sport === 'golf') {
      const leadElbow = calculateAngle(lm[LANDMARKS.LEFT_SHOULDER], lm[LANDMARKS.LEFT_ELBOW], lm[LANDMARKS.LEFT_WRIST])
      measurements.push(evaluateMeasurement('lead_elbow', ideals.elbow_backswing.label, leadElbow, ideals.elbow_backswing.min, ideals.elbow_backswing.max, 'left'))

      const kneeAngle = calculateAngle(lm[LANDMARKS.RIGHT_HIP], lm[LANDMARKS.RIGHT_KNEE], lm[LANDMARKS.RIGHT_ANKLE])
      measurements.push(evaluateMeasurement('knee', ideals.knee_bend.label, kneeAngle, ideals.knee_bend.min, ideals.knee_bend.max, 'right'))

      const shoulderTurn = Math.abs(
        Math.round(
          (Math.atan2(
            lm[LANDMARKS.RIGHT_SHOULDER].y - lm[LANDMARKS.LEFT_SHOULDER].y,
            lm[LANDMARKS.RIGHT_SHOULDER].x - lm[LANDMARKS.LEFT_SHOULDER].x,
          ) *
            180) /
            Math.PI,
        ),
      )
      measurements.push(evaluateMeasurement('shoulder_turn', ideals.shoulder_turn.label, shoulderTurn, ideals.shoulder_turn.min, ideals.shoulder_turn.max))
    }

    if (sport === 'baseball') {
      const throwingElbow = calculateAngle(lm[LANDMARKS.RIGHT_SHOULDER], lm[LANDMARKS.RIGHT_ELBOW], lm[LANDMARKS.RIGHT_WRIST])
      measurements.push(evaluateMeasurement('elbow', ideals.elbow_launch.label, throwingElbow, ideals.elbow_launch.min, ideals.elbow_launch.max, 'right'))

      const strideKnee = calculateAngle(lm[LANDMARKS.LEFT_HIP], lm[LANDMARKS.LEFT_KNEE], lm[LANDMARKS.LEFT_ANKLE])
      measurements.push(evaluateMeasurement('stride_knee', ideals.knee_stride.label, strideKnee, ideals.knee_stride.min, ideals.knee_stride.max, 'left'))
    }

    if (sport === 'basketball') {
      const shootingElbow = calculateAngle(lm[LANDMARKS.RIGHT_SHOULDER], lm[LANDMARKS.RIGHT_ELBOW], lm[LANDMARKS.RIGHT_WRIST])
      measurements.push(evaluateMeasurement('elbow', ideals.elbow_release.label, shootingElbow, ideals.elbow_release.min, ideals.elbow_release.max, 'right'))

      const kneeAngle = calculateAngle(lm[LANDMARKS.RIGHT_HIP], lm[LANDMARKS.RIGHT_KNEE], lm[LANDMARKS.RIGHT_ANKLE])
      measurements.push(evaluateMeasurement('knee', ideals.knee_bend.label, kneeAngle, ideals.knee_bend.min, ideals.knee_bend.max, 'right'))
    }
  } catch (error) {
    console.error('Measurement extraction error:', error)
  }

  return measurements
}

export function calculatePostureScore(measurements: JointMeasurement[]): number {
  if (measurements.length === 0) return 0
  const totalDeficit = measurements.reduce((sum, measurement) => sum + measurement.deficit, 0)
  const maxPossibleDeficit = measurements.length * 45
  return Math.max(0, Math.round(100 - (totalDeficit / maxPossibleDeficit) * 100))
}

let poseLandmarker: PoseLandmarker | null = null

export async function initPoseLandmarker(): Promise<PoseLandmarker> {
  if (poseLandmarker) return poseLandmarker

  const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm')

  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      delegate: 'GPU',
    },
    runningMode: 'IMAGE',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputSegmentationMasks: false,
  })

  return poseLandmarker
}

export async function analyzePoseFromVideo(
  videoElement: HTMLVideoElement,
  sport: string,
  targetTimeSeconds?: number,
): Promise<PoseAnalysisResult | null> {
  try {
    if (!videoElement.videoWidth || !videoElement.videoHeight) return null
    const landmarker = await initPoseLandmarker()
    const canvas = document.createElement('canvas')
    canvas.width = videoElement.videoWidth
    canvas.height = videoElement.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(videoElement, 0, 0)
    const results = landmarker.detect(canvas)

    if (!results.landmarks || results.landmarks.length === 0) {
      console.log('No pose detected in frame')
      return null
    }

    const landmarks = results.landmarks[0]
    const measurements = extractMeasurements(landmarks, sport)
    const overallPostureScore = calculatePostureScore(measurements)

    return {
      measurements,
      landmarks,
      keyFrameIndex: Math.round(targetTimeSeconds || 0),
      overallPostureScore,
    }
  } catch (error) {
    console.error('Pose analysis error:', error)
    return null
  }
}

export function drawSkeletonOverlay(
  canvas: HTMLCanvasElement,
  landmarks: NormalizedLandmark[],
  measurements: JointMeasurement[],
  videoWidth: number,
  videoHeight: number,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = videoWidth
  canvas.height = videoHeight
  ctx.clearRect(0, 0, videoWidth, videoHeight)

  const problemJoints = new Set(measurements.filter(measurement => measurement.status !== 'good').map(measurement => measurement.joint))
  const connections = [
    [11, 12],
    [11, 13],
    [13, 15],
    [12, 14],
    [14, 16],
    [11, 23],
    [12, 24],
    [23, 24],
    [23, 25],
    [25, 27],
    [24, 26],
    [26, 28],
    [15, 17],
    [15, 19],
    [16, 18],
    [16, 20],
  ] as const
  const jointToProblem: Record<number, boolean> = {
    [LANDMARKS.LEFT_ELBOW]: problemJoints.has('elbow') || problemJoints.has('lead_elbow'),
    [LANDMARKS.RIGHT_ELBOW]: problemJoints.has('elbow'),
    [LANDMARKS.LEFT_KNEE]: problemJoints.has('knee') || problemJoints.has('stride_knee'),
    [LANDMARKS.RIGHT_KNEE]: problemJoints.has('knee') || problemJoints.has('stride_knee'),
    [LANDMARKS.LEFT_HIP]: problemJoints.has('hip_shoulder_sep'),
    [LANDMARKS.RIGHT_HIP]: problemJoints.has('hip_shoulder_sep'),
  }

  connections.forEach(([a, b]) => {
    if (!landmarks[a] || !landmarks[b]) return
    const isProblem = jointToProblem[a] || jointToProblem[b]
    ctx.beginPath()
    ctx.moveTo(landmarks[a].x * videoWidth, landmarks[a].y * videoHeight)
    ctx.lineTo(landmarks[b].x * videoWidth, landmarks[b].y * videoHeight)
    ctx.strokeStyle = isProblem ? 'rgba(226, 75, 74, 0.85)' : 'rgba(255, 255, 255, 0.75)'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.stroke()
  })

  landmarks.forEach((landmark, index) => {
    if (landmark.visibility < 0.5) return
    const x = landmark.x * videoWidth
    const y = landmark.y * videoHeight
    const isProblem = jointToProblem[index]
    ctx.beginPath()
    ctx.arc(x, y, isProblem ? 7 : 5, 0, 2 * Math.PI)
    ctx.fillStyle = isProblem ? '#E24B4A' : 'rgba(29, 158, 117, 0.9)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x, y, isProblem ? 7 : 5, 0, 2 * Math.PI)
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  })

  measurements.forEach(measurement => {
    if (measurement.status === 'good') return
    const jointIndex =
      measurement.joint === 'elbow' || measurement.joint === 'lead_elbow'
        ? measurement.side === 'right'
          ? LANDMARKS.RIGHT_ELBOW
          : LANDMARKS.LEFT_ELBOW
        : measurement.joint.includes('knee')
          ? measurement.side === 'left'
            ? LANDMARKS.LEFT_KNEE
            : LANDMARKS.RIGHT_KNEE
          : measurement.joint.includes('shoulder')
            ? LANDMARKS.RIGHT_SHOULDER
            : LANDMARKS.RIGHT_HIP

    if (landmarks[jointIndex]?.visibility <= 0.5) return
    const labelX = landmarks[jointIndex].x * videoWidth + 12
    const labelY = landmarks[jointIndex].y * videoHeight - 8
    const text = `${measurement.measured} deg (ideal: ${measurement.idealMin}-${measurement.idealMax})`
    ctx.font = 'bold 11px Arial'
    const textWidth = ctx.measureText(text).width
    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.beginPath()
    ctx.roundRect(labelX - 4, labelY - 13, textWidth + 8, 18, 4)
    ctx.fill()
    ctx.fillStyle = measurement.status === 'critical' ? '#F09595' : '#FAC775'
    ctx.fillText(text, labelX, labelY)
  })
}

export function measurementsToPromptText(measurements: JointMeasurement[], sport: string): string {
  if (measurements.length === 0) return ''

  const lines = measurements.map(measurement => {
    const status =
      measurement.status === 'good'
        ? 'WITHIN IDEAL RANGE'
        : measurement.status === 'critical'
          ? 'CRITICAL - outside ideal range'
          : 'NEEDS WORK - approaching limit'

    return `- ${measurement.label}: measured ${measurement.measured} deg, ideal range ${measurement.idealMin}-${measurement.idealMax} deg, deficit ${measurement.deficit} deg (${status})`
  })

  return `
BIOMECHANICAL MEASUREMENTS (extracted via pose estimation):
Sport: ${sport}
${lines.join('\n')}

Use these exact measurements in your analysis. Reference specific degree values.
For any measurement outside the ideal range, prescribe a drill targeting that specific deficit.`
}
