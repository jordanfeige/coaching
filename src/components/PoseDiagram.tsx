'use client'

import { useEffect, useRef } from 'react'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import type { JointMeasurement } from '@/lib/poseAnalysis'

interface Props {
  landmarks: NormalizedLandmark[]
  measurements: JointMeasurement[]
  width?: number
  height?: number
  sport: string
}

const CONNECTIONS = [
  [0, 11], [0, 12],
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27],
  [24, 26], [26, 28],
]

const JOINT_TO_LANDMARKS: Record<string, number[]> = {
  elbow: [13, 14],
  lead_elbow: [13],
  knee: [25, 26],
  stride_knee: [25],
  shoulder_turn: [11, 12],
  spine_angle: [11, 23],
  hip_shoulder_sep: [23, 24],
}

function getJointColor(
  landmarkIndex: number,
  measurements: JointMeasurement[],
): string {
  for (const m of measurements) {
    const indices = JOINT_TO_LANDMARKS[m.joint] || []
    if (indices.includes(landmarkIndex)) {
      if (m.status === 'critical') return '#E24B4A'
      if (m.status === 'warning') return '#D97706'
      return '#1D9E75'
    }
  }
  return '#1D9E75'
}

function getConnectionColor(
  a: number,
  b: number,
  measurements: JointMeasurement[],
): string {
  const colorA = getJointColor(a, measurements)
  const colorB = getJointColor(b, measurements)
  if (colorA === '#E24B4A' || colorB === '#E24B4A') return '#E24B4A'
  if (colorA === '#D97706' || colorB === '#D97706') return '#D97706'
  return 'rgba(60,60,60,0.5)'
}

export default function PoseDiagram({
  landmarks,
  measurements,
  width = 280,
  height = 380,
  sport,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !landmarks?.length) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = width
    canvas.height = height
    ctx.clearRect(0, 0, width, height)

    const visible = landmarks.filter(lm => (lm.visibility ?? 0) > 0.5)
    if (visible.length === 0) return

    const xs = visible.map(lm => lm.x)
    const ys = visible.map(lm => lm.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1

    const pad = 40
    const scaleX = (width - pad * 2) / rangeX
    const scaleY = (height - pad * 2) / rangeY
    const scale = Math.min(scaleX, scaleY)

    const figureW = rangeX * scale
    const figureH = rangeY * scale
    const offsetX = (width - figureW) / 2 - minX * scale
    const offsetY = (height - figureH) / 2 - minY * scale

    function toCanvas(lm: NormalizedLandmark): [number, number] {
      return [lm.x * scale + offsetX, lm.y * scale + offsetY]
    }

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = 'rgba(0,0,0,0.04)'
    ctx.lineWidth = 1
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    CONNECTIONS.forEach(([a, b]) => {
      const lmA = landmarks[a]
      const lmB = landmarks[b]
      if (!lmA || !lmB) return
      if ((lmA.visibility ?? 0) < 0.5 || (lmB.visibility ?? 0) < 0.5) return

      const [ax, ay] = toCanvas(lmA)
      const [bx, by] = toCanvas(lmB)
      const color = getConnectionColor(a, b, measurements)

      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.strokeStyle = color
      ctx.lineWidth = color === 'rgba(60,60,60,0.5)' ? 2.5 : 3.5
      ctx.lineCap = 'round'
      ctx.stroke()
    })

    landmarks.forEach((lm, i) => {
      if ((lm.visibility ?? 0) < 0.5) return
      const [x, y] = toCanvas(lm)
      const color = getJointColor(i, measurements)
      const isProblem = color !== '#1D9E75'

      if (isProblem) {
        ctx.beginPath()
        ctx.arc(x, y, 10, 0, 2 * Math.PI)
        ctx.fillStyle = color === '#E24B4A'
          ? 'rgba(226,75,74,0.15)'
          : 'rgba(217,119,6,0.15)'
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(x, y, isProblem ? 7 : 5, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.fill()

      ctx.beginPath()
      ctx.arc(x, y, isProblem ? 7 : 5, 0, 2 * Math.PI)
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 2
      ctx.stroke()
    })

    measurements.forEach(m => {
      if (m.status === 'good') return

      const primaryIndex = m.side === 'left'
        ? (m.joint.includes('knee')
          ? 25
          : m.joint.includes('elbow') || m.joint.includes('lead')
            ? 13
            : 23)
        : (m.joint.includes('knee')
          ? 26
          : m.joint.includes('elbow')
            ? 14
            : 24)

      const lm = landmarks[primaryIndex]
      if (!lm || (lm.visibility ?? 0) < 0.5) return

      const [jx, jy] = toCanvas(lm)
      const color = m.status === 'critical' ? '#E24B4A' : '#D97706'
      const bgColor = m.status === 'critical' ? '#FEF2F2' : '#FFFBEB'
      const borderColor = m.status === 'critical' ? '#FCA5A5' : '#FCD34D'

      const goLeft = jx > width / 2
      const calloutX = goLeft ? jx - 70 : jx + 16
      const calloutY = jy - 22

      ctx.beginPath()
      ctx.moveTo(jx, jy)
      ctx.lineTo(goLeft ? calloutX + 60 : calloutX, calloutY + 10)
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 3])
      ctx.stroke()
      ctx.setLineDash([])

      const boxW = 62
      const boxH = 32
      ctx.fillStyle = bgColor
      ctx.strokeStyle = borderColor
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(calloutX, calloutY, boxW, boxH, 5)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = color
      ctx.font = 'bold 12px Arial'
      ctx.fillText(`${m.measured}°`, calloutX + 6, calloutY + 13)
      ctx.font = '10px Arial'
      ctx.fillText(`${m.idealMin}-${m.idealMax}°`, calloutX + 6, calloutY + 26)
    })

    ctx.font = 'bold 11px Arial'
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.textAlign = 'center'
    ctx.fillText(`${sport.toUpperCase()} · POSE DIAGRAM`, width / 2, height - 10)
    ctx.textAlign = 'left'
  }, [landmarks, measurements, width, height, sport])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 10,
        display: 'block',
      }}
    />
  )
}
