'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { differenceInDays, format } from 'date-fns'
import {
  AlertCircle,
  ArrowRight,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import PulseChat from './PulseChat'

const TEAL = 'hsl(168,62%,36%)'
const TEAL_LIGHT = 'hsl(168,62%,95%)'
const WARM_BG = 'hsl(40,20%,97%)'
const CARD = 'white'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const RED = 'hsl(0,70%,55%)'
const RED_LIGHT = 'hsl(0,70%,95%)'
const AMBER = 'hsl(38,92%,50%)'
const AMBER_LIGHT = 'hsl(38,92%,95%)'
const GREEN = 'hsl(145,60%,40%)'
const GREEN_LIGHT = 'hsl(145,60%,95%)'
const PURPLE = 'hsl(258,70%,55%)'
const PURPLE_LIGHT = 'hsl(258,70%,95%)'

const sportEmoji: Record<string, string> = {
  tennis: '🎾',
  golf: '⛳',
  baseball: '⚾',
  basketball: '🏀',
  pickleball: '🏓',
}

type Player = {
  id: string
  name: string | null
  sport: string | null
  skill_level?: string | null
  age?: number | null
  email?: string | null
}

type AnalysisIssue = {
  area?: string
}

type AnalysisSession = {
  id: string
  player_id: string | null
  analyzed_at: string | null
  sport?: string | null
  overall_score: number | null
  critical_count?: number | null
  full_result?: {
    areas_to_improve?: AnalysisIssue[]
  } | null
  top_issue?: string | null
  overall_rating?: string | null
}

type Lesson = {
  id: string
  player_id: string | null
  starts_at: string | null
  status: string | null
}

type PlayerStatus = 'attention' | 'levelup' | 'ontrack' | 'new'

type PlayerSummary = Player & {
  playerSessions: AnalysisSession[]
  latest: AnalysisSession | undefined
  previous: AnalysisSession | undefined
  first: AnalysisSession | undefined
  daysSince: number
  delta: number | null
  totalGain: number
  consecutiveClean: number
  allIssues: string[]
  sparkline: number[]
  status: PlayerStatus
  sessionCount: number
  latestScore: number | null
  topIssue: string | null
  rating: string | null
  lastAnalyzed: string | null
}

interface Props {
  players: Player[]
  sessions: AnalysisSession[]
  lessons: Lesson[]
  coachEmail: string
}

function playerName(player: Pick<Player, 'name'>) {
  return player.name || 'Unnamed player'
}

function Sparkline({
  data,
  color = TEAL,
  width = 72,
  height = 28,
}: {
  data: number[]
  color?: string
  width?: number
  height?: number
}) {
  if (!data || data.length < 2) {
    return (
      <svg width={width} height={height} aria-hidden="true">
        <line
          x1="4"
          y1={height / 2}
          x2={width - 4}
          y2={height / 2}
          stroke={BORDER}
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      </svg>
    )
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pad = 4
  const points = data
    .map((value, index) => {
      const x = pad + (index / (data.length - 1)) * (width - pad * 2)
      const y = height - pad - ((value - min) / range) * (height - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const [lastX, lastY] = points.split(' ').at(-1)!.split(',')

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="3.5" fill={color} />
    </svg>
  )
}

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = score >= 75 ? GREEN : score >= 55 ? AMBER : RED

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-label={`Score ${score}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={BORDER} strokeWidth="4" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          transform: 'rotate(90deg)',
          transformOrigin: `${size / 2}px ${size / 2}px`,
          fontSize: size < 50 ? 13 : 15,
          fontWeight: 800,
          fontFamily: 'Arial, sans-serif',
          fill: color,
        }}
      >
        {score}
      </text>
    </svg>
  )
}

export default function PulseClient({ players, sessions, coachEmail }: Props) {
  const [brief, setBrief] = useState('')
  const [briefLoading, setBriefLoading] = useState(true)
  const [selectedSport, setSelectedSport] = useState('all')
  const router = useRouter()

  const unlinkedSessions = useMemo(
    () => sessions.filter(session => !session.player_id),
    [sessions],
  )

  const playerSummaries = useMemo<PlayerSummary[]>(() => {
    return players.map(player => {
      const playerSessions = sessions
        .filter(session => session.player_id === player.id)
        .sort(
          (a, b) =>
            new Date(a.analyzed_at || 0).getTime() -
            new Date(b.analyzed_at || 0).getTime(),
        )
      const latest = playerSessions[playerSessions.length - 1]
      const previous = playerSessions[playerSessions.length - 2]
      const first = playerSessions[0]
      const last3 = playerSessions.slice(-3)
      const daysSince = latest?.analyzed_at
        ? differenceInDays(new Date(), new Date(latest.analyzed_at))
        : 999
      const latestScore = typeof latest?.overall_score === 'number' ? latest.overall_score : null
      const previousScore = typeof previous?.overall_score === 'number' ? previous.overall_score : null
      const firstScore = typeof first?.overall_score === 'number' ? first.overall_score : null
      const delta = latestScore !== null && previousScore !== null ? latestScore - previousScore : null
      const totalGain =
        latestScore !== null && firstScore !== null && first?.id !== latest?.id
          ? latestScore - firstScore
          : 0
      const cleanStreak = [...last3].reverse().findIndex(session => (session.critical_count || 0) > 0)
      const allIssues: string[] = []

      playerSessions.slice(-5).forEach(session => {
        if (session.full_result?.areas_to_improve?.length) {
          session.full_result.areas_to_improve.forEach(issue => {
            if (issue.area) allIssues.push(issue.area)
          })
        } else if (session.top_issue) {
          allIssues.push(session.top_issue)
        }
      })

      const consecutiveClean = cleanStreak === -1 ? last3.length : cleanStreak
      const sparkline = playerSessions
        .slice(-6)
        .map(session => session.overall_score)
        .filter((score): score is number => typeof score === 'number')

      let status: PlayerStatus = 'new'
      if (playerSessions.length === 0) status = 'new'
      else if ((delta !== null && delta <= -5) || daysSince >= 14) status = 'attention'
      else if (consecutiveClean >= 3 && (latestScore || 0) >= 75) status = 'levelup'
      else status = 'ontrack'

      return {
        ...player,
        playerSessions,
        latest,
        previous,
        first,
        daysSince,
        delta,
        totalGain,
        consecutiveClean,
        allIssues,
        sparkline,
        status,
        sessionCount: playerSessions.length,
        latestScore,
        topIssue: latest?.top_issue || null,
        rating: latest?.overall_rating || null,
        lastAnalyzed: latest?.analyzed_at || null,
      }
    })
  }, [players, sessions])

  const filtered = useMemo(() => {
    if (selectedSport === 'all') return playerSummaries
    return playerSummaries.filter(player => player.sport === selectedSport)
  }, [playerSummaries, selectedSport])

  const rosterHealth = useMemo(() => {
    const analyzed = playerSummaries.filter(player => player.sessionCount > 0)
    if (analyzed.length === 0) return null
    const avg = Math.round(
      analyzed.reduce((sum, player) => sum + (player.latestScore || 0), 0) / analyzed.length,
    )
    const improving = analyzed.filter(player => player.delta !== null && player.delta > 0).length
    const attention = analyzed.filter(player => player.status === 'attention').length
    return { avg, improving, attention, total: analyzed.length }
  }, [playerSummaries])

  const commonIssues = useMemo(() => {
    const counts: Record<string, { count: number; players: string[] }> = {}

    playerSummaries.forEach(player => {
      const seen = new Set<string>()
      player.allIssues.forEach(issue => {
        const key = issue.toLowerCase().trim()
        if (!key || seen.has(key)) return
        seen.add(key)
        counts[issue] ||= { count: 0, players: [] }
        counts[issue].count += 1
        counts[issue].players.push(playerName(player))
      })
    })

    return Object.entries(counts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([issue, data]) => ({ issue, ...data }))
  }, [playerSummaries])

  const mostImproved = useMemo(() => {
    return [...playerSummaries]
      .filter(player => player.totalGain > 0)
      .sort((a, b) => b.totalGain - a.totalGain)
      .slice(0, 3)
  }, [playerSummaries])

  const actionChips = useMemo(() => {
    const chips: {
      label: string
      color: string
      bg: string
      href: string
      icon: string
    }[] = []

    playerSummaries.forEach(player => {
      if (player.status === 'attention' && player.daysSince >= 14) {
        chips.push({
          label: `${playerName(player)} inactive ${player.daysSince}d`,
          color: AMBER,
          bg: AMBER_LIGHT,
          href: `/dashboard/players/${player.id}`,
          icon: '⏰',
        })
      }
      if (player.status === 'attention' && player.delta !== null && player.delta <= -5) {
        chips.push({
          label: `${playerName(player)} dropped ${player.delta}pts`,
          color: RED,
          bg: RED_LIGHT,
          href: `/dashboard/players/${player.id}`,
          icon: '⚠️',
        })
      }
      if (player.status === 'levelup') {
        chips.push({
          label: `${playerName(player)} ready to level up`,
          color: PURPLE,
          bg: PURPLE_LIGHT,
          href: `/dashboard/players/${player.id}`,
          icon: '⚡',
        })
      }
    })

    if (commonIssues[0] && commonIssues[0].count >= 2) {
      chips.push({
        label: `${commonIssues[0].count} players: ${commonIssues[0].issue}`,
        color: TEAL,
        bg: TEAL_LIGHT,
        href: '/dashboard/analytics',
        icon: '🎯',
      })
    }

    if (unlinkedSessions.length > 0) {
      chips.push({
        label: `${unlinkedSessions.length} unlinked analysis${unlinkedSessions.length !== 1 ? 'es' : ''}`,
        color: TEAL,
        bg: TEAL_LIGHT,
        href: '/dashboard/video',
        icon: '🔗',
      })
    }

    return chips
  }, [commonIssues, playerSummaries, unlinkedSessions.length])

  const rosterContext = useMemo(
    () => ({
      coachEmail,
      totalPlayers: players.length,
      rosterHealth,
      actionChips: actionChips.map(chip => chip.label),
      commonIssues,
      unlinkedSessionCount: unlinkedSessions.length,
      unlinkedSports: [...new Set(unlinkedSessions.map(session => session.sport))],
      recentUnlinkedScores: unlinkedSessions.slice(0, 3).map(session => ({
        sport: session.sport,
        score: session.overall_score,
        date: session.analyzed_at,
      })),
      mostImproved: mostImproved.map(player => ({
        name: playerName(player),
        sport: player.sport,
        totalGain: player.totalGain,
        firstScore: player.first?.overall_score,
        latestScore: player.latestScore,
      })),
      players: playerSummaries.map(player => ({
        id: player.id,
        name: playerName(player),
        sport: player.sport,
        status: player.status,
        latestScore: player.latestScore,
        delta: player.delta,
        daysSince: player.daysSince,
        topIssue: player.topIssue,
        sessions: player.sessionCount,
      })),
    }),
    [
      actionChips,
      coachEmail,
      commonIssues,
      mostImproved,
      playerSummaries,
      players.length,
      rosterHealth,
      unlinkedSessions,
    ],
  )

  useEffect(() => {
    let cancelled = false

    async function generateBrief() {
      if (playerSummaries.length === 0 && unlinkedSessions.length === 0) {
        setBrief('Add players and run analyses to get your coaching brief.')
        setBriefLoading(false)
        return
      }

      try {
        const response = await fetch('/api/coaching-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context: rosterContext }),
        })
        const data = (await response.json()) as { brief?: string }
        if (!cancelled) setBrief(data.brief || '')
      } catch {
        if (!cancelled) {
          setBrief(
            `${actionChips.length} item${actionChips.length !== 1 ? 's' : ''} need your attention today.`,
          )
        }
      } finally {
        if (!cancelled) setBriefLoading(false)
      }
    }

    generateBrief()
    return () => {
      cancelled = true
    }
  }, [actionChips.length, playerSummaries.length, rosterContext, unlinkedSessions.length])

  const sports = [...new Set(players.map(player => player.sport).filter((sport): sport is string => Boolean(sport)))]
  const statusConfig = {
    attention: { label: 'Needs attention', color: RED, bg: RED_LIGHT },
    levelup: { label: 'Ready to level up', color: PURPLE, bg: PURPLE_LIGHT },
    ontrack: { label: 'On track', color: GREEN, bg: GREEN_LIGHT },
    new: { label: 'Not analyzed', color: TEXT_MUTED, bg: WARM_BG },
  }

  return (
    <div style={{ color: TEXT, fontFamily: 'Arial, sans-serif', maxWidth: 1000 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Pulse</h1>
          <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 4 }}>
            {format(new Date(), 'EEEE, MMMM d')} · {players.length} players
            {rosterHealth && (
              <>
                {' '}· Avg score <strong style={{ color: TEAL }}>{rosterHealth.avg}</strong>
              </>
            )}
          </p>
        </div>

        {rosterHealth && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                background: TEAL_LIGHT,
                border: '1px solid hsl(168,62%,70%)',
                fontSize: 12,
                fontWeight: 600,
                color: TEAL,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Users size={13} />
              {rosterHealth.total} analyzed
            </div>
            {rosterHealth.improving > 0 && (
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: 10,
                  background: GREEN_LIGHT,
                  border: '1px solid hsl(145,60%,70%)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: GREEN,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <TrendingUp size={13} />
                {rosterHealth.improving} improving
              </div>
            )}
            {rosterHealth.attention > 0 && (
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: 10,
                  background: RED_LIGHT,
                  border: '1px solid hsl(0,70%,75%)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: RED,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <AlertCircle size={13} />
                {rosterHealth.attention} need attention
              </div>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          background: TEAL,
          borderRadius: 16,
          padding: '16px 20px',
          marginBottom: 16,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            flexShrink: 0,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Zap size={16} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.65)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: '0 0 5px',
            }}
          >
            Coaching brief
          </p>
          {briefLoading ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 1, 2].map(index => (
                <div
                  key={index}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.5)',
                    animation: `pulse 1.2s ease-in-out ${index * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: 'white', margin: 0, lineHeight: 1.6 }}>{brief}</p>
          )}
        </div>
      </div>

      {actionChips.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
            marginBottom: 20,
            scrollbarWidth: 'none',
          }}
        >
          {actionChips.map((chip, index) => (
            <button
              key={`${chip.label}-${index}`}
              onClick={() => router.push(chip.href)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 999,
                border: `1px solid ${chip.color}`,
                background: chip.bg,
                color: chip.color,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'Arial, sans-serif',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}
              type="button"
            >
              <span>{chip.icon}</span>
              {chip.label}
              <ChevronRight size={12} />
            </button>
          ))}
        </div>
      )}

      {sports.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {['all', ...sports].map(sport => (
            <button
              key={sport}
              onClick={() => setSelectedSport(sport)}
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                border: `1px solid ${selectedSport === sport ? TEAL : BORDER}`,
                background: selectedSport === sport ? TEAL_LIGHT : CARD,
                color: selectedSport === sport ? TEAL : TEXT_SEC,
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif',
              }}
              type="button"
            >
              {sport === 'all' ? 'All sports' : `${sportEmoji[sport] || ''} ${sport}`}
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {filtered
          .sort((a, b) => {
            const order: Record<PlayerStatus, number> = { attention: 0, levelup: 1, ontrack: 2, new: 3 }
            return order[a.status] - order[b.status]
          })
          .map(player => {
            const config = statusConfig[player.status]
            const trendColor =
              player.delta === null
                ? TEXT_MUTED
                : player.delta > 0
                  ? GREEN
                  : player.delta < 0
                    ? RED
                    : TEXT_MUTED
            return (
              <div
                key={player.id}
                onClick={() => router.push(`/dashboard/players/${player.id}`)}
                style={{
                  background: CARD,
                  border: `1px solid ${
                    player.status === 'attention'
                      ? 'hsl(0,70%,80%)'
                      : player.status === 'levelup'
                        ? 'hsl(258,70%,75%)'
                        : BORDER
                  }`,
                  borderRadius: 16,
                  padding: 16,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={event => {
                  event.currentTarget.style.transform = 'translateY(-2px)'
                  event.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
                }}
                onMouseLeave={event => {
                  event.currentTarget.style.transform = 'translateY(0)'
                  event.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: config.color,
                    borderRadius: '16px 16px 0 0',
                    opacity: player.status === 'new' ? 0 : 1,
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: config.bg,
                        color: config.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 15,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {playerName(player).charAt(0)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>
                        {playerName(player)}
                      </div>
                      <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                        {player.sport ? `${sportEmoji[player.sport] || ''} ${player.sport}` : 'Sport not set'}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 7px',
                      borderRadius: 999,
                      fontWeight: 700,
                      background: config.bg,
                      color: config.color,
                      border: `1px solid ${config.color}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {player.status === 'attention'
                      ? '⚠️'
                      : player.status === 'levelup'
                        ? '⚡'
                        : player.status === 'ontrack'
                          ? '✓'
                          : '+'}{' '}
                    {config.label}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  {player.latestScore ? (
                    <ScoreRing score={player.latestScore} size={52} />
                  ) : (
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        background: WARM_BG,
                        border: `2px dashed ${BORDER}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontSize: 18 }}>—</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <Sparkline data={player.sparkline} color={trendColor} />
                    {player.delta !== null && (
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: trendColor,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        {player.delta > 0 ? (
                          <TrendingUp size={12} />
                        ) : player.delta < 0 ? (
                          <TrendingDown size={12} />
                        ) : null}
                        {player.delta > 0 ? '+' : ''}
                        {player.delta} pts
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    borderTop: `1px solid ${BORDER}`,
                    paddingTop: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  {player.topIssue ? (
                    <div
                      style={{
                        fontSize: 11,
                        color: TEXT_SEC,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: RED,
                          flexShrink: 0,
                          display: 'inline-block',
                        }}
                      />
                      {player.topIssue}
                    </div>
                  ) : player.sessionCount === 0 ? (
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>No analyses yet</div>
                  ) : null}

                  <div
                    style={{
                      fontSize: 11,
                      color: TEXT_MUTED,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      {player.sessionCount} session{player.sessionCount !== 1 ? 's' : ''}
                    </span>
                    {player.daysSince < 999 && (
                      <span style={{ color: player.daysSince >= 14 ? AMBER : TEXT_MUTED }}>
                        {player.daysSince === 0 ? 'Today' : `${player.daysSince}d ago`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
      </div>

      {unlinkedSessions.length > 0 && (
        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEAL }}>
              {unlinkedSessions.length} unlinked analysis{unlinkedSessions.length !== 1 ? 'es' : ''}
            </div>
            <div style={{ fontSize: 12, color: TEXT_SEC, marginTop: 2 }}>
              These analyses are included in your brief and chat, but not in player cards yet.
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/video')}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              background: TEAL,
              color: 'white',
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Arial, sans-serif',
            }}
            type="button"
          >
            View videos →
          </button>
        </div>
      )}

      {(commonIssues.length > 0 || mostImproved.length > 0) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}
        >
          {commonIssues.length > 0 && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                  gap: 12,
                }}
              >
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: TEXT }}>
                    Common issues
                  </h3>
                  <p style={{ fontSize: 11, color: TEXT_MUTED, margin: '2px 0 0' }}>
                    Shared across your roster
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/dashboard/drills?focus=${encodeURIComponent(commonIssues[0].issue)}`)}
                  style={{
                    fontSize: 11,
                    padding: '6px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: TEAL,
                    color: 'white',
                    border: 'none',
                    fontWeight: 600,
                    fontFamily: 'Arial, sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  type="button"
                >
                  Build session
                  <ArrowRight size={11} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {commonIssues.map(({ issue, count, players: issuePlayers }, index) => (
                  <div key={issue}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: TEXT,
                          fontWeight: index === 0 ? 600 : 400,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        {index === 0 && (
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: RED,
                              display: 'inline-block',
                            }}
                          />
                        )}
                        {issue}
                      </span>
                      <span style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600 }}>
                        {count}/{players.length}
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: BORDER, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: 5,
                          borderRadius: 3,
                          background: index === 0 ? RED : index === 1 ? AMBER : TEAL,
                          width: `${players.length ? (count / players.length) * 100 : 0}%`,
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>
                      {issuePlayers.slice(0, 2).join(', ')}
                      {issuePlayers.length > 2 ? ` +${issuePlayers.length - 2}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mostImproved.length > 0 && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px', color: TEXT }}>
                Most improved
              </h3>
              <p style={{ fontSize: 11, color: TEXT_MUTED, margin: '0 0 16px' }}>All time score gains</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mostImproved.map((player, index) => (
                  <div
                    key={player.id}
                    onClick={() => router.push(`/dashboard/players/${player.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: index === 0 ? AMBER_LIGHT : WARM_BG,
                      border: `1px solid ${index === 0 ? AMBER : BORDER}`,
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: index === 0 ? AMBER : TEAL_LIGHT,
                        color: index === 0 ? 'white' : TEAL,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: index === 0 ? 14 : 12,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {index === 0 ? '🏆' : playerName(player).charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>
                        {playerName(player)}
                      </div>
                      <div style={{ fontSize: 11, color: TEXT_SEC }}>
                        {player.first?.overall_score} → {player.latestScore}
                      </div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: index === 0 ? AMBER : GREEN }}>
                      +{player.totalGain}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {players.length === 0 && (
        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            padding: 48,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>
            No players yet
          </h3>
          <p style={{ fontSize: 13, color: TEXT_SEC, margin: '0 0 20px' }}>
            Add players to your roster to see Pulse insights
          </p>
          <button
            onClick={() => router.push('/dashboard/players')}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              background: TEAL,
              color: 'white',
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Arial, sans-serif',
            }}
            type="button"
          >
            Add your first player →
          </button>
        </div>
      )}

      <PulseChat rosterContext={rosterContext} />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
