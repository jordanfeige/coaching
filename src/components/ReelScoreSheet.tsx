'use client'

import { useRef, useState } from 'react'

const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'

export interface Checkpoint {
  name: string
  score: number
  maxScore: number
  status: 'strong' | 'ok' | 'issue' | 'critical'
}

interface Props {
  session: Record<string, unknown> | null
  checkpoints?: Checkpoint[]
}

export function buildCheckpoints(
  session: Record<string, unknown> | null | undefined,
): Checkpoint[] {
  if (!session) return []

  const rawList = session.checkpoints
  if (Array.isArray(rawList) && rawList.length > 0) {
    return rawList.map((cp: Record<string, unknown>) => ({
      name: String(cp.name || cp.checkpoint || 'Checkpoint'),
      score: Number(cp.score) || 0,
      maxScore: Number(cp.max_score) || 10,
      status:
        cp.severity === 'critical'
          ? 'critical'
          : cp.severity === 'moderate'
            ? 'issue'
            : cp.is_strength
              ? 'strong'
              : 'ok',
    }))
  }

  const scores = session.checkpoint_scores as
    | Record<string, number>
    | null
    | undefined
  if (!scores || typeof scores !== 'object') return []

  return Object.entries(scores).map(([name, score]) => {
    const num = Number(score) || 0
    return {
      name,
      score: num,
      maxScore: 10,
      status:
        num >= 8 ? 'strong' : num >= 6 ? 'ok' : num >= 4 ? 'issue' : 'critical',
    }
  })
}

export default function ReelScoreSheet({
  session,
  checkpoints = [],
}: Props) {
  const [open, setOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)

  const statusColor = (status: Checkpoint['status']) =>
    ({
      strong: '#1D9E75',
      ok: '#EF9F27',
      issue: '#EF9F27',
      critical: '#E24B4A',
    })[status]

  const statusBg = (status: Checkpoint['status']) =>
    ({
      strong: '#E1F5EE',
      ok: '#FAEEDA',
      issue: '#FAEEDA',
      critical: '#FCEBEB',
    })[status]

  const statusText = (status: Checkpoint['status']) =>
    ({
      strong: '#085041',
      ok: '#633806',
      issue: '#633806',
      critical: '#A32D2D',
    })[status]

  function onTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY
  }

  function onTouchMove(e: React.TouchEvent) {
    currentY.current = e.touches[0].clientY
    const delta = currentY.current - startY.current
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`
    }
  }

  function onTouchEnd() {
    const delta = currentY.current - startY.current
    if (delta > 80) {
      setOpen(false)
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = ''
    }
  }

  const confidenceLevel = session?.confidence_level
  const confidence =
    typeof confidenceLevel === 'number'
      ? Math.round(confidenceLevel * 100)
      : typeof session?.confidence_pct === 'number'
        ? session.confidence_pct
        : null

  const analysisType =
    session?.analysis_type === 'full_video'
      ? 'Full video'
      : session?.analysis_type === 'frames'
        ? 'Multi-frame'
        : 'Full video'

  const isVerified = !!session?.coach_verified_at

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="See score breakdown"
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'rgba(255,255,255,.12)',
          border: '0.5px solid rgba(255,255,255,.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <i
          className="ti ti-info-circle"
          style={{ fontSize: 15, color: 'rgba(255,255,255,.7)' }}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          onClick={e => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.45)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div
            ref={sheetRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              width: '100%',
              background: 'white',
              borderRadius: '16px 16px 0 0',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s ease',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '10px 0 4px',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  background: BORDER,
                }}
              />
            </div>

            <div
              style={{
                padding: '4px 16px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: `0.5px solid ${BORDER}`,
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: TEXT }}>
                  Score breakdown
                </div>
                {confidence != null && (
                  <div
                    style={{
                      fontSize: 11,
                      color: TEXT_MUTED,
                      marginTop: 1,
                    }}
                  >
                    AI confidence {confidence}%
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: WARM_BG,
                  border: `0.5px solid ${BORDER}`,
                  borderRadius: 7,
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: TEXT_MUTED,
                  fontSize: 16,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {checkpoints.length > 0 ? (
                checkpoints.map((cp, i) => (
                  <div
                    key={cp.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 16px',
                      borderBottom:
                        i < checkpoints.length - 1
                          ? `0.5px solid ${BORDER}`
                          : 'none',
                      background:
                        cp.status === 'critical'
                          ? 'rgba(220,38,38,.02)'
                          : 'white',
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: statusColor(cp.status),
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 13, color: TEXT, flex: 1 }}>
                      {cp.name}
                    </span>
                    <div
                      style={{
                        width: 64,
                        height: 4,
                        background: BORDER,
                        borderRadius: 2,
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          height: 4,
                          width: `${Math.round((cp.score / cp.maxScore) * 100)}%`,
                          background: statusColor(cp.status),
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: statusText(cp.status),
                        minWidth: 28,
                        textAlign: 'right',
                      }}
                    >
                      +{cp.score}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: statusBg(cp.status),
                        color: statusText(cp.status),
                        flexShrink: 0,
                      }}
                    >
                      {cp.status === 'strong'
                        ? 'Strong'
                        : cp.status === 'critical'
                          ? 'Critical'
                          : cp.status === 'issue'
                            ? 'Issue'
                            : 'OK'}
                    </span>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    color: TEXT_MUTED,
                    fontSize: 13,
                  }}
                >
                  Checkpoint breakdown not available for this session.
                </div>
              )}

              <div
                style={{
                  padding: '10px 16px 16px',
                  borderTop: `0.5px solid ${BORDER}`,
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: WARM_BG,
                    border: `0.5px solid ${BORDER}`,
                    color: TEXT_MUTED,
                  }}
                >
                  Gemini 2.5
                </span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: WARM_BG,
                    border: `0.5px solid ${BORDER}`,
                    color: TEXT_MUTED,
                  }}
                >
                  {analysisType}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: isVerified ? '#E1F5EE' : '#FAEEDA',
                    border: `0.5px solid ${isVerified ? '#9FE1CB' : '#EF9F27'}`,
                    color: isVerified ? '#085041' : '#633806',
                  }}
                >
                  {isVerified ? 'Coach verified ✓' : 'Not verified'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
