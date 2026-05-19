'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { differenceInDays, format } from 'date-fns'
import { Send, X } from 'lucide-react'
import ViaBlob from '@/components/ViaBlob'

const TEAL = 'hsl(168,62%,36%)'
const TEAL_DARK = 'hsl(168,62%,28%)'
const BORDER = 'hsl(30,10%,88%)'
const BORDER_LIGHT = 'hsl(30,10%,93%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'
const RED = 'hsl(0,70%,55%)'
const RED_BORDER = 'hsl(0,70%,78%)'
const AMBER = 'hsl(38,92%,50%)'
const GREEN = 'hsl(145,60%,40%)'
const PURPLE = 'hsl(258,70%,55%)'

const sportEmoji: Record<string, string> = {
  tennis: '🎾',
  golf: '⛳',
  baseball: '⚾',
  basketball: '🏀',
  pickleball: '🏓',
}

const LOADING_DOT_CSS = `
  @keyframes pulseDot {
    0%, 100% { opacity: 0.35; transform: scale(1); }
    50%       { opacity: 1; transform: scale(1.15); }
  }
`

interface Props {
  players: Array<Record<string, unknown>>
  sessions: Array<Record<string, unknown>>
  lessons: Array<Record<string, unknown>>
  coachEmail: string
}

