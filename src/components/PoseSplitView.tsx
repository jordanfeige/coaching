'use client'

import { useState, useRef, useEffect, useCallback, useMemo, type RefObject } from 'react'
import {
  analyzePoseFromVideo,
  type JointMeasurement,
  type PoseAnalysisResult,
} from '@/lib/poseAnalysis'

const TEAL = 'hsl(168,62%,36%)'
const TEAL_LIGHT = 'hsl(168,62%,95%)'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const WARM_BG = 'hsl(40,20%,97%)'

const SPORT_FRAMES: Record<string, { label: string; pct: number }[]> = {
  golf: [
    { label: 'Address', pct: 0.15 },
    { label: 'Takeaway', pct: 0.3 },
    { label: 'Backswing', pct: 0.45 },
    { label: 'Top', pct: 0.55 },
    { label: 'Impact', pct: 0.7 },
    { label: 'Follow', pct: 0.88 },
  ],
  tennis: [
    { label: 'Ready', pct: 0.1 },
    { label: 'Unit turn', pct: 0.3 },
    { label: 'Backswing', pct: 0.45 },
    { label: 'Contact', pct: 0.65 },
    { label: 'Follow', pct: 0.85 },
  ],
  baseball: [
    { label: 'Stance', pct: 0.1 },
    { label: 'Load', pct: 0.3 },
    { label: 'Stride', pct: 0.5 },
    { label: 'Contact', pct: 0.65 },
    { label: 'Follow', pct: 0.85 },
  ],
  basketball: [
    { label: 'Catch', pct: 0.1 },
    { label: 'Dip', pct: 0.3 },
    { label: 'Set', pct: 0.5 },
    { label: 'Release', pct: 0.7 },
    { label: 'Follow', pct: 0.88 },
  ],
  pickleball: [
    { label: 'Ready', pct: 0.1 },
    { label: 'Prepare', pct: 0.3 },
    { label: 'Contact', pct: 0.6 },
    { label: 'Follow', pct: 0.85 },
  ],
}

const STATUS_COLORS = {
  critical: {
    bg: '#FEF2F2',
    border: '#FCA5A5',
    text: '#A32D2D',
    badge: '#E24B4A',
    zone: 'rgba(226,75,74,0.2)',
  },
  warning: {
    bg: '#FFFBEB',
    border: '#FCD34D',
    text: '#854F0B',
    badge: '#D97706',
    zone: 'rgba(217,119,6,0.2)',
  },
  good: {
    bg: '#F0FDF4',
    border: '#86EFAC',
    text: '#166534',
    badge: '#1D9E75',
    zone: 'rgba(29,158,117,0.25)',
  },
}

function getBarLayout(measured: number, idealMin: number, idealMax: number) {
  const span = Math.max(idealMax - idealMin, 8)
  const padding = Math.max(span * 0.5, 12)
  const barMin = idealMin - padding
  const barMax = idealMax + padding
  const range = barMax - barMin || 1
  return {
    measuredPct: Math.min(100, Math.max(0, ((measured - barMin) / range) * 100)),
    idealStartPct: ((idealMin - barMin) / range) * 100,
    idealWidthPct: ((idealMax - idealMin) / range) * 100,
  }
}

function explainMeasurement(m: JointMeasurement): string {
  if (m.status === 'good') {
    return `${m.label} is in the ideal zone — this supports consistent, repeatable mechanics.`
  }
  if (m.measured < m.idealMin) {
    return `${m.label} is ${m.deficit}° below ideal — add a bit more bend or rotation to unlock better positions.`
  }
  return `${m.label} is ${m.deficit}° above ideal — you're likely over-extending or holding too much tension here.`
}

function buildViaInsight(
  measurements: JointMeasurement[],
  sport: string,
): string {
  const issues = measurements.filter(m => m.status !== 'good')
  const critical = issues.filter(m => m.status === 'critical')
  const good = measurements.filter(m => m.status === 'good')

  if (issues.length === 0) {
    return `At this frame, your ${sport} setup looks balanced across the joints we measured. The numbers line up with what coaches want to see — keep rehearsing this position so it becomes automatic under speed.`
  }

  const primary = critical[0] || issues[0]
  const secondary = issues.find(m => m.joint !== primary.joint)

  let text = `Your biggest limiter at this moment is ${primary.label.toLowerCase()} (${primary.measured}° vs ${primary.idealMin}–${primary.idealMax}° ideal). Fixing that first will have the largest impact on how the rest of your chain moves.`

  if (secondary) {
    text += ` ${secondary.label} is also off — address ${primary.label.toLowerCase()}, then check ${secondary.label.toLowerCase()} on the next rep.`
  } else if (good.length > 0) {
    text += ` ${good[0].label} is already solid, so you have a foundation to build on once you clean up the main issue.`
  }

  if (critical.length >= 2) {
    text += ` With multiple joints out of range, slow the motion down and film again after one focused adjustment.`
  }

  return text
}

