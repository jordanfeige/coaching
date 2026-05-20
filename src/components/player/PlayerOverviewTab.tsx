'use client'

import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/GlassCard'

const TEAL = '#1D9E75'
const TEAL_DARK = '#085041'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'

const GREEN_BG = '#F0FDF4'
const GREEN_BORDER = '#86EFAC'
const GREEN_TEXT = '#0F6E56'
const AMBER_BG = '#FFFBEB'
const AMBER_BORDER = '#FCD34D'
const AMBER_TEXT = '#854F0B'

type Session = {
  id: string
  overall_score?: number | null
  analyzed_at?: string | null
  top_issue?: string | null
  shot_type?: string | null
  sport?: string | null
  coach_verified?: boolean | null
}

type Lesson = {
  id: string
  starts_at: string
  duration_minutes?: number | null
}

interface Props {
  player: { id: string; name: string }
  sessions: Session[]
  sortedSessions: Session[]
  latestSession: Session | null
  activeIssues: string[]
  fixedIssues: string[]
  totalGain: number
  nextLesson: Lesson | null
  utrLinked?: boolean
  utrSingles?: number | null
  utrLastSynced?: string | null
  onLinkUTR?: () => void
  onRelinkUTR?: () => void
  onUnlinkUTR?: () => void | Promise<void>
  onSyncUTR?: () => void | Promise<void>
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <div
      style={{
        background: WARM_BG,
        border: `0.5px solid ${BORDER}`,
        borderRadius: 12,
        padding: '12px 14px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: TEXT_MUTED,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: accent || TEXT,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  )
}

function ScoreTrendChart({ sessions }: { sessions: Session[] }) {
  const scores = sessions
    .map(s => s.overall_score)
    .filter((s): s is number => typeof s === 'number')

  if (scores.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: TEXT_MUTED,
          fontSize: 12,
          minHeight: 120,
        }}
      >
        No scores yet — analyze a reel to start tracking
      </div>
    )
  }

  const max = Math.max(...scores, 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 6,
          height: 100,
          paddingTop: 4,
        }}
      >
        {sessions.map(session => {
          const score = session.overall_score
          const heightPct =
            typeof score === 'number' ? Math.max(12, (score / max) * 100) : 8
          const label = session.analyzed_at
            ? format(new Date(session.analyzed_at), 'MMM d')
            : '—'

          return (
            <div
              key={session.id}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                minWidth: 0,
              }}
            >
              {typeof score === 'number' && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: TEXT_SEC,
                  }}
                >
                  {score}
                </span>
              )}
              <div
                style={{
                  width: '100%',
                  maxWidth: 28,
                  borderRadius: 4,
                  background:
                    typeof score === 'number' ? TEAL : BORDER,
                  height: `${heightPct}%`,
                  minHeight: 6,
                  opacity: typeof score === 'number' ? 1 : 0.35,
                }}
              />
              <span
                style={{
                  fontSize: 8,
                  color: TEXT_MUTED,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PlayerOverviewTab({
  player,
  sessions,
  sortedSessions,
  latestSession,
  activeIssues,
  fixedIssues,
  totalGain,
  nextLesson,
  utrLinked = false,
  utrSingles,
  utrLastSynced,
  onLinkUTR,
  onRelinkUTR,
  onUnlinkUTR,
  onSyncUTR,
}: Props) {
  const router = useRouter()
  const firstName = player.name.split(' ')[0] || player.name
  const latestScore = latestSession?.overall_score ?? null
  const lessonDuration = nextLesson?.duration_minutes || 60

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '20px 0',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: 10,
        }}
      >
        <StatCard
          label="Technique score"
          value={latestScore ?? '—'}
          sub={latestSession?.analyzed_at ? 'Latest reel' : 'No reels yet'}
          accent={TEAL}
        />
        <StatCard
          label="Total reels"
          value={sessions.length}
          sub={sessions.length === 1 ? 'session' : 'sessions'}
        />
        <StatCard
          label="Issues fixed"
          value={fixedIssues.length}
          sub={fixedIssues.length > 0 ? 'resolved' : 'none yet'}
          accent={fixedIssues.length > 0 ? GREEN_TEXT : undefined}
        />
        <StatCard
          label="Score gained"
          value={totalGain > 0 ? `+${totalGain}` : totalGain < 0 ? totalGain : '—'}
          sub="all time"
          accent={totalGain > 0 ? TEAL : undefined}
        />
      </div>

      {/* UTR status */}
      <div
        style={{
          background: utrLinked ? '#E1F5EE' : 'white',
          border: utrLinked ? '0.5px solid #9FE1CB' : `0.5px solid ${BORDER}`,
          borderRadius: 12,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          {utrLinked ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 500,
                    color: TEAL_DARK,
                    lineHeight: 1,
                  }}
                >
                  {utrSingles != null ? Number(utrSingles).toFixed(2) : '—'}
                </span>
                <span style={{ fontSize: 11, color: GREEN_TEXT }}>UTR Singles</span>
              </div>
              <div style={{ fontSize: 10, color: GREEN_TEXT }}>
                {utrLastSynced
                  ? `Synced ${format(new Date(utrLastSynced), 'MMM d')}`
                  : 'Linked'}
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: TEXT,
                  marginBottom: 2,
                }}
              >
                Link UTR account
              </div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                Enables schedule strength, auto-sync, and recruiting projection
                accuracy
              </div>
            </>
          )}
        </div>
        {utrLinked ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() => void onSyncUTR?.()}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '0.5px solid #9FE1CB',
                background: 'white',
                fontSize: 11,
                color: GREEN_TEXT,
                cursor: 'pointer',
              }}
            >
              Sync
            </button>
            <button
              type="button"
              onClick={onRelinkUTR}
              style={{
                fontSize: 11,
                color: TEXT_SEC,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: 6,
              }}
              title="Re-link UTR account"
            >
              Re-link
            </button>
            <button
              type="button"
              onClick={() => void onUnlinkUTR?.()}
              style={{
                fontSize: 11,
                color: '#A32D2D',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: 6,
              }}
              title="Unlink UTR account"
            >
              Unlink
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onLinkUTR}
            style={{
              padding: '8px 14px',
              borderRadius: 9,
              background: TEAL,
              border: 'none',
              color: 'white',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Link UTR →
          </button>
        )}
      </div>

      {/* Score trend + issues */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
        <GlassCard mode="light" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', minHeight: 180 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: TEXT_MUTED,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}
            >
              Score trend
            </span>
            {sortedSessions.length > 0 && (
              <span style={{ fontSize: 11, color: TEXT_SEC }}>
                {sortedSessions.length} reel{sortedSessions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <ScoreTrendChart sessions={sortedSessions} />
        </GlassCard>

        <GlassCard mode="light" style={{ padding: '14px 16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: TEXT_MUTED,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}
            >
              Technique issues
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {activeIssues.length > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: AMBER_BG,
                    border: `0.5px solid ${AMBER_BORDER}`,
                    color: AMBER_TEXT,
                  }}
                >
                  {activeIssues.length} active
                </span>
              )}
              {fixedIssues.length > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: GREEN_BG,
                    border: `0.5px solid ${GREEN_BORDER}`,
                    color: GREEN_TEXT,
                  }}
                >
                  {fixedIssues.length} fixed
                </span>
              )}
            </div>
          </div>

          {activeIssues.length === 0 && fixedIssues.length === 0 ? (
            <p style={{ fontSize: 12, color: TEXT_MUTED, margin: 0, lineHeight: 1.5 }}>
              No issues tracked yet. Analyze a reel to identify focus areas.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {activeIssues.map(issue => (
                <div
                  key={`active-${issue}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    background: AMBER_BG,
                    border: `0.5px solid ${AMBER_BORDER}`,
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#D97706',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12,
                      fontWeight: 600,
                      color: TEXT,
                    }}
                  >
                    {issue}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: AMBER_TEXT,
                    }}
                  >
                    Active
                  </span>
                </div>
              ))}
              {fixedIssues.map(issue => (
                <div
                  key={`fixed-${issue}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    background: GREEN_BG,
                    border: `0.5px solid ${GREEN_BORDER}`,
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: TEAL,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12,
                      fontWeight: 600,
                      color: TEXT,
                    }}
                  >
                    {issue}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: GREEN_TEXT,
                    }}
                  >
                    Fixed ✓
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Next lesson + latest reel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
        <div
          style={{
            background: WARM_BG,
            border: `0.5px solid ${BORDER}`,
            borderRadius: 14,
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: 10,
            }}
          >
            Next lesson
          </div>
          {nextLesson ? (
            <>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: TEXT,
                  marginBottom: 4,
                }}
              >
                {format(new Date(nextLesson.starts_at), 'EEEE, MMM d')}
              </div>
              <div style={{ fontSize: 12, color: TEXT_SEC, marginBottom: 14 }}>
                {format(new Date(nextLesson.starts_at), 'h:mm a')} · {lessonDuration} min
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/dashboard/schedule?player=${player.id}`)
                  }
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: 9,
                    border: `0.5px solid ${BORDER}`,
                    background: 'white',
                    color: TEXT,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  Schedule
                </button>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/dashboard/lessons/${nextLesson.id}`)
                  }
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: 9,
                    border: 'none',
                    background: TEAL,
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  Open
                </button>
              </div>
            </>
          ) : (
            <>
              <p
                style={{
                  fontSize: 12,
                  color: TEXT_SEC,
                  margin: '0 0 12px',
                  lineHeight: 1.5,
                }}
              >
                No upcoming lesson with {firstName}.
              </p>
              <button
                type="button"
                onClick={() =>
                  router.push(`/dashboard/schedule?player=${player.id}`)
                }
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 9,
                  border: 'none',
                  background: TEAL,
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                Schedule lesson
              </button>
            </>
          )}
        </div>

        <div
          role={latestSession ? 'button' : undefined}
          tabIndex={latestSession ? 0 : undefined}
          onClick={
            latestSession
              ? () =>
                  router.push(`/dashboard/players/${player.id}?tab=video`)
              : undefined
          }
          onKeyDown={
            latestSession
              ? e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    router.push(`/dashboard/players/${player.id}?tab=video`)
                  }
                }
              : undefined
          }
          style={{
            background: latestSession
              ? 'linear-gradient(145deg, #1a2332 0%, #0f1419 100%)'
              : WARM_BG,
            border: `0.5px solid ${latestSession ? 'rgba(255,255,255,.08)' : BORDER}`,
            borderRadius: 14,
            padding: '14px 16px',
            cursor: latestSession ? 'pointer' : 'default',
            minHeight: 120,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: latestSession ? 'rgba(255,255,255,.5)' : TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: 10,
            }}
          >
            Latest reel
          </div>
          {latestSession ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <div>
                  {latestSession.shot_type && (
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'white',
                        textTransform: 'capitalize',
                        marginBottom: 4,
                      }}
                    >
                      {latestSession.shot_type}
                    </div>
                  )}
                  {latestSession.analyzed_at && (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,.55)',
                      }}
                    >
                      {format(
                        new Date(latestSession.analyzed_at),
                        'MMM d, yyyy · h:mm a',
                      )}
                    </div>
                  )}
                </div>
                {typeof latestSession.overall_score === 'number' && (
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 900,
                      color: TEAL,
                      lineHeight: 1,
                    }}
                  >
                    {latestSession.overall_score}
                  </div>
                )}
              </div>
              {latestSession.top_issue && (
                <p
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,.7)',
                    margin: '0 0 8px',
                    lineHeight: 1.5,
                  }}
                >
                  Top issue: {latestSession.top_issue}
                </p>
              )}
              <span
                style={{
                  fontSize: 11,
                  color: TEAL,
                  fontWeight: 600,
                }}
              >
                View reel →
              </span>
            </>
          ) : (
            <p
              style={{
                fontSize: 12,
                color: TEXT_MUTED,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              No reels analyzed yet. Upload video on the Video tab.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