export default function PulseClient({
  players,
  sessions,
}: Props) {
  const [brief, setBrief] = useState('')
  const [briefLoading, setBriefLoading] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const playerSummaries = useMemo(() => {
    return players.map(player => {
      const ps = sessions
        .filter(s => s.player_id === player.id)
        .sort(
          (a, b) =>
            new Date(String(a.analyzed_at)).getTime() -
            new Date(String(b.analyzed_at)).getTime(),
        )
      const latest = ps[ps.length - 1]
      const previous = ps[ps.length - 2]
      const first = ps[0]
      const last3 = ps.slice(-3)

      const daysSince = latest
        ? differenceInDays(new Date(), new Date(String(latest.analyzed_at)))
        : 999

      const latestScore =
        typeof latest?.overall_score === 'number' ? latest.overall_score : null
      const previousScore =
        typeof previous?.overall_score === 'number'
          ? previous.overall_score
          : null

      const delta =
        latestScore !== null && previousScore !== null
          ? latestScore - previousScore
          : null

      const firstScore =
        typeof first?.overall_score === 'number' ? first.overall_score : null
      const totalGain =
        latestScore !== null && firstScore !== null && first?.id !== latest?.id
          ? latestScore - firstScore
          : 0

      const cleanStreak = [...last3].reverse().findIndex(s => {
        const critical = s.critical_count
        return typeof critical === 'number' && critical > 0
      })
      const consecutiveClean = cleanStreak === -1 ? last3.length : cleanStreak

      const allIssues: string[] = []
      ps.slice(-5).forEach(s => {
        const fullResult = s.full_result as
          | { areas_to_improve?: Array<{ area?: string }> }
          | undefined
        if (fullResult?.areas_to_improve) {
          fullResult.areas_to_improve.forEach(i => {
            if (i.area) allIssues.push(i.area)
          })
        } else if (typeof s.top_issue === 'string' && s.top_issue) {
          allIssues.push(s.top_issue)
        }
      })

      let status: 'attention' | 'levelup' | 'ontrack' | 'new' = 'new'
      if (ps.length === 0) status = 'new'
      else if ((delta !== null && delta <= -5) || daysSince >= 14)
        status = 'attention'
      else if (consecutiveClean >= 3 && (latestScore || 0) >= 75)
        status = 'levelup'
      else status = 'ontrack'

      return {
        ...player,
        id: String(player.id),
        name: String(player.name || 'Player'),
        sport: String(player.sport || 'tennis'),
        ps,
        latest,
        daysSince,
        delta,
        totalGain,
        consecutiveClean,
        allIssues,
        status,
        sessionCount: ps.length,
        latestScore,
        topIssue:
          typeof latest?.top_issue === 'string' ? latest.top_issue : null,
        lastAnalyzed:
          typeof latest?.analyzed_at === 'string' ? latest.analyzed_at : null,
      }
    })
  }, [players, sessions])

  const commonIssues = useMemo(() => {
    const counts: Record<string, { count: number; players: string[] }> = {}
    playerSummaries.forEach(p => {
      const seen = new Set<string>()
      p.allIssues.forEach((issue: string) => {
        const key = issue.toLowerCase().trim()
        if (!seen.has(key)) {
          seen.add(key)
          if (!counts[issue]) counts[issue] = { count: 0, players: [] }
          counts[issue].count++
          counts[issue].players.push(p.name)
        }
      })
    })
    return Object.entries(counts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([issue, d]) => ({ issue, ...d }))
  }, [playerSummaries])

  const tasks = useMemo(() => {
    const t: {
      id: string
      color: string
      title: string
      why: string
      action: string
      href?: string
      onClick?: () => void
    }[] = []

    const attention = playerSummaries.filter(p => p.status === 'attention')
    attention.slice(0, 2).forEach(p => {
      const reason =
        p.delta !== null && p.delta <= -5
          ? `Score dropped ${Math.abs(p.delta)}pts`
          : `${p.daysSince} days no analysis`
      t.push({
        id: `attn-${p.id}`,
        color: RED,
        title: `Schedule ${p.name.split(' ')[0]}`,
        why: `${reason} · ${p.topIssue || p.sport}`,
        action: 'Schedule →',
        href: '/dashboard/schedule',
      })
    })

    if (commonIssues[0] && commonIssues[0].count >= 2) {
      t.push({
        id: 'group-drill',
        color: TEAL,
        title: `Group ${commonIssues[0].issue} drill`,
        why: `${commonIssues[0].players.slice(0, 3).join(', ')} · one session fixes all`,
        action: 'Build →',
        onClick: () =>
          router.push(
            `/dashboard/drills?focus=${encodeURIComponent(commonIssues[0].issue)}`,
          ),
      })
    }

    const inactive = playerSummaries.filter(
      p => p.daysSince >= 14 && p.status !== 'attention',
    )
    if (inactive.length > 0) {
      t.push({
        id: 'inactive',
        color: AMBER,
        title: `Remind ${inactive[0].name.split(' ')[0]}${inactive.length > 1 ? ` + ${inactive.length - 1} more` : ''}`,
        why: `${inactive[0].daysSince} days no video upload`,
        action: 'Send →',
        href: `/dashboard/players/${inactive[0].id}`,
      })
    }

    const levelup = playerSummaries.filter(p => p.status === 'levelup')
    if (levelup.length > 0) {
      const names = levelup
        .slice(0, 2)
        .map(p => p.name.split(' ')[0])
        .join(' + ')
      t.push({
        id: 'levelup',
        color: PURPLE,
        title: `Level up ${names}`,
        why: `${levelup[0].consecutiveClean} clean sessions — ready for harder work`,
        action: 'Plan →',
        onClick: () => router.push(`/dashboard/players/${levelup[0].id}`),
      })
    }

    return t
  }, [playerSummaries, commonIssues, router])

  const rosterContext = useMemo(
    () => ({
      totalPlayers: players.length,
      analyzed: playerSummaries.filter(p => p.sessionCount > 0).length,
      avgScore:
        playerSummaries.length > 0
          ? Math.round(
              playerSummaries
                .filter(p => p.latestScore)
                .reduce((a, p) => a + (p.latestScore || 0), 0) /
                Math.max(
                  playerSummaries.filter(p => p.latestScore).length,
                  1,
                ),
            )
          : 0,
      attention: playerSummaries
        .filter(p => p.status === 'attention')
        .map(p => ({
          name: p.name,
          score: p.latestScore,
          delta: p.delta,
          daysSince: p.daysSince,
          topIssue: p.topIssue,
        })),
      levelup: playerSummaries
        .filter(p => p.status === 'levelup')
        .map(p => ({ name: p.name, score: p.latestScore })),
      commonIssues,
      players: playerSummaries.map(p => ({
        name: p.name,
        sport: p.sport,
        status: p.status,
        score: p.latestScore,
        delta: p.delta,
        topIssue: p.topIssue,
        daysSince: p.daysSince,
      })),
    }),
    [playerSummaries, commonIssues, players.length],
  )

  const scoredPlayers = playerSummaries
    .filter(p => p.latestScore !== null)
    .sort((a, b) => (a.latestScore || 0) - (b.latestScore || 0))

  const minScore = scoredPlayers[0]?.latestScore || 0
  const maxScore =
    scoredPlayers[scoredPlayers.length - 1]?.latestScore || 100
  const scoreRange = Math.max(maxScore - minScore, 1)

  function scoreToPercent(score: number) {
    return Math.round(((score - minScore) / scoreRange) * 90) + 5
  }

  const weeklyImproving = playerSummaries.filter(
    p => p.delta !== null && p.delta > 0,
  ).length
  const weeklyAttention = playerSummaries.filter(
    p => p.status === 'attention',
  ).length
  const avgDelta =
    playerSummaries
      .filter(p => p.delta !== null)
      .reduce((a, p) => a + (p.delta || 0), 0) /
    Math.max(playerSummaries.filter(p => p.delta !== null).length, 1)

  useEffect(() => {
    async function gen() {
      if (playerSummaries.length === 0) {
        setBrief('Add players and capture reels to get your coaching brief.')
        setBriefLoading(false)
        return
      }
      try {
        const res = await fetch('/api/coaching-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context: rosterContext }),
        })
        const data = await res.json()
        setBrief(data.brief || '')
      } catch {
        setBrief(
          tasks.length > 0
            ? `${tasks[0].title} is your top priority today.`
            : 'Your roster is looking good today.',
        )
      }
      setBriefLoading(false)
    }
    void gen()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- brief on mount only
  }, [])

  async function sendChat() {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    setChatInput('')
    setDrawerOpen(true)
    const newMessages = [
      ...chatMessages,
      { role: 'user' as const, content: msg },
    ]
    setChatMessages(newMessages)
    setChatLoading(true)
    try {
      const res = await fetch('/api/pulse-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          rosterContext,
        }),
      })
      const data = await res.json()
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.response || '' },
      ])
    } catch {
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Something went wrong. Try again.',
        },
      ])
    }
    setChatLoading(false)
  }

  useEffect(() => {
    if (!drawerOpen) return
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading, drawerOpen])

  const sorted = [...playerSummaries].sort((a, b) => {
    const order = { attention: 0, levelup: 1, ontrack: 2, new: 3 }
    return order[a.status] - order[b.status]
  })

  return (
    <div
      style={{
        color: TEXT,
        fontFamily: 'Arial, sans-serif',
        maxWidth: 1100,
      }}
    >
      <style>{LOADING_DOT_CSS}</style>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              margin: 0,
              letterSpacing: '-0.5px',
            }}
          >
            Pulse
          </h1>
          <span style={{ fontSize: 12, color: TEXT_MUTED }}>
            {format(new Date(), 'EEE MMM d')} · {players.length} players
          </span>
        </div>
        {rosterContext.avgScore > 0 && (
          <span style={{ fontSize: 13, color: TEXT_SEC }}>
            Roster avg{' '}
            <strong style={{ color: TEAL, fontSize: 16 }}>
              {rosterContext.avgScore}
            </strong>
            {avgDelta !== 0 && (
              <span
                style={{
                  fontSize: 12,
                  color: avgDelta > 0 ? GREEN : RED,
                  marginLeft: 5,
                }}
              >
                {avgDelta > 0 ? '↑' : '↓'}
                {Math.abs(Math.round(avgDelta))} this week
              </span>
            )}
          </span>
        )}
      </div>

      <div
        style={{
          background:
            'linear-gradient(135deg, #eaf7f2 0%, #eff3fe 55%, #f4effd 100%)',
          borderRadius: 16,
          border: '0.5px solid rgba(29,158,117,.18)',
          padding: '18px 20px',
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16,
          }}
        >
          <ViaBlob size={36} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: TEXT,
                }}
              >
                Via
              </span>
              <span
                style={{
                  fontSize: 10,
                  background: 'rgba(29,158,117,.12)',
                  color: TEAL_DARK,
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontWeight: 600,
                  border: '0.5px solid rgba(29,158,117,.2)',
                }}
              >
                AI Coaching Agent
              </span>
            </div>

            {briefLoading ? (
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: TEAL,
                      opacity: 0.5,
                      animation: `pulseDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <p
                style={{
                  fontSize: 13,
                  color: '#1a1a1a',
                  lineHeight: 1.65,
                  margin: '0 0 12px',
                  maxWidth: 620,
                }}
              >
                {brief}
              </p>
            )}

            <div
              style={{
                display: 'flex',
                gap: 7,
                alignItems: 'center',
                background: 'rgba(255,255,255,.75)',
                border: '0.5px solid rgba(29,158,117,.22)',
                borderRadius: 10,
                padding: '8px 12px',
                maxWidth: 480,
              }}
            >
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void sendChat()
                  }
                }}
                placeholder="Ask Via about your roster..."
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'none',
                  fontSize: 12,
                  color: TEXT,
                  fontFamily: 'Arial, sans-serif',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => void sendChat()}
                disabled={!chatInput.trim() || chatLoading}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  background: chatInput.trim() ? TEAL : '#ccc',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: chatInput.trim() ? 'pointer' : 'default',
                  flexShrink: 0,
                  transition: 'background 0.15s',
                }}
              >
                <Send size={11} color="white" />
              </button>
            </div>


          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.15fr .85fr',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <div>
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
            Do today
          </div>

          {tasks.length === 0 ? (
            <div
              style={{
                background: 'white',
                border: `0.5px solid ${BORDER}`,
                borderRadius: 12,
                padding: '20px 16px',
                textAlign: 'center',
                color: TEXT_MUTED,
                fontSize: 13,
              }}
            >
              No urgent tasks — your roster is in good shape!
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
              }}
            >
              {tasks.map(task => {
                const isRed = task.color === RED
                const isGreen = task.color === TEAL
                return (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 11,
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: isRed ? '#fff8f8' : 'white',
                      border: `0.5px solid ${isRed ? RED_BORDER : BORDER}`,
                      boxShadow: '0 1px 4px rgba(0,0,0,.04)',
                    }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: task.color,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: TEXT,
                          marginBottom: 2,
                        }}
                      >
                        {task.title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: isRed ? RED : TEXT_MUTED,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {task.why}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (task.onClick) task.onClick()
                        else if (task.href) router.push(task.href)
                      }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: isRed ? RED : isGreen ? TEAL : 'white',
                        color: isRed || isGreen ? 'white' : '#555',
                        borderColor: BORDER,
                        borderWidth: isRed || isGreen ? 0 : 0.5,
                        borderStyle: 'solid',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'Arial, sans-serif',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {task.action}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
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
            Roster
          </div>

          {scoredPlayers.length > 1 && (
            <div
              style={{
                background: WARM_BG,
                borderRadius: 10,
                padding: '9px 12px',
                marginBottom: 8,
                border: `0.5px solid ${BORDER}`,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  height: 6,
                  background: BORDER,
                  borderRadius: 3,
                  marginBottom: 6,
                }}
              >
                {scoredPlayers.map(p => {
                  const pct = scoreToPercent(p.latestScore || 0)
                  const dotColor =
                    p.status === 'attention'
                      ? RED
                      : p.status === 'levelup'
                        ? PURPLE
                        : TEAL
                  return (
                    <div
                      key={p.id}
                      title={`${p.name}: ${p.latestScore}`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter')
                          router.push(`/dashboard/players/${p.id}`)
                      }}
                      style={{
                        position: 'absolute',
                        top: -3,
                        left: `${pct}%`,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: dotColor,
                        border: '2px solid white',
                        transform: 'translateX(-50%)',
                        cursor: 'pointer',
                      }}
                      onClick={() =>
                        router.push(`/dashboard/players/${p.id}`)
                      }
                    />
                  )
                })}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: 9, color: RED }}>{minScore}</span>
                <span style={{ fontSize: 9, color: TEAL, fontWeight: 700 }}>
                  avg {rosterContext.avgScore}
                </span>
                <span style={{ fontSize: 9, color: TEAL }}>{maxScore}</span>
              </div>
            </div>
          )}

          <div
            style={{
              background: 'white',
              borderRadius: 12,
              border: `0.5px solid ${BORDER}`,
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            {sorted.slice(0, 6).map((p, i) => {
              const scoreColor =
                p.status === 'attention'
                  ? RED
                  : p.status === 'levelup'
                    ? PURPLE
                    : TEAL
              const dotColor =
                p.status === 'attention'
                  ? RED
                  : p.status === 'levelup'
                    ? PURPLE
                    : p.status === 'ontrack'
                      ? TEAL
                      : '#ccc'

              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter')
                      router.push(`/dashboard/players/${p.id}`)
                  }}
                  onClick={() => router.push(`/dashboard/players/${p.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '9px 13px',
                    borderBottom:
                      i < Math.min(sorted.length, 6) - 1
                        ? `0.5px solid ${BORDER_LIGHT}`
                        : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = WARM_BG
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: dotColor,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: TEXT,
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.name.split(' ')[0]}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: TEXT_MUTED,
                      flex: 1.6,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.topIssue ||
                      (p.sessionCount === 0
                        ? 'Not analyzed'
                        : `${sportEmoji[p.sport] || ''} ${p.sport}`)}
                  </span>
                  {p.latestScore ? (
                    <>
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: scoreColor,
                          flexShrink: 0,
                        }}
                      >
                        {p.latestScore}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color:
                            p.delta && p.delta > 0
                              ? GREEN
                              : p.delta && p.delta < 0
                                ? RED
                                : TEXT_MUTED,
                          width: 24,
                          textAlign: 'right',
                          flexShrink: 0,
                        }}
                      >
                        {p.delta !== null && p.delta !== 0
                          ? `${p.delta > 0 ? '↑' : '↓'}${Math.abs(p.delta)}`
                          : '—'}
                      </span>
                    </>
                  ) : (
                    <span
                      style={{
                        fontSize: 12,
                        color: TEXT_MUTED,
                        flexShrink: 0,
                      }}
                    >
                      —
                    </span>
                  )}
                </div>
              )
            })}

            {sorted.length > 6 && (
              <div
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter') router.push('/dashboard/players')
                }}
                onClick={() => router.push('/dashboard/players')}
                style={{
                  padding: '8px 13px',
                  fontSize: 11,
                  color: TEXT_MUTED,
                  opacity: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#ccc',
                    flexShrink: 0,
                  }}
                />
                +{sorted.length - 6} more · tap to see all
              </div>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 6,
            }}
          >
            {[
              {
                value:
                  avgDelta > 0
                    ? `+${Math.round(avgDelta)}`
                    : Math.round(avgDelta).toString(),
                label: 'avg pts',
                color:
                  avgDelta > 0 ? GREEN : avgDelta < 0 ? RED : TEXT_MUTED,
              },
              {
                value: weeklyImproving.toString(),
                label: 'improving',
                color: GREEN,
              },
              {
                value: weeklyAttention.toString(),
                label: 'need help',
                color: weeklyAttention > 0 ? RED : TEXT_MUTED,
              },
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  background: 'white',
                  borderRadius: 9,
                  border: `0.5px solid ${BORDER}`,
                  padding: '8px 0',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: stat.color,
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ fontSize: 9, color: TEXT_MUTED }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {drawerOpen && (
        <>
          <div
            role="presentation"
            onClick={() => setDrawerOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.2)',
              zIndex: 9998,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: 360,
              height: '100vh',
              background: 'white',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: `0.5px solid ${BORDER}`,
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>
                  Chat with Via
                </div>
                <div style={{ fontSize: 11, color: TEXT_SEC }}>
                  Roster assistant
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close chat"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: `0.5px solid ${BORDER}`,
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} color={TEXT_SEC} />
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent:
                      m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '88%',
                      padding: '10px 12px',
                      borderRadius:
                        m.role === 'user'
                          ? '12px 12px 4px 12px'
                          : '12px 12px 12px 4px',
                      background: m.role === 'user' ? TEAL : WARM_BG,
                      color: m.role === 'user' ? 'white' : TEXT,
                      fontSize: 13,
                      lineHeight: 1.55,
                      border:
                        m.role === 'assistant'
                          ? `0.5px solid ${BORDER}`
                          : 'none',
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div
                  style={{
                    display: 'flex',
                    gap: 5,
                    padding: '8px 12px',
                    background: WARM_BG,
                    borderRadius: 12,
                    width: 'fit-content',
                    border: `0.5px solid ${BORDER}`,
                  }}
                >
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: TEAL,
                        opacity: 0.5,
                        animation: `pulseDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
