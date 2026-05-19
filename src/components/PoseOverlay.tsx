'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  analyzePoseFromVideo,
  drawSkeletonOverlay,
  type JointMeasurement,
  type PoseAnalysisResult,
} from '@/lib/poseAnalysis'

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>
  sport: string
  onMeasurementsReady?: (result: PoseAnalysisResult) => void
  show: boolean
}

export default function PoseOverlay({
  videoRef,
  sport,
  onMeasurementsReady,
  show,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analyzingRef = useRef(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [measurements, setMeasurements] = useState<JointMeasurement[]>([])
  const [analyzed, setAnalyzed] = useState(false)
  const [error, setError] = useState('')

  const runAnalysis = useCallback(async () => {
    if (!videoRef.current || analyzingRef.current) return
    analyzingRef.current = true
    setAnalyzing(true)
    setError('')

    try {
      const video = videoRef.current
      const result = await analyzePoseFromVideo(video, sport, video.currentTime)

      if (result && canvasRef.current) {
        drawSkeletonOverlay(canvasRef.current, result.landmarks, result.measurements, video.videoWidth, video.videoHeight)
        setMeasurements(result.measurements)
        setAnalyzed(true)
        onMeasurementsReady?.(result)
      } else {
        setError('No person detected in frame. Try pausing at a clearer moment.')
      }
    } catch (caughtError) {
      setError('Pose analysis failed. Analysis will continue without measurements.')
      console.error(caughtError)
    } finally {
      analyzingRef.current = false
      setAnalyzing(false)
    }
  }, [onMeasurementsReady, sport, videoRef])

  useEffect(() => {
    if (!show || !videoRef.current) return
    const video = videoRef.current

    const timer = window.setTimeout(() => {
      if (video.readyState >= 2) void runAnalysis()
    }, 500)

    const handleLoaded = () => {
      window.clearTimeout(timer)
      window.setTimeout(() => void runAnalysis(), 500)
    }

    if (video.readyState < 2) video.addEventListener('loadeddata', handleLoaded)

    return () => {
      window.clearTimeout(timer)
      video.removeEventListener('loadeddata', handleLoaded)
    }
  }, [runAnalysis, show, videoRef])

  useEffect(() => {
    if (!show) {
      queueMicrotask(() => {
        setAnalyzed(false)
        setMeasurements([])
        setError('')
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      })
    }
  }, [show])

  if (!show) return null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      {!analyzed && !analyzing && (
        <button
          type="button"
          onClick={runAnalysis}
          style={{
            position: 'absolute',
            bottom: 48,
            right: 8,
            zIndex: 20,
            padding: '6px 12px',
            borderRadius: 8,
            background: 'hsl(168,62%,36%)',
            color: 'white',
            border: 'none',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Arial, sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            pointerEvents: 'auto',
          }}
        >
          Analyze pose
        </button>
      )}

      {analyzing && (
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            right: 8,
            zIndex: 20,
            padding: '6px 12px',
            borderRadius: 8,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            fontSize: 11,
            fontFamily: 'Arial, sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          Analyzing pose...
        </div>
      )}

      {analyzed && !analyzing && (
        <button
          type="button"
          onClick={runAnalysis}
          style={{
            position: 'absolute',
            bottom: 48,
            right: 8,
            zIndex: 20,
            padding: '5px 10px',
            borderRadius: 8,
            background: 'rgba(0,0,0,0.6)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            fontSize: 11,
            cursor: 'pointer',
            fontFamily: 'Arial, sans-serif',
            pointerEvents: 'auto',
          }}
        >
          Re-analyze
        </button>
      )}

      {error && (
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            left: 8,
            right: 8,
            zIndex: 20,
            padding: '6px 10px',
            borderRadius: 6,
            background: 'rgba(0,0,0,0.75)',
            color: '#FAC775',
            fontSize: 11,
            fontFamily: 'Arial, sans-serif',
          }}
        >
          {error}
        </div>
      )}

      {measurements.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 20,
            background: 'rgba(0,0,0,0.82)',
            borderRadius: 10,
            padding: '10px 12px',
            maxWidth: 220,
            backdropFilter: 'blur(8px)',
            border: '0.5px solid rgba(255,255,255,0.12)',
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              margin: '0 0 7px',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            Via measurements
          </p>
          {measurements.map((measurement, index) => (
            <div
              key={`${measurement.joint}-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 5,
                padding: '4px 6px',
                borderRadius: 6,
                background:
                  measurement.status === 'critical'
                    ? 'rgba(220,38,38,0.15)'
                    : measurement.status === 'warning'
                      ? 'rgba(217,119,6,0.15)'
                      : 'rgba(29,158,117,0.15)',
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background:
                    measurement.status === 'critical'
                      ? '#F09595'
                      : measurement.status === 'warning'
                        ? '#FAC775'
                        : '#5DCAA5',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.5)',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  {measurement.label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'white',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  {measurement.measured}°
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 400,
                      color:
                        measurement.status !== 'good'
                          ? measurement.status === 'critical'
                            ? '#F09595'
                            : '#FAC775'
                          : '#5DCAA5',
                      marginLeft: 4,
                    }}
                  >
                    {measurement.status !== 'good' ? `(${measurement.deficit}° off)` : '✓'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
