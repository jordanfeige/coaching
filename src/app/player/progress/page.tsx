'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getLinkedPlayerRowForUser } from '@/lib/linked-player'
import { differenceInDays, format } from 'date-fns'
import PlayerPageVia from '@/components/player/PlayerPageVia'
import MarkDrillCompleteButton from '@/components/player/MarkDrillCompleteButton'
import ViaBlob from '@/components/ViaBlob'
import {
  PLAYER_VISIBLE_SESSIONS_FILTER,
  SessionReviewBadge,
} from '@/lib/analysis-sessions'
import { GlassCard } from '@/components/GlassCard'
import { glass } from '@/lib/glass'

const TEAL = 'hsl(168,62%,36%)'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'
const GREEN = '#16A34A'
const GREEN_BG = '#F0FDF4'
const GREEN_BORDER = '#86EFAC'
const AMBER = '#D97706'
const AMBER_BG = '#FFFBEB'
const AMBER_BORDER = '#FCD34D'
const RED = '#DC2626'
const RED_BG = '#FEF2F2'
const RED_BORDER = '#FCA5A5'

const CSS = `
  @keyframes checkPop {
    0%   { transform: scale(0); opacity: 0; }
    70%  { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
  }
  .check-pop { animation: checkPop 0.4s ease forwards; }
`

type AnalysisSession = {
  id: string
  analyzed_at: string
  overall_score?: number | null
  top_issue?: string | null
  coach_verified?: boolean | null
  source?: string | null
  full_result?: {
    areas_to_improve?: Array<{ area?: string } | string>
    top_issue?: string
  } | null
}

type Drill = {
  id: string
  title?: string | null
  player_id?: string | null
  completed_at?: string | null
}

type Player = {
  id: string
  name?: string | null
  sport?: string | null
}

type IssueStatus = 'fixed' | 'improving' | 'active' | 'new'

type TrackedIssue = {
  issue: string
  status: IssueStatus
  firstSeen: string
  lastSeen: string
  count: number
}

const sportEmoji: Record<string, string> = {
  tennis: '🎾',
  golf: '⛳',
  baseball: '⚾',
  basketball: '🏀',
  pickleball: '🏓',
}

function sessionAreas(session: AnalysisSession): string[] {
  const areas = session.full_result?.areas_to_improve || []
  const fromAreas = areas
    .map(a => (typeof a === 'string' ? a : a.area))
    .filter((a): a is string => Boolean(a))
  const top = session.top_issue || session.full_result?.top_issue
  return [...fromAreas, ...(top ? [top] : [])]
}

function getIssueStatus(issue: string, sessions: AnalysisSession[]): IssueStatus {
  const sorted = [...sessions].sort(
    (a, b) =>
      new Date(a.analyzed_at).getTime() - new Date(b.analyzed_at).getTime(),
  )
  const recent3 = sorted.slice(-3)
  const recent5 = sorted.slice(-5)
  const issueKey = issue.toLowerCase()

  const flaggedIn3 = recent3.filter(s => {
    return sessionAreas(s).some(
      a =>
        a.toLowerCase().includes(issueKey) ||
        (s.top_issue || '').toLowerCase().includes(issueKey),
    )
  })

  const flaggedIn5 = recent5.filter(s => {
    return sessionAreas(s).some(
      a =>
        a.toLowerCase().includes(issueKey) ||
        (s.top_issue || '').toLowerCase().includes(issueKey),
    )
  })

  if (flaggedIn3.length === 0 && flaggedIn5.length >= 2) return 'fixed'
  if (flaggedIn3.length <= 1 && flaggedIn5.length >= 3) return 'improving'
  if (flaggedIn3.length >= 2) return 'active'
  return 'new'
}

function issueSlug(issue: string) {
  return `issue-${issue.toLowerCase().replace(/\s+/g, '-')}`
}

function getAllIssues(sessions: AnalysisSession[]): TrackedIssue[] {
  const sorted = [...sessions].sort(
    (a, b) =>
      new Date(a.analyzed_at).getTime() - new Date(b.analyzed_at).getTime(),
  )

  const issueMap: Record<
    string,
    {
      displayName: string
      firstSeen: string
      lastSeen: string
      count: number
    }
  > = {}

  sorted.forEach(s => {
    const issueNames = [...new Set(sessionAreas(s))]

    issueNames.forEach(issue => {
      const key = issue.toLowerCase().trim()
      if (!issueMap[key]) {
        issueMap[key] = {
          displayName: issue,
          firstSeen: s.analyzed_at,
          lastSeen: s.analyzed_at,
          count: 0,
        }
      }
      issueMap[key].lastSeen = s.analyzed_at
      issueMap[key].count++
    })
  })

  return Object.entries(issueMap).map(([, data]) => ({
    issue: data.displayName,
    status: getIssueStatus(data.displayName, sessions),
    firstSeen: data.firstSeen,
    lastSeen: data.lastSeen,
    count: data.count,
  }))
}

function ProgressPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightIssue = searchParams.get('issue')
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [player, setPlayer] = useState<Player | null>(null)
  const [sessions, setSessions] = useState<AnalysisSession[]>([])
  const [drills, setDrills] = useState<Drill[]>([])

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const playerRow = await getLinkedPlayerRowForUser(supabase, user.id)
      if (playerRow?.id) {
        setPlayer({
          id: playerRow.id,
          name: playerRow.name,
          sport: playerRow.sport,
        })

        const { data: s } = await supabase
          .from('analysis_sessions')
          .select('*')
          .eq('player_id', playerRow.id)
          .or(PLAYER_VISIBLE_SESSIONS_FILTER)
          .order('analyzed_at', { ascending: true })

        setSessions((s as AnalysisSession[]) || [])

        const { data: d } = await supabase
          .from('drills')
          .select('id, title, description, completed_at')
          .eq('player_id', playerRow.id)
          .order('created_at', { ascending: false })
          .limit(5)

        setDrills((d as Drill[]) || [])
      }

      setLoading(false)
    }
    void load()
  }, [router, supabase])

  useEffect(() => {
    if (!highlightIssue) return
    const timer = window.setTimeout(() => {
      const el = document.getElementById(issueSlug(highlightIssue))
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [highlightIssue])

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) =>
          new Date(a.analyzed_at).getTime() -
          new Date(b.analyzed_at).getTime(),
      ),
    [sessions],
  )

  const latest = sortedSessions[sortedSessions.length - 1]
  const first = sortedSessions[0]
  const currentScore = latest?.overall_score ?? null
  const firstScore = first?.overall_score ?? null
  const totalGain =
    currentScore && firstScore && first.id !== latest?.id
      ? currentScore - firstScore
      : 0

  const allIssues = useMemo(() => getAllIssues(sessions), [sessions])

  const fixedIssues = allIssues.filter(i => i.status === 'fixed')
  const activeIssues = allIssues.filter(
    i => i.status === 'active' || i.status === 'improving',
  )

  const sessionCount = sessions.length
  const sessionsNeededForTrend = Math.max(0, 4 - sessionCount)

  const firstName = player?.name?.split(' ')[0] || 'there'

  function issueHighlightStyle(issue: string, defaultBorder: string) {
    const highlighted =
      Boolean(highlightIssue) &&
      issue.toLowerCase() === highlightIssue!.toLowerCase()
    return {
      background: highlighted ? '#E1F5EE' : 'white',
      border: highlighted ? `1.5px solid ${TEAL}` : `0.5px solid ${defaultBorder}`,
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          fontFamily: 'Arial, sans-serif',
          color: TEXT_MUTED,
          fontSize: 14,
          background: WARM_BG,
        }}
      >
        Loading your progress...
      </div>
    )
  }

  if (sessionCount === 0) {
    return (
      <div
        style={{
          fontFamily: 'Arial, sans-serif',
          color: TEXT,
          maxWidth: 720,
          margin: '0 auto',
          padding: '0 0 40px',
          background: WARM_BG,
          minHeight: '100%',
        }}
      >
        <style>{CSS}</style>

        <div style={{ marginBottom: 20 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: TEXT,
              letterSpacing: '-.5px',
              marginBottom: 4,
            }}
          >
            Progress
          </h1>
          <p style={{ fontSize: 13, color: TEXT_MUTED }}>
            {player?.name || 'Your profile'} · {player?.sport || '—'}
          </p>
        </div>

        <div
          style={{
            background:
              'linear-gradient(135deg, #eaf7f2 0%, #eff3fe 55%, #f5f0fd 100%)',
            borderRadius: 16,
            border: '0.5px solid rgba(29,158,117,.18)',
            padding: '20px 22px',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <ViaBlob size={30} />
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: TEXT,
                  marginBottom: 6,
                }}
              >
                Via · your progress tracker
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: TEXT,
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                Upload your first video and I&apos;ll start tracking everything
                — what&apos;s working, what needs fixing, and how your technique
                improves over time. Here&apos;s exactly what you&apos;ll see:
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 7,
              opacity: 0.5,
              marginBottom: 16,
            }}
          >
            {[
              {
                color: GREEN,
                bg: GREEN_BG,
                border: GREEN_BORDER,
                label: "Issues you've fixed — with exact measurements",
              },
              {
                color: AMBER,
                bg: AMBER_BG,
                border: AMBER_BORDER,
                label: "What you're currently working on",
              },
              {
                color: TEXT_MUTED,
                bg: WARM_BG,
                border: BORDER,
                label: 'Your technique score climbing over time',
              },
            ].map(item => (
              <div
                key={item.label}
                style={{
                  background: item.bg,
                  border: `0.5px solid ${item.border}`,
                  borderRadius: 9,
                  padding: '9px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: item.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 12, color: TEXT_SEC }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => router.push('/player/reels')}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 10,
              background: TEAL,
              border: 'none',
              color: 'white',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            Upload first video →
          </button>
        </div>
      </div>
    )
  }

  if (sessionCount < 4) {
    return (
      <div
        style={{
          fontFamily: 'Arial, sans-serif',
          color: TEXT,
          maxWidth: 720,
          margin: '0 auto',
          padding: '0 0 40px',
          background: WARM_BG,
          minHeight: '100%',
        }}
      >
        <style>{CSS}</style>

        <div style={{ marginBottom: 20 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: TEXT,
              letterSpacing: '-.5px',
              marginBottom: 4,
            }}
          >
            Progress
          </h1>
          <p style={{ fontSize: 13, color: TEXT_MUTED }}>
            {player?.name} · {player?.sport} · {sessionCount} session
            {sessionCount !== 1 ? 's' : ''}
          </p>
        </div>

        <div
          style={{
            background:
              'linear-gradient(135deg, #eaf7f2 0%, #eff3fe 55%, #f5f0fd 100%)',
            borderRadius: 16,
            border: '0.5px solid rgba(29,158,117,.18)',
            padding: '18px 20px',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <ViaBlob size={26} />
            <span style={{ fontSize: 12, fontWeight: 800, color: TEXT }}>
              Via
            </span>
          </div>
          <p
            style={{
              fontSize: 13,
              color: TEXT,
              lineHeight: 1.65,
              margin: '0 0 14px',
            }}
          >
            Good start, {firstName}.
            {sessionsNeededForTrend > 0
              ? ` ${sessionsNeededForTrend} more session${sessionsNeededForTrend !== 1 ? 's' : ''} and I can show you a full trend chart. Here's what I've spotted so far:`
              : " Here's what I've spotted so far:"}
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
            }}
          >
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: i < sessionCount ? TEAL : BORDER,
                  border: `2px solid ${i < sessionCount ? TEAL : BORDER}`,
                  transition: 'background 0.3s',
                }}
              />
            ))}
            <span style={{ fontSize: 11, color: TEXT_MUTED, marginLeft: 4 }}>
              {sessionCount} of 4 sessions
            </span>
          </div>
        </div>

        {activeIssues.length > 0 && (
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
              Issues identified
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {activeIssues.map(item => (
                <div
                  key={item.issue}
                  id={issueSlug(item.issue)}
                  style={{
                    ...issueHighlightStyle(item.issue, RED_BORDER),
                    borderRadius: 12,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: RED_BG,
                      border: `2px solid ${RED_BORDER}`,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: TEXT,
                      }}
                    >
                      {item.issue}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: TEXT_MUTED,
                        marginTop: 1,
                      }}
                    >
                      Flagged {item.count}x · first seen{' '}
                      {format(new Date(item.firstSeen), 'MMM d')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <GlassCard mode="light" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: TEXT,
                marginBottom: 2,
              }}
            >
              {sportEmoji[player?.sport || ''] || '🎾'} Add another session
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>
              {sessionsNeededForTrend} more to unlock full trend charts
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/player/reels')}
            style={{
              padding: '8px 16px',
              borderRadius: 9,
              background: TEAL,
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
        </GlassCard>
      </div>
    )
  }

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

      <PlayerPageVia
        playerId={player?.id}
        playerName={player?.name || undefined}
        pageContext={{
          page: 'player-progress',
          totalGain: totalGain || undefined,
          fixedCount: fixedIssues.length,
          activeIssue: activeIssues[0]?.issue || undefined,
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: TEXT,
              letterSpacing: '-.5px',
              marginBottom: 4,
            }}
          >
            Progress
          </h1>
          <p style={{ fontSize: 13, color: TEXT_MUTED }}>
            {player?.name} · {player?.sport} · {sessionCount} sessions
            {latest && (
              <span style={{ marginLeft: 8 }}>
                <SessionReviewBadge coachVerified={latest.coach_verified} />
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {fixedIssues.length > 0 && (
            <div
              style={{
                padding: '5px 10px',
                borderRadius: 999,
                background: GREEN_BG,
                border: `0.5px solid ${GREEN_BORDER}`,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0F6E56' }}>
                {fixedIssues.length} fixed ✓
              </span>
            </div>
          )}
          {activeIssues.length > 0 && (
            <div
              style={{
                padding: '5px 10px',
                borderRadius: 999,
                background: AMBER_BG,
                border: `0.5px solid ${AMBER_BORDER}`,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: '#854F0B' }}>
                {activeIssues.length} in progress
              </span>
            </div>
          )}
        </div>
      </div>

      {fixedIssues.length > 0 && (
        <div style={{ marginBottom: 16 }}>
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
            Fixed ✓
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {fixedIssues.map(item => (
              <div
                key={item.issue}
                id={issueSlug(item.issue)}
                style={{
                  ...issueHighlightStyle(item.issue, GREEN_BORDER),
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  className="check-pop"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: TEAL,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: TEXT,
                    }}
                  >
                    {item.issue}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: TEXT_MUTED,
                      marginTop: 1,
                    }}
                  >
                    Worked on for{' '}
                    {differenceInDays(
                      new Date(item.lastSeen),
                      new Date(item.firstSeen),
                    )}{' '}
                    days · resolved{' '}
                    {format(new Date(item.lastSeen), 'MMM d')}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: GREEN,
                    fontWeight: 600,
                  }}
                >
                  ✓
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeIssues.length > 0 && (
        <div style={{ marginBottom: 16 }}>
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
            Still working on
          </div>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 7 }}
          >
            {activeIssues.map(item => {
              const isImproving = item.status === 'improving'
              const relatedDrill = drills.find(d =>
                d.title
                  ?.toLowerCase()
                  .includes(item.issue.toLowerCase().split(' ')[0]),
              )
              return (
                <div
                  key={item.issue}
                  id={issueSlug(item.issue)}
                  style={{
                    ...issueHighlightStyle(
                      item.issue,
                      isImproving ? AMBER_BORDER : RED_BORDER,
                    ),
                    borderRadius: 12,
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: relatedDrill ? 8 : 0,
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: isImproving ? AMBER_BG : RED_BG,
                        border: `2px solid ${isImproving ? AMBER_BORDER : RED_BORDER}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: isImproving ? AMBER : RED,
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: TEXT,
                        }}
                      >
                        {item.issue}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: isImproving ? AMBER : RED,
                          marginTop: 1,
                        }}
                      >
                        {isImproving
                          ? 'Improving — keep going'
                          : `Flagged ${item.count}x · still active`}
                      </div>
                    </div>
                    {relatedDrill && (
                      <MarkDrillCompleteButton
                        drillId={relatedDrill.id}
                        completedAt={relatedDrill.completed_at}
                        compact
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
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
          Score over time
        </div>
        <div
          style={{
            background: 'white',
            border: `0.5px solid ${BORDER}`,
            borderRadius: 14,
            padding: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 6,
              height: 72,
              marginBottom: 8,
            }}
          >
            {sortedSessions.map((s, i) => {
              const score = s.overall_score || 0
              const maxScore = Math.max(
                ...sortedSessions.map(x => x.overall_score || 0),
              )
              const heightPct = maxScore > 0 ? (score / maxScore) * 100 : 0
              const isLatest = i === sortedSessions.length - 1
              const opacity = 0.3 + (i / sortedSessions.length) * 0.7

              return (
                <div
                  key={s.id}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      color: isLatest ? TEAL : TEXT_MUTED,
                      fontWeight: isLatest ? 700 : 400,
                    }}
                  >
                    {score}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      background: isLatest
                        ? TEAL
                        : `rgba(29,158,117,${opacity})`,
                      borderRadius: '3px 3px 0 0',
                      height: `${heightPct}%`,
                      boxShadow: isLatest
                        ? '0 0 6px rgba(29,158,117,.3)'
                        : 'none',
                      transition: 'height 0.5s ease',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 8,
                      color: TEXT_MUTED,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {format(new Date(s.analyzed_at), 'MMM d')}
                  </span>
                </div>
              )
            })}
          </div>

          {totalGain > 0 && (
            <div
              style={{
                textAlign: 'center',
                fontSize: 12,
                color: TEAL,
                fontWeight: 600,
              }}
            >
              +{totalGain} pts since you started · still climbing
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          background: WARM_BG,
          border: `0.5px solid ${BORDER}`,
          borderRadius: 14,
          padding: '13px 16px',
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
            {sportEmoji[player?.sport || ''] || '🎾'} Add a new session
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED }}>
            Keep the streak going — upload your next video
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push('/player/reels')}
          style={{
            padding: '8px 16px',
            borderRadius: 9,
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

export default function ProgressPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            maxWidth: 560,
            margin: '0 auto',
            padding: 40,
            fontFamily: 'Arial, sans-serif',
          }}
        />
      }
    >
      <ProgressPageContent />
    </Suspense>
  )
}
