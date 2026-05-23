'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { PLAYER_VISIBLE_SESSIONS_FILTER } from '@/lib/analysis-sessions'
import { shouldShowReelAnalysisStepper } from '@/lib/reel-sessions'
import { setPendingReelVideoFile } from '@/lib/pending-reel'
import { signedUrlForReelStorage } from '@/lib/player-reel-video'
import ViaBlob from '@/components/ViaBlob'
import { usePageReady } from '@/contexts/PageLoadingContext'
import AnalysisStepperDialog from '@/components/video/AnalysisStepperDialog'
import { glass } from '@/lib/glass'
import { formatReelDisplayTitle } from '@/lib/reel-display'

const TEAL = 'hsl(168,62%,36%)'
const TEAL_DARK = 'hsl(168,62%,28%)'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'

const CSS = `
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  .session-detail-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.45);
    z-index: 100;
  }
  .session-detail-sheet {
    position: fixed;
    z-index: 101;
    background: white;
    font-family: Arial, sans-serif;
    display: flex;
    flex-direction: column;
    bottom: 0;
    left: 0;
    right: 0;
    max-height: 92vh;
    border-radius: 20px 20px 0 0;
  }
  .session-detail-handle {
    display: flex;
    justify-content: center;
    padding: 10px 0 4px;
    flex-shrink: 0;
  }
  .session-detail-scroll {
    overflow-y: auto;
    flex: 1;
    max-height: calc(92vh - 24px);
    padding-bottom: 32px;
  }
  @media (min-width: 640px) {
    .session-detail-sheet {
      top: 0;
      bottom: 0;
      left: auto;
      right: 0;
      width: 400px;
      max-height: 100vh;
      border-radius: 16px 0 0 16px;
    }
    .session-detail-handle {
      display: none;
    }
    .session-detail-scroll {
      max-height: 100vh;
    }
  }
`

type Filter = 'all' | 'video' | 'text' | 'verified'

interface Session {
  id: string
  sport: string
  title: string | null
  shot_type: string | null
  overall_score: number | null
  top_issue: string | null
  source: string
  coach_verified: boolean
  published_to_player: boolean
  analyzed_at: string
  lesson_id: string | null
  full_result: Record<string, unknown> | null
  storage_path: string | null
  thumbnail_url?: string | null
  video_url?: string | null
}

async function attachSignedVideoUrls(
  supabase: ReturnType<typeof createClient>,
  rows: Session[],
): Promise<Session[]> {
  return Promise.all(
    rows.map(async session => {
      if (!session.storage_path || session.source === 'text') return session
      const video_url = await signedUrlForReelStorage(
        supabase,
        session.storage_path,
        60 * 60 * 24,
      )
      return { ...session, video_url }
    }),
  )
}