function MeasurementCard({ m }: { m: JointMeasurement }) {
  const colors = STATUS_COLORS[m.status]
  const bar = getBarLayout(m.measured, m.idealMin, m.idealMax)

  return (
    <div
      style={{
        background: colors.bg,
        border: `0.5px solid ${colors.border}`,
        borderRadius: 12,
        padding: '14px 14px 12px',
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: TEXT,
          marginBottom: 6,
          letterSpacing: '-0.2px',
        }}
      >
        {m.label}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: colors.badge,
            lineHeight: 1,
            letterSpacing: '-1px',
          }}
        >
          {m.measured}°
        </span>
        <span style={{ fontSize: 12, color: colors.text, fontWeight: 600 }}>
          ideal {m.idealMin}–{m.idealMax}°
        </span>
        {m.deficit > 0 && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: colors.badge,
              marginLeft: 'auto',
            }}
          >
            {m.deficit}° off
          </span>
        )}
      </div>

      <div
        style={{
          position: 'relative',
          height: 8,
          background: 'rgba(0,0,0,0.06)',
          borderRadius: 4,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${bar.idealStartPct}%`,
            width: `${bar.idealWidthPct}%`,
            background: colors.zone,
            borderRadius: 4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: -3,
            left: `${bar.measuredPct}%`,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: colors.badge,
            border: '2px solid white',
            transform: 'translateX(-50%)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }}
        />
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 12,
          lineHeight: 1.5,
          color: colors.text,
        }}
      >
        {explainMeasurement(m)}
      </p>
    </div>
  )
}

interface Props {
  videoURL: string
  sport: string
  onMeasurementsReady?: (result: PoseAnalysisResult) => void
  videoRef?: RefObject<HTMLVideoElement | null>
}

export default function PoseSplitView({
  videoURL,
  sport,
  onMeasurementsReady,
  videoRef: externalVideoRef,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const analyzingRef = useRef(false)
  const [poseResult, setPoseResult] = useState<PoseAnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)
  const [error, setError] = useState('')
  const [activeFrame, setActiveFrame] = useState<number | null>(null)

  const setVideoRefs = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node
    if (externalVideoRef) externalVideoRef.current = node
  }, [externalVideoRef])

  const runAnalysis = useCallback(async (timeSeconds?: number) => {
    if (!videoRef.current || analyzingRef.current) return
    analyzingRef.current = true
    setAnalyzing(true)
    setError('')

    try {
      const duration = videoRef.current.duration
      const target = timeSeconds ?? (Number.isFinite(duration) ? duration * 0.15 : 0)
      const result = await analyzePoseFromVideo(videoRef.current, sport, target)
      if (result) {
        setPoseResult(result)
        setAnalyzed(true)
        onMeasurementsReady?.(result)
      } else {
        setError(
          'No pose detected. Try pausing at a moment where your full body is visible.',
        )
      }
    } catch (e) {
      setError('Pose analysis failed.')
      console.error(e)
    } finally {
      analyzingRef.current = false
      setAnalyzing(false)
    }
  }, [sport, onMeasurementsReady])

  useEffect(() => {
    if (!videoURL) return
    const video = videoRef.current
    if (!video) return

    const onLoaded = () => {
      setTimeout(() => void runAnalysis(), 600)
    }

    if (video.readyState >= 2) {
      setTimeout(() => void runAnalysis(), 600)
    } else {
      video.addEventListener('loadeddata', onLoaded)
      return () => video.removeEventListener('loadeddata', onLoaded)
    }
  }, [videoURL, runAnalysis])

  function seekTo(seconds: number) {
    if (!videoRef.current) return
    videoRef.current.currentTime = seconds
    videoRef.current.pause()
    setActiveFrame(seconds)
    setTimeout(() => void runAnalysis(seconds), 200)
  }

  const frames = SPORT_FRAMES[sport] || SPORT_FRAMES.golf

  const viaInsight = useMemo(() => {
    if (!poseResult?.measurements?.length) return ''
    return buildViaInsight(poseResult.measurements, sport)
  }, [poseResult, sport])

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 12,
        }}
      >
        {/* Left: video */}
        <div
          style={{
            background: 'black',
            borderRadius: 12,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <video
            ref={setVideoRefs}
            src={videoURL}
            crossOrigin="anonymous"
            controls
            playsInline
            style={{
              width: '100%',
              display: 'block',
              maxHeight: 320,
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => {
                const t = videoRef.current?.currentTime || 0
                seekTo(t)
              }}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                background: 'rgba(0,0,0,0.7)',
                border: '0.5px solid rgba(255,255,255,0.2)',
                color: 'white',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {analyzing ? (
                <>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      border: '1.5px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'poseSpin 0.8s linear infinite',
                    }}
                  />
                  Analyzing...
                </>
              ) : (
                <>Analyze frame</>
              )}
            </button>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 40,
              left: 8,
              background: 'rgba(0,0,0,0.6)',
              borderRadius: 4,
              padding: '2px 7px',
              fontSize: 10,
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            Your video
          </div>
        </div>

        {/* Right: measurements */}
        <div
          style={{
            background: 'white',
            borderRadius: 12,
            border: `0.5px solid ${BORDER}`,
            overflow: 'hidden',
            position: 'relative',
            minHeight: 320,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              borderBottom: `0.5px solid ${BORDER}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: TEAL,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Via · Measurements
            </div>
            {analyzed && (
              <div
                style={{
                  fontSize: 10,
                  color: TEXT_SEC,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: '#1D9E75',
                  }}
                />
                Live from your video
              </div>
            )}
          </div>

          <div
            style={{
              flex: 1,
              padding: 10,
              overflowY: 'auto',
              maxHeight: 420,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {analyzing && !poseResult && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  minHeight: 240,
                  gap: 10,
                  color: TEXT_SEC,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    border: `2px solid ${BORDER}`,
                    borderTopColor: TEAL,
                    borderRadius: '50%',
                    animation: 'poseSpin 0.8s linear infinite',
                  }}
                />
                <span style={{ fontSize: 12 }}>Measuring your joints...</span>
              </div>
            )}

            {!analyzing && !poseResult && !error && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  minHeight: 240,
                  gap: 8,
                  color: TEXT_SEC,
                }}
              >
                <span style={{ fontSize: 24 }}>📐</span>
                <span style={{ fontSize: 12 }}>Joint measurements will appear here</span>
              </div>
            )}

            {error && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  minHeight: 240,
                  gap: 8,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: 12, color: '#D97706' }}>{error}</span>
                <button
                  type="button"
                  onClick={() => void runAnalysis()}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: `1px solid ${BORDER}`,
                    background: 'white',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  Try again
                </button>
              </div>
            )}

            {poseResult?.measurements.map((m, i) => (
              <MeasurementCard key={`${m.joint}-${i}`} m={m} />
            ))}

            {poseResult && poseResult.measurements.length > 0 && (
              <div
                style={{
                  marginTop: 4,
                  padding: '12px 14px',
                  background: WARM_BG,
                  borderRadius: 10,
                  border: `0.5px solid ${BORDER}`,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: TEAL,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 8,
                  }}
                >
                  What this means
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    lineHeight: 1.65,
                    color: TEXT,
                  }}
                >
                  {viaInsight}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {poseResult && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            padding: '10px 12px',
            background: WARM_BG,
            borderRadius: 10,
            border: `0.5px solid ${BORDER}`,
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: TEXT_SEC,
              fontWeight: 600,
              marginRight: 2,
            }}
          >
            Analyze at:
          </span>
          {frames.map(frame => {
            const t = (videoRef.current?.duration || 0) * frame.pct
            const isActive =
              activeFrame !== null && Math.abs(activeFrame - t) < 0.5
            return (
              <button
                key={frame.label}
                type="button"
                onClick={() => seekTo(t)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  border: `0.5px solid ${isActive ? TEAL : BORDER}`,
                  background: isActive ? TEAL_LIGHT : 'white',
                  color: isActive ? TEAL : TEXT_SEC,
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                {frame.label}
              </button>
            )
          })}
          <span
            style={{
              fontSize: 10,
              color: TEXT_SEC,
              marginLeft: 'auto',
              opacity: 0.6,
            }}
          >
            Click to re-analyze at that frame
          </span>
        </div>
      )}

      <style>{`
        @keyframes poseSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
