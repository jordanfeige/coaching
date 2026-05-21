'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import type { ReactNode } from 'react'
import PlayerViaHero from '@/components/player/PlayerViaHero'
import MarkDrillCompleteButton from '@/components/player/MarkDrillCompleteButton'
import { typography } from '@/lib/brand'
import type { PageContext } from '@/lib/via-page-brief'

const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEAL = 'hsl(168,62%,36%)'
const WARM_BG = 'hsl(40,20%,97%)'
const GREEN = '#16A34A'
const RED = '#DC2626'
const PURPLE = '#7C3AED'
const AMBER = '#D97706'

const sportEmoji: Record<string, string> = {
  tennis: '🎾',
  golf: '⛳',
  baseball: '⚾',
  basketball: '🏀',
  pickleball: '🏓',
}

type PoseMeasurement = {
  label?: string
  measured?: number
  status?: 'good' | 'warning' | 'critical'
  deficit?: number
}

export type PlayerHomeMobileProps = {
  player: { id: string; name: string | null; sport: string | null }
  welcomeMessage: ReactNode
  prompts: string[]
  sessions: Array<Record<string, unknown>>
  drills: Array<Record<string, unknown>>
  lessons: Array<Record<string, unknown>>
  currentScore: number | null
  delta: number | null
  totalGain: number
  pose: PoseMeasurement[] | null
  consecutiveClean: number
}

const CSS = `
  @media (max-width: 480px) {
    .metrics-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .bottom-grid { grid-template-columns: 1fr !important; }
  }
`

