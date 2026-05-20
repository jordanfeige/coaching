'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowRight, MessageSquare, Minimize2, Send, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const TEAL = 'hsl(168,62%,36%)'
const TEAL_LIGHT = 'hsl(168,62%,95%)'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const WARM_BG = 'hsl(40,20%,97%)'

type PlayerAction = {
  type: 'bookLesson' | 'analyze' | 'viewProgress' | 'viewDrills' | 'viewLesson' | string
}

type PlayerPicker = {
  question: string
  options: { label: string; value: string }[]
  actionType: string
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  action?: PlayerAction
  picker?: PlayerPicker
}

type AnalysisIssue = {
  area?: string
}

type AnalysisSessionRow = {
  id: string
  analyzed_at: string | null
  overall_score: number | null
  rating: string | null
  overall_rating?: string | null
  top_issue: string | null
  biggest_win: string | null
  full_result?: {
    areas_to_improve?: AnalysisIssue[]
  } | null
}

type DrillRow = {
  id: string
  title: string | null
  description: string | null
}

type LessonRow = {
  id: string
  starts_at: string | null
  status: string | null
  duration_mins?: number | null
  notes?: string | null
}

type PlayerContext = {
  player: {
    id: string
    name: string
    sport: string
    skillLevel?: string
  }
  sessions: number
  latestScore: number | null
  latestRating: string | null
  scoreDelta: number | null
  totalGain: number | null
  topIssue: string | null
  biggestWin: string | null
  persistentIssues: Array<{ issue: string; count: number }>
  assignedDrills: string[]
  upcomingLessons: Array<{ date: string | null; duration: number | null; status: string | null }>
  pastLessons: Array<{ date: string | null; hasNotes: boolean }>
  recentSessions: Array<{ date: string | null; score: number | null; topIssue: string | null; rating: string | null }>
  currentPage: string
}

interface Props {
  playerId: string
  playerName: string
  sport: string
  skillLevel?: string
}

const PAGE_SUGGESTIONS: Record<string, string[]> = {
  '/player': [
    'How am I improving?',
    'What should I practice this week?',
    'What is my biggest weakness?',
    'Book a lesson with my coach',
  ],
  '/player/reels': [
    'What should I focus on in this video?',
    'How does my technique compare to last session?',
    'What camera angle is best for my sport?',
    'What drills should I do before recording?',
  ],
  '/player/progress': [
    'What is my biggest improvement?',
    'Which issue has been hardest to fix?',
    'Am I improving fast enough?',
    'What should I focus on next month?',
  ],
  '/player/drills': [
    'Explain how to do this drill correctly',
    'How many times per week should I practice?',
    'What should I feel when I do this right?',
    'Is there a simpler version of this drill?',
  ],
  '/player/training': [
    'What did my coach say about my last session?',
    'Book a new training session',
    'What should I prepare for my next session?',
    'How often should I train with my coach?',
  ],
  '/player/lessons': [
    'What did my coach say about my last session?',
    'Book a new training session',
    'What should I prepare for my next session?',
    'How often should I train with my coach?',
  ],
  '/player/journey': [
    'What schools fit me?',
    'How do I improve schedule strength?',
    'What should I film for recruiting?',
  ],
  '/player/coach': [
    'What should I work on before our next session?',
    'Can you review my latest reel?',
    'How do I prepare for a college showcase?',
  ],
}

const DEFAULT_SUGGESTIONS = [
  'How am I improving?',
  'What should I practice this week?',
  'What is my biggest weakness right now?',
  'Book a training session with my coach',
]

const sportEmoji: Record<string, string> = {
  tennis: '🎾',
  golf: '⛳',
  baseball: '⚾',
  basketball: '🏀',
  pickleball: '🏓',
}

