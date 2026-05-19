'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getLinkedPlayerRowForUser } from '@/lib/linked-player'
import { differenceInDays, format } from 'date-fns'
import { Send } from 'lucide-react'
import ViaBlob from '@/components/ViaBlob'
import { PLAYER_VISIBLE_SESSIONS_FILTER } from '@/lib/analysis-sessions'

const CSS = `
  @keyframes pulseDot {
    0%, 100% { opacity: 0.35; transform: scale(1); }
    50%       { opacity: 1; transform: scale(1.15); }
  }
  @media (max-width: 480px) {
    .metrics-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .bottom-grid { grid-template-columns: 1fr !important; }
  }
`

const TEAL = 'hsl(168,62%,36%)'
const TEAL_DARK = 'hsl(168,62%,28%)'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'
const RED = '#DC2626'
const AMBER = '#D97706'
const PURPLE = '#7C3AED'
const GREEN = '#16A34A'

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

export default function PlayerHome() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [player, setPlayer] = useState<{
    id: string
    name: string | null
    sport: string | null
    skill_level?: string | null
  } | null>(null)
  const [sessions, setSessions] = useState<Array<Record<string, unknown>>>([])
  const [drills, setDrills] = useState<Array<Record<string, unknown>>>([])
  const [lessons, setLessons] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)

  const [brief, setBrief] = useState('')
  const [briefLoading, setBriefLoading] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([])
  const [showChat, setShowChat] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const playerData = await getLinkedPlayerRowForUser(supabase, user.id)
      if (!playerData?.id) {
        setLoading(false)
        return
      }

      setPlayer({
        id: playerData.id,
        name: playerData.name,
        sport: playerData.sport,
        skill_level: playerData.skill_level,
      })

      const playerId = playerData.id

      const { data: sessionRows } = await supabase
        .from('analysis_sessions')
        .select('*')
        .eq('player_id', playerId)
        .or(PLAYER_VISIBLE_SESSIONS_FILTER)
        .order('analyzed_at', { ascending: true })

      setSessions(sessionRows || [])

      const { data: drillRows } = await supabase
        .from('drills')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(3)

      setDrills(drillRows || [])

      const { data: lessonRows } = await supabase
        .from('lessons')
        .select('*')
        .eq('player_id', playerId)
        .eq('status', 'scheduled')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(2)

      setLessons(lessonRows || [])
      setLoading(false)
    }
    void load()
  }, [router, supabase])

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) =>
          new Date(String(a.analyzed_at)).getTime() -
          new Date(String(b.analyzed_at)).getTime(),
      ),
    [sessions],
  )

  const latest = sortedSessions[sortedSessions.length - 1]
  const previous = sortedSessions[sortedSessions.length - 2]
  const first = sortedSessions[0]

  const currentScore =
    typeof latest?.overall_score === 'number' ? latest.overall_score : null
  const delta =
    currentScore !== null &&
    previous &&
    typeof previous.overall_score === 'number'
      ? currentScore - previous.overall_score
      : null
  const totalGain =
    latest &&
    first &&
    first.id !== latest.id &&
    typeof latest.overall_score === 'number' &&
    typeof first.overall_score === 'number'
      ? latest.overall_score - first.overall_score
      : 0

  const poseRaw = latest?.pose_measurements
  const pose: PoseMeasurement[] | null = Array.isArray(poseRaw)
    ? (poseRaw as PoseMeasurement[])
    : poseRaw &&
        typeof poseRaw === 'object' &&
        Array.isArray((poseRaw as { measurements?: PoseMeasurement[] }).measurements)
      ? (poseRaw as { measurements: PoseMeasurement[] }).measurements
      : null

  const firstName = player?.name?.split(' ')[0] || 'there'

  const nextLesson = lessons[0]
  const nextLessonDate =
    nextLesson && typeof nextLesson.starts_at === 'string'
      ? new Date(nextLesson.starts_at)
      : null

  const upcomingDrill = drills[0]

  const last3 = sortedSessions.slice(-3)
  const cleanStreak = [...last3].reverse().findIndex(s => {
    const critical = s.critical_count
    return typeof critical === 'number' && critical > 0
  })
  const consecutiveClean = cleanStreak === -1 ? last3.length : cleanStreak

  const quickPrompts = [
    'What improved most?',
    'What should I focus on next?',
    currentScore
      ? `How does ${currentScore} compare to others?`
      : 'When will I improve?',
  ]

  useEffect(() => {
    if (loading || !player) return

    async function genBrief() {
      if (!player) return
      const latestSession = sortedSessions[sortedSessions.length - 1]
      const prevSession = sortedSessions[sortedSessions.length - 2]
      const firstSession = sortedSessions[0]

      const scoreDelta =
        latestSession &&
        prevSession &&
        typeof latestSession.overall_score === 'number' &&
        typeof prevSession.overall_score === 'number'
          ? latestSession.overall_score - prevSession.overall_score
          : null

      try {
        const playerContext = {
          name: firstName,
          sport: player.sport || 'tennis',
          latestScore:
            typeof latestSession?.overall_score === 'number'
              ? latestSession.overall_score
              : null,
          previousScore:
            typeof prevSession?.overall_score === 'number'
              ? prevSession.overall_score
              : null,
          delta: scoreDelta,
          totalGain:
            latestSession &&
            firstSession &&
            latestSession.id !== firstSession.id &&
            typeof latestSession.overall_score === 'number' &&
            typeof firstSession.overall_score === 'number'
              ? latestSession.overall_score - firstSession.overall_score
              : 0,
          topIssue:
            typeof latestSession?.top_issue === 'string'
              ? latestSession.top_issue
              : null,
          sessionCount: sortedSessions.length,
          strengths:
            (latestSession?.full_result as { strengths?: unknown[] })
              ?.strengths || [],
          issues:
            (latestSession?.full_result as { areas_to_improve?: unknown[] })
              ?.areas_to_improve || [],
          poseMeasurements: latestSession?.pose_measurements ?? null,
          daysSinceLast: latestSession
            ? differenceInDays(
                new Date(),
                new Date(String(latestSession.analyzed_at)),
              )
            : null,
          hasUpcomingLesson: lessons.length > 0,
          recentDrill:
            typeof drills[0]?.title === 'string' ? drills[0].title : null,
        }

        const res = await fetch('/api/player-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerContext }),
        })
        const data = await res.json()
        setBrief(data.summary || '')
      } catch {
        if (latestSession) {
          setBrief(
            scoreDelta && scoreDelta > 0
              ? `${firstName}, your score went up ${scoreDelta} points this week. ${typeof latestSession.top_issue === 'string' && latestSession.top_issue ? `Keep working on ${latestSession.top_issue}.` : 'Keep the momentum going.'}`
              : `${firstName}, let's keep building. ${typeof latestSession.top_issue === 'string' && latestSession.top_issue ? `Focus on ${latestSession.top_issue} this week.` : 'Stay consistent and the score will follow.'}`,
          )
        } else {
          setBrief(
            "Welcome! Upload your first video and I'll give you a full technique breakdown.",
          )
        }
      }
      setBriefLoading(false)
    }

    void genBrief()
  }, [loading, player, sortedSessions, firstName])

  const sendChat = useCallback(
    async (overrideMsg?: string) => {
      const msg = (overrideMsg ?? chatInput).trim()
      if (!msg || chatLoading) return
      setChatInput('')
      setShowChat(true)

      const latestSession = sortedSessions[sortedSessions.length - 1]
      const prevSession = sortedSessions[sortedSessions.length - 2]

      const newMessages = [
        ...chatMessages,
        { role: 'user' as const, content: msg },
      ]
      setChatMessages(newMessages)
      setChatLoading(true)

      try {
        const res = await fetch('/api/player-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: newMessages,
            playerContext: {
              name: firstName,
              sport: player?.sport,
              latestScore: latestSession?.overall_score,
              delta:
                latestSession &&
                prevSession &&
                typeof latestSession.overall_score === 'number' &&
                typeof prevSession.overall_score === 'number'
                  ? latestSession.overall_score - prevSession.overall_score
                  : null,
              topIssue: latestSession?.top_issue,
              poseMeasurements: latestSession?.pose_measurements,
              strengths:
                (latestSession?.full_result as { strengths?: unknown[] })
                  ?.strengths || [],
              issues:
                (latestSession?.full_result as { areas_to_improve?: unknown[] })
                  ?.areas_to_improve || [],
            },
          }),
        })
        const data = await res.json()
        setChatMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.response || data.message || '',
          },
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
    },
    [
      chatInput,
      chatLoading,
      chatMessages,
      firstName,
      player?.sport,
      sortedSessions,
    ],
  )

  useEffect(() => {
    if (!showChat) return
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading, showChat])

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

  if (!player) {
    return (
      <div
        style={{
          fontFamily: 'Arial, sans-serif',
          color: TEXT,
          maxWidth: 720,
          margin: '0 auto',
          padding: '40px 0',
          background: WARM_BG,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
          Welcome to Playvia
        </h1>
        <p style={{ fontSize: 14, color: TEXT_SEC, lineHeight: 1.6 }}>
          Your coach hasn't linked a player profile to this account yet. Ask
          them to send you an invite, then come back here to see your progress.
        </p>
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
        background: WARM_BG,
        minHeight: '100%',
      }}
    >
      <style>{CSS}</style>

      <div
        style={{
          background:
            'linear-gradient(135deg, #eaf7f2 0%, #eff3fe 55%, #f5f0fd 100%)',
          borderRadius: 16,
          border: '0.5px solid rgba(29,158,117,.18)',
          overflow: 'hidden',
          marginBottom: 14,
        }}
      >
        <div style={{ padding: '18px 20px 16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 12,
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <ViaBlob size={30} thinking={chatLoading} />
              <div>
                <span style={{ fontSize: 13, fontWeight: 800, color: TEXT }}>
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
                    marginLeft: 7,
                    border: '0.5px solid rgba(29,158,117,.18)',
                  }}
                >
                  AI Coaching Agent
                </span>
              </div>
            </div>

            {currentScore !== null && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 900,
                    color: TEAL,
                    lineHeight: 1,
                    letterSpacing: '-1.5px',
                  }}
                >
                  {currentScore}
                </div>
                {delta !== null && (
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: delta > 0 ? GREEN : delta < 0 ? RED : TEXT_MUTED,
                      marginTop: 1,
                    }}
                  >
                    {delta > 0 ? '↑' : delta < 0 ? '↓' : ''}
                    {delta !== 0 ? ` ${Math.abs(delta)} this week` : ' no change'}
                  </div>
                )}
              </div>
            )}
          </div>

          {briefLoading ? (
            <div
              style={{
                display: 'flex',
                gap: 5,
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
                    animation: `viaRing 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
              <span style={{ fontSize: 12, color: TEXT_MUTED, marginLeft: 4 }}>
                Via is writing your debrief...
              </span>
            </div>
          ) : (
            <p
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: TEXT,
                lineHeight: 1.65,
                margin: '0 0 14px',
              }}
            >
              {brief}
            </p>
          )}

          {currentScore !== null && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 5,
                }}
              >
                <span style={{ fontSize: 10, color: TEXT_MUTED }}>
                  Progress
                  {totalGain > 0 ? ` · +${totalGain} pts all time` : ''}
                </span>
                <span style={{ fontSize: 10, color: TEAL, fontWeight: 600 }}>
                  {currentScore} / 100
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
                    boxShadow: '0 0 6px rgba(29,158,117,.3)',
                    transition: 'width 0.8s ease',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: '12px 20px 14px',
            background: 'rgba(255,255,255,.6)',
            borderTop: '0.5px solid rgba(29,158,117,.1)',
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: TEAL_DARK,
              fontWeight: 600,
              marginBottom: 7,
            }}
          >
            ↩ Reply to Via
          </div>

          <div
            style={{
              display: 'flex',
              gap: 7,
              alignItems: 'center',
              marginBottom: 8,
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
              placeholder="Ask Via about your progress..."
              style={{
                flex: 1,
                padding: '9px 13px',
                borderRadius: 10,
                border: '0.5px solid rgba(29,158,117,.22)',
                background: 'white',
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
                width: 32,
                height: 32,
                borderRadius: 9,
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
              <Send size={13} color="white" />
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 5,
              flexWrap: 'wrap',
            }}
          >
            {quickPrompts.map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() => void sendChat(prompt)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(29,158,117,.08)',
                  border: '0.5px solid rgba(29,158,117,.18)',
                  fontSize: 10,
                  color: TEAL_DARK,
                  cursor: 'pointer',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {showChat && chatMessages.length > 0 && (
            <div
              style={{
                marginTop: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
                maxHeight: 240,
                overflowY: 'auto',
              }}
            >
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '8px 12px',
                      borderRadius:
                        m.role === 'user'
                          ? '10px 10px 3px 10px'
                          : '10px 10px 10px 3px',
                      background: m.role === 'user' ? TEAL : 'rgba(255,255,255,.9)',
                      color: m.role === 'user' ? 'white' : TEXT,
                      fontSize: 12,
                      lineHeight: 1.55,
                      border:
                        m.role === 'assistant'
                          ? '0.5px solid rgba(29,158,117,.15)'
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
                    gap: 4,
                    padding: '6px 10px',
                    background: 'rgba(255,255,255,.8)',
                    borderRadius: 10,
                    width: 'fit-content',
                    border: '0.5px solid rgba(29,158,117,.15)',
                  }}
                >
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: TEAL,
                        opacity: 0.5,
                        animation: `viaRing 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
      </div>

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
                <div
                  style={{ fontSize: 9, color: TEXT_MUTED, marginBottom: 3 }}
                >
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
              <div
                style={{ fontSize: 9, color: TEXT_MUTED, marginBottom: 3 }}
              >
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
              <div
                style={{ fontSize: 9, color: PURPLE, marginTop: 2 }}
              >
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
              <div
                style={{ fontSize: 9, color: TEXT_MUTED, marginBottom: 3 }}
              >
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
              <div
                style={{ fontSize: 9, color: TEAL, marginTop: 2 }}
              >
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
            {"Today's drill"}
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
              <div
                style={{
                  fontSize: 11,
                  color: TEXT_MUTED,
                  marginBottom: 12,
                }}
              >
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
              <div
                style={{
                  fontSize: 11,
                  color: TEXT_MUTED,
                  marginBottom: 12,
                }}
              >
                Upload a video for a personalized plan
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => router.push('/player/drills')}
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
            {upcomingDrill ? 'View drill →' : 'Get drills →'}
          </button>
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
            Next lesson
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
              <div
                style={{
                  fontSize: 11,
                  color: TEXT_MUTED,
                  marginBottom: 12,
                }}
              >
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
                No lesson scheduled
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: TEXT_MUTED,
                  marginBottom: 12,
                }}
              >
                Book a session with your coach
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => router.push('/player/lessons')}
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
            {nextLesson ? 'View lesson →' : 'Book lesson →'}
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