export default function PlayerHomeMobile({
  player,
  welcomeMessage,
  prompts,
  sessions,
  drills,
  lessons,
  currentScore,
  delta,
  totalGain,
  pose,
  consecutiveClean,
}: PlayerHomeMobileProps) {
  const router = useRouter()
  const latest = sessions[sessions.length - 1]
  const upcomingDrill = drills[0]
  const nextLesson = lessons[0]
  const nextLessonDate =
    nextLesson && typeof nextLesson.starts_at === 'string'
      ? new Date(nextLesson.starts_at)
      : null

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        color: TEXT,
        maxWidth: 720,
        margin: '0 auto',
        padding: '0 0 40px',
        minHeight: '100%',
      }}
    >
      <style>{CSS}</style>

      <PlayerViaHero
        playerId={player.id}
        playerName={player.name || 'Athlete'}
        pageContext={
          {
            page: 'player-home',
            techniqueScore: currentScore ?? undefined,
            scoreDelta: delta ?? undefined,
            activeIssue:
              typeof latest?.top_issue === 'string'
                ? latest.top_issue
                : undefined,
            sessionCount: sessions.length,
          } satisfies PageContext
        }
        welcomeMessage={welcomeMessage}
        prompts={prompts}
      />

      {currentScore !== null && (
        <div
          style={{
            background: 'white',
            border: `0.5px solid ${BORDER}`,
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 11, color: TEXT_MUTED }}>Technique score</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: TEAL, lineHeight: 1 }}>
              {currentScore}
              {delta !== null && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    marginLeft: 8,
                    color: delta > 0 ? GREEN : delta < 0 ? RED : TEXT_MUTED,
                  }}
                >
                  {delta > 0 ? '↑' : delta < 0 ? '↓' : ''}
                  {delta !== 0 ? ` ${Math.abs(delta)}` : ''}
                </span>
              )}
            </span>
          </div>
          <div
            style={{
              height: 6,
              background: 'rgba(29,158,117,.12)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: 6,
                background: TEAL,
                borderRadius: 3,
                width: `${currentScore}%`,
              }}
            />
          </div>
        </div>
      )}

      {(pose?.length || currentScore !== null) && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: 9,
            }}
          >
            Your numbers
          </div>
          <div
            className="metrics-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 7,
            }}
          >
            {pose?.slice(0, 2).map((m, i) => (
              <div
                key={i}
                style={{
                  background:
                    m.status === 'critical' || m.status === 'warning'
                      ? '#FEF9EC'
                      : WARM_BG,
                  border: `0.5px solid ${
                    m.status === 'critical' ? '#FCD34D' : BORDER
                  }`,
                  borderRadius: 12,
                  padding: '11px 12px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 9, color: TEXT_MUTED, marginBottom: 3 }}>
                  {m.label}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color:
                      m.status === 'good'
                        ? TEAL
                        : m.status === 'warning'
                          ? AMBER
                          : RED,
                    lineHeight: 1,
                  }}
                >
                  {m.measured}°
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: m.status === 'good' ? TEAL : AMBER,
                    marginTop: 2,
                  }}
                >
                  {m.status === 'good'
                    ? '✓ in range'
                    : `${m.deficit ?? 0}° off`}
                </div>
              </div>
            ))}

            <div
              style={{
                background: WARM_BG,
                border: `0.5px solid ${BORDER}`,
                borderRadius: 12,
                padding: '11px 12px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 9, color: TEXT_MUTED, marginBottom: 3 }}>
                Streak
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: PURPLE,
                  lineHeight: 1,
                }}
              >
                {consecutiveClean}
              </div>
              <div style={{ fontSize: 9, color: PURPLE, marginTop: 2 }}>
                clean sessions
              </div>
            </div>

            <div
              style={{
                background: WARM_BG,
                border: `0.5px solid ${BORDER}`,
                borderRadius: 12,
                padding: '11px 12px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 9, color: TEXT_MUTED, marginBottom: 3 }}>
                All time
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: TEXT,
                  lineHeight: 1,
                }}
              >
                {totalGain > 0 ? `+${totalGain}` : '—'}
              </div>
              <div style={{ fontSize: 9, color: TEAL, marginTop: 2 }}>
                pts gained
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="bottom-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            background: WARM_BG,
            border: `0.5px solid ${BORDER}`,
            borderRadius: 14,
            padding: '13px 14px',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}
          >
            Today&apos;s drill
          </div>
          {upcomingDrill ? (
            <>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: TEXT,
                  marginBottom: 3,
                  lineHeight: 1.3,
                }}
              >
                {String(upcomingDrill.title)}
              </div>
              <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>
                Assigned by your coach
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: TEXT,
                  marginBottom: 3,
                }}
              >
                No drill assigned yet
              </div>
              <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>
                Upload a video for a personalized plan
              </div>
            </>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcomingDrill &&
              typeof upcomingDrill.id === 'string' &&
              !upcomingDrill.completed_at && (
                <MarkDrillCompleteButton
                  drillId={upcomingDrill.id}
                  completedAt={
                    typeof upcomingDrill.completed_at === 'string'
                      ? upcomingDrill.completed_at
                      : null
                  }
                  compact
                />
              )}
            <button
              type="button"
              onClick={() => router.push('/player/training#drills')}
              style={{
                padding: '8px 0',
                borderRadius: 9,
                background: TEAL,
                border: 'none',
                color: 'white',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif',
                width: '100%',
              }}
            >
              {upcomingDrill ? 'View drills →' : 'Get drills →'}
            </button>
          </div>
        </div>

        <div
          style={{
            background: WARM_BG,
            border: `0.5px solid ${BORDER}`,
            borderRadius: 14,
            padding: '13px 14px',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}
          >
            Next training
          </div>
          {nextLesson && nextLessonDate ? (
            <>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: TEXT,
                  marginBottom: 3,
                }}
              >
                {format(nextLessonDate, 'EEE MMM d')}
              </div>
              <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>
                {format(nextLessonDate, 'h:mm a')}
                {typeof nextLesson.notes === 'string' && nextLesson.notes
                  ? ` · ${nextLesson.notes.slice(0, 30)}...`
                  : ''}
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: TEXT,
                  marginBottom: 3,
                }}
              >
                No training scheduled
              </div>
              <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>
                Book a session with your coach
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => router.push('/player/training')}
            style={{
              padding: '8px 0',
              borderRadius: 9,
              border: `0.5px solid ${BORDER}`,
              background: 'white',
              color: '#555',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Arial, sans-serif',
              width: '100%',
            }}
          >
            {nextLesson ? 'View training →' : 'Book training →'}
          </button>
        </div>
      </div>

      <div
        style={{
          background: 'white',
          border: `0.5px solid ${BORDER}`,
          borderRadius: 14,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: TEXT,
              marginBottom: 2,
            }}
          >
            {sportEmoji[player.sport || 'tennis'] || '🎾'} Add to your Reels
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED }}>
            Upload a video and Via will measure your joint angles
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push('/player/reels')}
          style={{
            padding: '9px 18px',
            borderRadius: 10,
            background: TEXT,
            border: 'none',
            color: 'white',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Arial, sans-serif',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Reels →
        </button>
      </div>
    </div>
  )
}
