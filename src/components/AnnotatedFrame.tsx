'use client'
import { useEffect, useRef, useState } from 'react'

type Annotation = {
  label: string
  issue: 'good' | 'warning' | 'error'
  x: number
  y: number
  note: string
}

type Props = {
  videoUrl: string
  annotations: Annotation[]
  className?: string
}

const COLORS = {
  good: { stroke: '#0d9488', fill: '#0d948840', text: '#0f7668' },
  warning: { stroke: '#d97706', fill: '#d9770630', text: '#b45309' },
  error: { stroke: '#dc2626', fill: '#dc262640', text: '#b91c1c' },
}

export default function AnnotatedFrame({ videoUrl, annotations, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!videoUrl || !annotations?.length) return

    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.src = videoUrl
    video.currentTime = 1.5

    video.onloadeddata = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 360

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Draw semi-transparent overlay
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw each annotation
      annotations.forEach(ann => {
        const x = ann.x * canvas.width
        const y = ann.y * canvas.height
        const colors = COLORS[ann.issue] || COLORS.warning

        // Draw dot
        ctx.beginPath()
        ctx.arc(x, y, 8, 0, Math.PI * 2)
        ctx.fillStyle = colors.fill
        ctx.fill()
        ctx.strokeStyle = colors.stroke
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw pulse ring
        ctx.beginPath()
        ctx.arc(x, y, 14, 0, Math.PI * 2)
        ctx.strokeStyle = colors.stroke
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.5
        ctx.stroke()
        ctx.globalAlpha = 1

        // Draw label box
        const label = ann.label
        ctx.font = 'bold 11px system-ui, sans-serif'
        const textWidth = ctx.measureText(label).width
        const boxPad = 6
        const boxWidth = textWidth + boxPad * 2
        const boxHeight = 20
        const boxX = Math.min(x + 18, canvas.width - boxWidth - 4)
        const boxY = y - boxHeight / 2

        ctx.fillStyle = 'rgba(0,0,0,0.75)'
        ctx.beginPath()
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4)
        ctx.fill()

        ctx.strokeStyle = colors.stroke
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4)
        ctx.stroke()

        ctx.fillStyle = colors.text
        ctx.fillText(label, boxX + boxPad, boxY + 13)

        // Draw line from dot to label
        ctx.beginPath()
        ctx.moveTo(x + 8, y)
        ctx.lineTo(boxX, y)
        ctx.strokeStyle = colors.stroke
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.5
        ctx.stroke()
        ctx.globalAlpha = 1
      })

      setLoaded(true)
    }

    video.onerror = () => setError(true)
    video.load()
  }, [videoUrl, annotations])

  if (error) return null

  return (
    <div className={`relative ${className || ''}`}>
      <canvas ref={canvasRef}
        className="w-full rounded-xl"
        style={{ display: loaded ? 'block' : 'none' }} />
      {!loaded && (
        <div className="flex aspect-video items-center justify-center rounded-xl bg-muted">
          <p className="text-xs text-muted-foreground">Rendering annotations...</p>
        </div>
      )}
    </div>
  )
}