function parseAssistantResponse(response: string): {
  text: string
  action: PlayerAction | null
  picker: PlayerPicker | null
} {
  const actionMatch = response.match(/\[ACTION:(.*?)\]/)
  const pickerMatch = response.match(/\[PICKER:(.*?)\]/)
  let action: PlayerAction | null = null
  let picker: PlayerPicker | null = null

  if (actionMatch) {
    try {
      action = JSON.parse(actionMatch[1]) as PlayerAction
    } catch {
      action = null
    }
  }

  if (pickerMatch) {
    try {
      picker = JSON.parse(pickerMatch[1]) as PlayerPicker
    } catch {
      picker = null
    }
  }

  const text = response
    .replace(/\[ACTION:.*?\]/, '')
    .replace(/\[PICKER:.*?\]/, '')
    .trim()

  return { text, action, picker }
}

function getActionLabel(action: PlayerAction): string {
  switch (action.type) {
    case 'bookLesson':
      return '📅 Book a lesson'
    case 'analyze':
      return '📹 Add to your Reels'
    case 'viewProgress':
      return '📈 View my progress'
    case 'viewDrills':
      return '🏋️ View my drills'
    case 'viewLesson':
      return '📋 View lesson details'
    default:
      return 'Take action'
  }
}

export default function PlayerChat({ playerId, playerName, sport, skillLevel }: Props) {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [basePlayerContext, setBasePlayerContext] = useState<Omit<PlayerContext, 'currentPage'> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const playerContext = useMemo<PlayerContext | null>(
    () =>
      basePlayerContext
        ? {
            ...basePlayerContext,
            currentPage: pathname,
          }
        : null,
    [basePlayerContext, pathname],
  )

  const loadContext = useCallback(async () => {
    const [{ data: sessions }, { data: drills }, { data: lessons }, { data: pastLessons }] = await Promise.all([
      supabase
        .from('analysis_sessions')
        .select('*')
        .eq('player_id', playerId)
        .order('analyzed_at', { ascending: false })
        .limit(10),
      supabase
        .from('drills')
        .select('id, title, description')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('lessons')
        .select('id, starts_at, status, duration_mins')
        .eq('player_id', playerId)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')
        .limit(3),
      supabase
        .from('lessons')
        .select('id, starts_at, status, notes')
        .eq('player_id', playerId)
        .lt('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: false })
        .limit(3),
    ])

    const safeSessions = (sessions || []) as AnalysisSessionRow[]
    const safeDrills = (drills || []) as DrillRow[]
    const safeLessons = (lessons || []) as LessonRow[]
    const safePastLessons = (pastLessons || []) as LessonRow[]
    const latestSession = safeSessions[0]
    const previousSession = safeSessions[1]
    const firstSession = safeSessions[safeSessions.length - 1]

    const issueCounts: Record<string, number> = {}
    safeSessions.forEach(session => {
      if (session.full_result?.areas_to_improve?.length) {
        session.full_result.areas_to_improve.forEach(issue => {
          if (issue.area) issueCounts[issue.area] = (issueCounts[issue.area] || 0) + 1
        })
      } else if (session.top_issue) {
        issueCounts[session.top_issue] = (issueCounts[session.top_issue] || 0) + 1
      }
    })

    const persistentIssues = Object.entries(issueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([issue, count]) => ({ issue, count }))

    const scoreDelta =
      typeof latestSession?.overall_score === 'number' && typeof previousSession?.overall_score === 'number'
        ? latestSession.overall_score - previousSession.overall_score
        : null

    const totalGain =
      latestSession &&
      firstSession &&
      firstSession.id !== latestSession.id &&
      typeof latestSession.overall_score === 'number' &&
      typeof firstSession.overall_score === 'number'
        ? latestSession.overall_score - firstSession.overall_score
        : null

    setBasePlayerContext({
      player: {
        id: playerId,
        name: playerName,
        sport,
        skillLevel,
      },
      sessions: safeSessions.length,
      latestScore: latestSession?.overall_score ?? null,
      latestRating: latestSession?.rating || latestSession?.overall_rating || null,
      scoreDelta,
      totalGain,
      topIssue: latestSession?.top_issue ?? null,
      biggestWin: latestSession?.biggest_win ?? null,
      persistentIssues,
      assignedDrills: safeDrills.map(drill => drill.title).filter((title): title is string => Boolean(title)),
      upcomingLessons: safeLessons.map(lesson => ({
        date: lesson.starts_at,
        duration: lesson.duration_mins ?? null,
        status: lesson.status,
      })),
      pastLessons: safePastLessons.map(lesson => ({
        date: lesson.starts_at,
        hasNotes: Boolean(lesson.notes),
      })),
      recentSessions: safeSessions.slice(0, 3).map(session => ({
        date: session.analyzed_at,
        score: session.overall_score,
        topIssue: session.top_issue,
        rating: session.rating || session.overall_rating || null,
      })),
    })
  }, [playerId, playerName, skillLevel, sport, supabase])

  useEffect(() => {
    queueMicrotask(() => {
      void loadContext()
    })
  }, [loadContext])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (open && !minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [messages, open, minimized])

  function executeAction(action: PlayerAction) {
    switch (action.type) {
      case 'bookLesson':
        router.push('/player/training')
        break
      case 'analyze':
        router.push('/player/reels')
        break
      case 'viewProgress':
        router.push('/player/progress')
        break
      case 'viewDrills':
        router.push('/player/drills')
        break
      case 'viewLesson':
        router.push('/player/training')
        break
    }
    setOpen(false)
  }

  async function sendMessage(text?: string) {
    const messageText = text || input.trim()
    if (!messageText || loading) return
    setInput('')
    const userMessage: Message = { role: 'user', content: messageText }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setLoading(true)

    try {
      const response = await fetch('/api/player-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          playerContext,
        }),
      })
      const data = (await response.json()) as { response?: string }
      const { text: responseText, action, picker } = parseAssistantResponse(
        data.response || 'Something went wrong. Please try again.',
      )
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: responseText,
          action: action || undefined,
          picker: picker || undefined,
        },
      ])
      if (minimized) setHasUnread(true)
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  if (pathname === '/player/reels' || pathname === '/player/analyze') return null

  const suggestions = PAGE_SUGGESTIONS[pathname] || DEFAULT_SUGGESTIONS
  const firstName = playerName.split(' ')[0] || playerName
  const bottom = isMobile ? 80 : 24
  const right = isMobile ? 16 : 24
  const width = isMobile ? 'calc(100vw - 32px)' : 340
  const emoji = sportEmoji[sport] || '🏃'

  return (
    <>
      {!open && (
        <button
          onClick={() => {
            setOpen(true)
            setHasUnread(false)
          }}
          style={{
            position: 'fixed',
            bottom,
            right,
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: TEAL,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(45,155,127,0.35)',
            zIndex: 100,
            transition: 'transform 0.2s',
          }}
          onMouseEnter={event => {
            event.currentTarget.style.transform = 'scale(1.08)'
          }}
          onMouseLeave={event => {
            event.currentTarget.style.transform = 'scale(1)'
          }}
          type="button"
          aria-label="Open player coaching assistant"
        >
          <MessageSquare size={20} color="white" />
          {hasUnread && (
            <div
              style={{
                position: 'absolute',
                top: 1,
                right: 1,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#DC2626',
                border: '2px solid white',
              }}
            />
          )}
        </button>
      )}

      {open && (
        <div
          style={{
            position: 'fixed',
            bottom,
            right,
            width,
            maxWidth: 380,
            height: minimized ? 52 : 480,
            borderRadius: 18,
            background: 'white',
            border: `1px solid ${BORDER}`,
            boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'height 0.25s ease',
          }}
        >
          <div
            style={{
              background: TEAL,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
              cursor: minimized ? 'pointer' : 'default',
            }}
            onClick={() => {
              if (minimized) {
                setMinimized(false)
                setHasUnread(false)
              }
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 14,
              }}
            >
              {emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
                {firstName}&apos;s Coach AI
              </div>
              {!minimized && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
                  {playerContext?.latestScore
                    ? `Latest score: ${playerContext.latestScore}`
                    : `${sport} · ${skillLevel || 'athlete'}`}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={event => {
                  event.stopPropagation()
                  setMinimized(!minimized)
                  if (minimized) setHasUnread(false)
                }}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 6,
                  padding: '3px 5px',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'white',
                }}
                type="button"
                aria-label={minimized ? 'Expand chat' : 'Minimize chat'}
              >
                <Minimize2 size={13} />
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 6,
                  padding: '3px 5px',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'white',
                }}
                type="button"
                aria-label="Close chat"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '12px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  background: WARM_BG,
                }}
              >
                {messages.length === 0 && (
                  <div>
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px 10px 10px 3px',
                        background: 'white',
                        border: `1px solid ${BORDER}`,
                        fontSize: 12,
                        color: TEXT,
                        lineHeight: 1.5,
                        marginBottom: 10,
                      }}
                    >
                      Hi {firstName}! I know your full training history and can help you improve.
                      What&apos;s on your mind?
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {suggestions.map(question => (
                        <button
                          key={question}
                          onClick={() => void sendMessage(question)}
                          style={{
                            fontSize: 11,
                            padding: '5px 9px',
                            borderRadius: 999,
                            border: `1px solid ${TEAL}`,
                            background: TEAL_LIGHT,
                            color: TEAL,
                            cursor: 'pointer',
                            fontFamily: 'Arial, sans-serif',
                            fontWeight: 500,
                          }}
                          type="button"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                      gap: 5,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '86%',
                        padding: '9px 12px',
                        borderRadius: message.role === 'user' ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
                        background: message.role === 'user' ? TEAL : 'white',
                        border: message.role === 'user' ? 'none' : `1px solid ${BORDER}`,
                        fontSize: 12,
                        color: message.role === 'user' ? 'white' : TEXT,
                        lineHeight: 1.55,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {message.content}
                    </div>

                    {message.picker && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ fontSize: 11, color: TEXT }}>{message.picker.question}</div>
                        {message.picker.options.map(option => (
                          <button
                            key={option.value}
                            onClick={() => executeAction({ type: message.picker!.actionType })}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 8,
                              border: `1px solid ${BORDER}`,
                              background: 'white',
                              color: TEXT,
                              fontSize: 11,
                              cursor: 'pointer',
                            }}
                            type="button"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {message.action && (
                      <button
                        onClick={() => executeAction(message.action!)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '6px 12px',
                          borderRadius: 8,
                          background: TEAL,
                          color: 'white',
                          border: 'none',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'Arial, sans-serif',
                        }}
                        type="button"
                      >
                        {getActionLabel(message.action)}
                        <ArrowRight size={11} />
                      </button>
                    )}
                  </div>
                ))}

                {loading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div
                      style={{
                        padding: '9px 13px',
                        borderRadius: '10px 10px 10px 3px',
                        background: 'white',
                        border: `1px solid ${BORDER}`,
                        display: 'flex',
                        gap: 4,
                        alignItems: 'center',
                      }}
                    >
                      {[0, 1, 2].map(index => (
                        <div
                          key={index}
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: TEAL,
                            animation: `bounce 1.2s ease-in-out ${index * 0.2}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div
                style={{
                  padding: '10px 10px',
                  borderTop: `1px solid ${BORDER}`,
                  background: 'white',
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your training..."
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: `1px solid ${BORDER}`,
                    fontSize: 12,
                    fontFamily: 'Arial, sans-serif',
                    outline: 'none',
                    color: TEXT,
                    background: WARM_BG,
                  }}
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: input.trim() && !loading ? TEAL : BORDER,
                    border: 'none',
                    cursor: input.trim() && !loading ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}
                  type="button"
                  aria-label="Send message"
                >
                  <Send size={13} color="white" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </>
  )
}