function SessionCard({
  session,
  onClick,
}: {
  session: Session
  onClick: () => void
}) {
  const isText = session.source === 'text'
  const isVerified = session.coach_verified

  const displayTitle = formatReelDisplayTitle(
    session.title,
    session.shot_type,
    session.sport,
  )

  const dateLabel = format(new Date(session.analyzed_at), 'MMM d')

  const issueStatus = useMemo(() => {
    if (!session.top_issue) return null
    const issues =
      (session.full_result?.areas_to_improve as Array<{ area?: string; severity?: string }>) ||
      []
    const topIssue = issues.find(
      i =>
        (i.area || '').toLowerCase() === (session.top_issue || '').toLowerCase(),
    )
    return topIssue?.severity || 'moderate'
  }, [session])

  const dotColor =
    issueStatus === 'critical'
      ? '#DC2626'
      : issueStatus === 'minor'
        ? TEXT_MUTED
        : '#D97706'

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
      style={{
        background: '#ffffff',
        border: `0.5px solid ${BORDER}`,
        borderRadius: 14,
        cursor: 'pointer',
        display: 'flex',
        transition: 'border-color 0.15s',
      }}
    >
      {isText ? (
        <div
          style={{
            width: 100,
            flexShrink: 0,
            background: 'linear-gradient(135deg, #eaf7f2, #eff3fe)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            borderRight: `0.5px solid ${BORDER}`,
            minHeight: 80,
          }}
        >
          <span style={{ fontSize: 20 }}>✍️</span>
          <span style={{ fontSize: 9, color: TEXT_MUTED, fontWeight: 500 }}>
            Text session
          </span>
        </div>
      ) : (
        <div
          style={{
            width: 100,
            height: 80,
            flexShrink: 0,
            background: '#0d1a14',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {session.thumbnail_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.thumbnail_url}
              alt="Session thumbnail"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0.7,
              }}
            />
          )}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(255,255,255,.18)',
              border: '1.5px solid rgba(255,255,255,.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderTop: '5px solid transparent',
                borderBottom: '5px solid transparent',
                borderLeft: '9px solid white',
                marginLeft: 2,
              }}
            />
          </div>
          {session.overall_score !== null && (
            <div
              style={{
                position: 'absolute',
                bottom: 5,
                left: 5,
                background: 'rgba(0,0,0,.65)',
                borderRadius: 4,
                padding: '2px 5px',
                zIndex: 1,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>
                {session.overall_score}
              </span>
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 6,
            marginBottom: 4,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: TEXT,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayTitle} · {dateLabel}
          </div>
          {isVerified ? (
            <div
              style={{
                padding: '2px 7px',
                borderRadius: 999,
                background: '#E1F5EE',
                border: '0.5px solid rgba(29,158,117,.2)',
                fontSize: 9,
                color: '#0F6E56',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              ✓ Coach reviewed
            </div>
          ) : (
            <div
              style={{
                padding: '2px 7px',
                borderRadius: 999,
                background: WARM_BG,
                border: `0.5px solid ${BORDER}`,
                fontSize: 9,
                color: TEXT_MUTED,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              AI only
            </div>
          )}
        </div>

        {session.top_issue && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              marginBottom: 5,
            }}
          >
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: dotColor,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: TEXT_SEC,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {session.top_issue}
            </span>
          </div>
        )}

        {isText && session.overall_score !== null && (
          <div style={{ fontSize: 11, color: TEAL, fontWeight: 600 }}>
            Score: {session.overall_score}
          </div>
        )}
      </div>
    </div>
  )
}

function SessionDetail({
  session,
  onClose,
  onViewProgress,
}: {
  session: Session
  onClose: () => void
  onViewProgress: (issue: string) => void
}) {
  const issues =
    (session.full_result?.areas_to_improve as Array<Record<string, unknown>>) ||
    []
  const strengths =
    (session.full_result?.strengths as Array<Record<string, unknown> | string>) ||
    []
  const coachNote =
    (session.full_result?.coach_notes as string | undefined) ||
    (session.full_result?.via_summary as string | undefined)

  const displayTitle = formatReelDisplayTitle(
    session.title,
    session.shot_type,
    session.sport,
  )

  return (
    <>
      <div
        className="session-detail-backdrop"
        role="presentation"
        onClick={onClose}
      />
      <div
        className="session-detail-sheet"
        onClick={e => e.stopPropagation()}
      >
        <div className="session-detail-handle">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: BORDER }} />
        </div>

        <div
          style={{
            padding: '8px 18px 12px',
            borderBottom: `0.5px solid ${BORDER}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>
              {displayTitle} · {format(new Date(session.analyzed_at), 'MMM d, yyyy')}
            </div>
            {session.coach_verified && (
              <div style={{ fontSize: 10, color: '#0F6E56', marginTop: 2 }}>
                ✓ Coach reviewed
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: WARM_BG,
              border: `0.5px solid ${BORDER}`,
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 16,
              color: TEXT_MUTED,
            }}
          >
            ×
          </button>
        </div>

        <div className="session-detail-scroll">
        <div
          style={{
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {session.source === 'text' ? (
            <div
              style={{
                background: 'linear-gradient(135deg, #eaf7f2, #eff3fe)',
                borderRadius: 12,
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 24 }}>✍️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 2 }}>
                  Text session
                </div>
                <div style={{ fontSize: 11, color: TEXT_SEC }}>
                  No video — described by{' '}
                  {session.coach_verified ? 'player, reviewed by coach' : 'player'}
                </div>
              </div>
              {session.overall_score !== null && (
                <div
                  style={{
                    marginLeft: 'auto',
                    fontSize: 28,
                    fontWeight: 900,
                    color: TEAL,
                    letterSpacing: -1,
                  }}
                >
                  {session.overall_score}
                </div>
              )}
            </div>
          ) : (
            <div style={{ borderRadius: 12, overflow: 'hidden' }}>
              {session.video_url ? (
                <video
                  src={session.video_url}
                  controls
                  playsInline
                  preload="metadata"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    background: 'black',
                    borderRadius: 12,
                    maxHeight: 220,
                    display: 'block',
                  }}
                />
              ) : (
                <div
                  style={{
                    background: '#0d1a14',
                    borderRadius: 12,
                    height: 180,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)' }}>
                    Video not available
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.25)' }}>
                    Older reels were not stored
                  </div>
                  {session.overall_score !== null && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 28,
                        fontWeight: 900,
                        color: 'white',
                      }}
                    >
                      {session.overall_score}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {Boolean(
            session.full_result?.via_summary || session.full_result?.biggest_win,
          ) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 9,
                padding: '11px 13px',
                background:
                  'linear-gradient(135deg, rgba(234,247,242,.8), rgba(239,243,254,.8))',
                borderRadius: 12,
                border: '0.5px solid rgba(29,158,117,.12)',
              }}
            >
              <ViaBlob size={20} style={{ marginTop: 1 }} />
              <p style={{ fontSize: 12, color: TEXT, lineHeight: 1.65, margin: 0 }}>
                {String(
                  session.full_result?.via_summary || session.full_result?.biggest_win,
                )}
              </p>
            </div>
          )}

          {issues.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: TEXT_MUTED,
                  textTransform: 'uppercase',
                  letterSpacing: '.07em',
                  marginBottom: 8,
                }}
              >
                Issues in this reel
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {issues.map((issue, i) => {
                  const isFixed =
                    issue.status === 'fixed' || issue.current_status === 'fixed'
                  const color =
                    issue.severity === 'critical'
                      ? '#DC2626'
                      : issue.severity === 'minor'
                        ? TEXT_MUTED
                        : '#D97706'
                  const borderColor = isFixed
                    ? '#86EFAC'
                    : issue.severity === 'critical'
                      ? '#FCA5A5'
                      : '#FCD34D'

                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '9px 12px',
                        background: 'white',
                        border: `0.5px solid ${borderColor}`,
                        borderRadius: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: isFixed ? TEAL : color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 500, color: TEXT, flex: 1 }}>
                        {String(issue.area || 'Issue')}
                      </span>
                      <span style={{ fontSize: 10, color: isFixed ? TEAL : color }}>
                        {isFixed ? 'Fixed ✓' : String(issue.severity || 'moderate')}
                      </span>
                      <button
                        type="button"
                        onClick={() => onViewProgress(String(issue.area || ''))}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: TEAL,
                          fontSize: 10,
                          cursor: 'pointer',
                          fontFamily: 'Arial, sans-serif',
                          padding: '0 0 0 4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        See progress →
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {strengths.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: TEXT_MUTED,
                  textTransform: 'uppercase',
                  letterSpacing: '.07em',
                  marginBottom: 8,
                }}
              >
                Strengths
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {strengths.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '5px 11px',
                      borderRadius: 999,
                      background: '#E1F5EE',
                      border: '0.5px solid #86EFAC',
                      fontSize: 11,
                      color: '#0F6E56',
                      fontWeight: 500,
                    }}
                  >
                    ✓ {typeof s === 'string' ? s : String(s.area || 'Strength')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {coachNote && (
            <div
              style={{
                padding: '10px 13px',
                background: WARM_BG,
                borderRadius: 10,
                borderLeft: `3px solid ${TEAL}`,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, marginBottom: 4 }}>
                Coach note
              </div>
              <p style={{ fontSize: 12, color: TEXT, lineHeight: 1.65, margin: 0 }}>{coachNote}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => onViewProgress(String(issues[0]?.area || ''))}
            style={{
              width: '100%',
              padding: 13,
              borderRadius: 12,
              background: 'white',
              border: `0.5px solid ${BORDER}`,
              color: TEXT_SEC,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'Arial, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            📈 See how these issues progressed
          </button>
        </div>
        </div>
      </div>
    </>
  )
}

export default function ReelsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [player, setPlayer] = useState<{
    id?: string
    name?: string | null
  } | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Session | null>(null)
  const [existingDrillTitles, setExistingDrillTitles] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('player_id')
        .eq('id', user.id)
        .single()

      if (prof?.player_id) {
        const { data: p } = await supabase
          .from('players')
          .select('id, name')
          .eq('id', prof.player_id)
          .single()
        setPlayer(p)

        const { data: s } = await supabase
          .from('analysis_sessions')
          .select('*')
          .eq('player_id', prof.player_id)
          .or(PLAYER_VISIBLE_SESSIONS_FILTER)
          .order('analyzed_at', { ascending: false })

        const normalized = (s || []).map(row => ({
          ...(row as Session),
          source: row.source || 'video',
          coach_verified: Boolean(row.coach_verified),
          published_to_player: Boolean(row.published_to_player),
          storage_path: row.storage_path ?? null,
        })) as Session[]

        setSessions(await attachSignedVideoUrls(supabase, normalized))
      }

      setLoading(false)
    }
    void load()
  }, [router, supabase])

  useEffect(() => {
    async function loadDrillTitles() {
      if (!selected || !player?.id || !shouldShowReelAnalysisStepper(selected)) {
        setExistingDrillTitles([])
        return
      }
      const { data } = await supabase
        .from('drills')
        .select('title')
        .eq('player_id', player.id)
      setExistingDrillTitles((data ?? []).map(d => d.title).filter(Boolean))
    }
    void loadDrillTitles()
  }, [selected, player?.id, supabase])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'video':
        return sessions.filter(s => s.source !== 'text')
      case 'text':
        return sessions.filter(s => s.source === 'text')
      case 'verified':
        return sessions.filter(s => s.coach_verified)
      default:
        return sessions
    }
  }, [sessions, filter])

  const filterCounts = {
    all: sessions.length,
    video: sessions.filter(s => s.source !== 'text').length,
    text: sessions.filter(s => s.source === 'text').length,
    verified: sessions.filter(s => s.coach_verified).length,
  }

  usePageReady(!loading)

  if (loading) {
    return null
  }

  return (
    <div
      style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: '0 0 40px',
        fontFamily: 'Arial, sans-serif',
        color: TEXT,
      }}
    >
      <style>{CSS}</style>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Link
            href="/player/reels"
            style={{
              fontSize: 12,
              color: TEAL,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-block',
              marginBottom: 8,
            }}
          >
            ← Reels home
          </Link>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: TEXT,
              letterSpacing: '-.5px',
              marginBottom: 2,
            }}
          >
            All reels
          </h1>
          <p style={{ fontSize: 12, color: TEXT_MUTED }}>
            {player?.name} · {sessions.length} session
            {sessions.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 4,
          marginBottom: 14,
        }}
      >
        {(
          [
            { key: 'all' as const, label: 'All' },
            { key: 'video' as const, label: 'Video' },
            { key: 'text' as const, label: 'Text sessions' },
            { key: 'verified' as const, label: 'Coach reviewed' },
          ] as const
        ).map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            style={{
              padding: '6px 13px',
              borderRadius: 999,
              background: filter === f.key ? TEAL : 'white',
              border: `0.5px solid ${filter === f.key ? TEAL : BORDER}`,
              color: filter === f.key ? 'white' : TEXT_SEC,
              fontSize: 12,
              fontWeight: filter === f.key ? 600 : 400,
              cursor: 'pointer',
              fontFamily: 'Arial, sans-serif',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            {f.label}
            {filterCounts[f.key] > 0 && (
              <span style={{ fontSize: 10, marginLeft: 5, opacity: 0.7 }}>
                {filterCounts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #eaf7f2, #eff3fe 60%, #f5f0fd)',
            borderRadius: 16,
            border: '0.5px solid rgba(29,158,117,.15)',
            padding: '28px 22px',
            textAlign: 'center',
          }}
        >
          <ViaBlob size={36} style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
            {filter === 'all' ? 'No reels yet' : `No ${filter} reels yet`}
          </div>
          <p style={{ fontSize: 13, color: TEXT_SEC, lineHeight: 1.6, margin: 0 }}>
            {filter === 'all'
              ? 'Use Via above to upload a video or log a text session.'
              : 'Try a different filter or add a new reel with Via above.'}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {filtered.map(session => (
          <SessionCard
            key={session.id}
            session={session}
            onClick={() => setSelected(session)}
          />
        ))}
      </div>

      {selected && shouldShowReelAnalysisStepper(selected) && (
        <AnalysisStepperDialog
          open
          onOpenChange={open => {
            if (!open) setSelected(null)
          }}
          analysis={selected.full_result as Record<string, unknown>}
          sport={selected.sport}
          shotType={selected.shot_type ?? undefined}
          sessionId={selected.id}
          playerId={player?.id}
          analyzedAt={selected.analyzed_at}
          videoUrl={selected.video_url}
          storagePath={selected.storage_path}
          viewMode="re-view"
          existingDrillTitles={existingDrillTitles}
          progressHref="/player/progress"
        />
      )}

      {selected && !shouldShowReelAnalysisStepper(selected) && (
        <SessionDetail
          session={selected}
          onClose={() => setSelected(null)}
          onViewProgress={issue => {
            setSelected(null)
            router.push(
              `/player/progress${issue ? `?issue=${encodeURIComponent(issue)}` : ''}`,
            )
          }}
        />
      )}
    </div>
  )
}
