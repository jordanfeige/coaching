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

type Message = {
  role: 'user' | 'assistant'
  content: string
  action?: CoachAction
}

type CoachAction = {
  type: 'schedule' | 'drill' | 'viewPlayer' | 'analyzeVideo' | 'viewPulse' | string
  playerId?: string
  playerName?: string
  focus?: string
}

type RosterContext = {
  currentPage: string
  totalPlayers: number
  players: Array<{
    id: string
    name: string | null
    sport: string | null
    skillLevel: string | null
    latestScore: number | null
    topIssue: string | null
    lastAnalyzed: string | null
    sessionCount: number
  }>
  upcomingLessons: number
  recentSessions: Array<{
    sport: string | null
    score: number | null
    topIssue: string | null
    date: string | null
  }>
}

const PAGE_SUGGESTIONS: Record<string, string[]> = {
  '/dashboard': [
    'What should I focus on today?',
    'Who needs attention on my roster?',
    'Schedule my most urgent lesson',
  ],
  '/dashboard/analytics': [
    'Who needs my attention most?',
    'Build a group session plan',
    'Who is closest to a breakthrough?',
    'Schedule a lesson with my lowest scoring player',
  ],
  '/dashboard/players': [
    'Which player has improved the most?',
    "Who hasn't been analyzed recently?",
    'Generate drills for my struggling players',
  ],
  '/dashboard/schedule': [
    'What lessons do I have this week?',
    'Schedule a lesson for my next available slot',
    'Who should I prioritize for my next session?',
  ],
  '/dashboard/video': [
    'Which player needs video analysis most?',
    'What should I look for in the next video?',
  ],
  '/dashboard/drills': [
    'Build a drill plan for follow through issues',
    'What drills work best for beginners?',
    'Create a 60-minute session plan',
  ],
}

const DEFAULT_SUGGESTIONS = [
  'What should I focus on today?',
  'Who needs my attention most?',
  'Build a session plan',
  'Which player improved most?',
]

function parseAction(response: string): {
  text: string
  action: CoachAction | null
} {
  const match = response.match(/\[ACTION:(.*?)\]/)
  if (!match) return { text: response, action: null }

  try {
    const action = JSON.parse(match[1]) as CoachAction
    const text = response.replace(/\[ACTION:.*?\]/, '').trim()
    return { text, action }
  } catch {
    return { text: response, action: null }
  }
}

function getActionLabel(action: CoachAction): string {
  switch (action.type) {
    case 'schedule':
      return `📅 Schedule${action.playerName ? ` with ${action.playerName}` : ''}`
    case 'drill':
      return `🏋️ Build drills${action.playerName ? ` for ${action.playerName}` : ''}`
    case 'viewPlayer':
      return `👤 View ${action.playerName || 'player'}`
    case 'analyzeVideo':
      return `📹 Add reel for ${action.playerName || 'video'}`
    case 'viewPulse':
      return '📊 Open Pulse'
    default:
      return 'Take action'
  }
}

function pageLabelFor(pathname: string) {
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname === '/dashboard/analytics') return 'Pulse'
  if (pathname.includes('/dashboard/players/')) return 'Player Profile'
  if (pathname === '/dashboard/players') return 'Players'
  if (pathname === '/dashboard/schedule') return 'Schedule'
  if (pathname === '/dashboard/video') return 'Video'
  if (pathname === '/dashboard/drills') return 'Drills'
  return 'Dashboard'
}

export default function GlobalCoachChat() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [baseRosterContext, setBaseRosterContext] = useState<Omit<RosterContext, 'currentPage'> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const rosterContext = useMemo<RosterContext | null>(
    () =>
      baseRosterContext
        ? {
            ...baseRosterContext,
            currentPage: pathname,
          }
        : null,
    [baseRosterContext, pathname],
  )

  const loadContext = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: players } = await supabase
      .from('players')
      .select('id, name, sport, skill_level')
      .order('name')

    const { data: sessions } = await supabase
      .from('analysis_sessions')
      .select('player_id, overall_score, analyzed_at, top_issue, sport, rating')
      .order('analyzed_at', { ascending: false })
      .limit(50)

    const startWindow = new Date()
    startWindow.setDate(startWindow.getDate() - 7)

    const { data: lessons } = await supabase
      .from('lessons')
      .select('player_id, starts_at, status')
      .gte('starts_at', startWindow.toISOString())
      .order('starts_at')
      .limit(20)

    const safePlayers = players || []
    const safeSessions = sessions || []
    const playerMap = safePlayers.map(player => {
      const playerSessions = safeSessions.filter(session => session.player_id === player.id)
      const latest = playerSessions[0]
      return {
        id: player.id,
        name: player.name,
        sport: player.sport,
        skillLevel: player.skill_level,
        latestScore: latest?.overall_score || null,
        topIssue: latest?.top_issue || null,
        lastAnalyzed: latest?.analyzed_at || null,
        sessionCount: playerSessions.length,
      }
    })

    setBaseRosterContext({
      totalPlayers: safePlayers.length,
      players: playerMap,
      upcomingLessons: (lessons || []).filter(lesson => lesson.status === 'scheduled').length,
      recentSessions: safeSessions.slice(0, 5).map(session => ({
        sport: session.sport,
        score: session.overall_score,
        topIssue: session.top_issue,
        date: session.analyzed_at,
      })),
    })
  }, [supabase])

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

  function executeAction(action: CoachAction) {
    switch (action.type) {
      case 'schedule':
        router.push(action.playerId ? `/dashboard/schedule?player=${action.playerId}` : '/dashboard/schedule')
        break
      case 'drill':
        router.push(
          action.playerId
            ? `/dashboard/players/${action.playerId}?tab=drills&focus=${encodeURIComponent(action.focus || '')}`
            : '/dashboard/drills',
        )
        break
      case 'viewPlayer':
        if (action.playerId) router.push(`/dashboard/players/${action.playerId}`)
        break
      case 'analyzeVideo':
        router.push(action.playerId ? `/dashboard/video?player=${action.playerId}` : '/dashboard/video')
        break
      case 'viewPulse':
        router.push('/dashboard/analytics')
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
      const response = await fetch('/api/pulse-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          rosterContext,
        }),
      })
      const data = (await response.json()) as { response?: string }
      const { text: responseText, action } = parseAction(data.response || 'Something went wrong. Try again.')
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: responseText,
          action: action || undefined,
        },
      ])
      if (minimized) setHasUnread(true)
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Something went wrong. Try again.',
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

  const suggestions = PAGE_SUGGESTIONS[pathname] || DEFAULT_SUGGESTIONS
  const pageLabel = pageLabelFor(pathname)
  const bottom = isMobile ? 82 : 24
  const right = isMobile ? 16 : 24
  const chatWidth = isMobile ? 'calc(100vw - 32px)' : 'min(360px, calc(100vw - 32px))'
  const chatHeight = minimized
    ? 52
    : isMobile
      ? 'min(500px, calc(100vh - 112px))'
      : 'min(500px, calc(100vh - 48px))'

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
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: TEAL,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(45,155,127,0.35)',
            zIndex: 100,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={event => {
            event.currentTarget.style.transform = 'scale(1.08)'
            event.currentTarget.style.boxShadow = '0 6px 28px rgba(45,155,127,0.45)'
          }}
          onMouseLeave={event => {
            event.currentTarget.style.transform = 'scale(1)'
            event.currentTarget.style.boxShadow = '0 4px 20px rgba(45,155,127,0.35)'
          }}
          type="button"
          aria-label="Open coaching assistant"
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
            width: chatWidth,
            maxWidth: 380,
            height: chatHeight,
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
              padding: '13px 14px',
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
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MessageSquare size={14} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
                Coaching Assistant
              </div>
              {!minimized && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
                  {pageLabel} · {rosterContext?.totalPlayers || 0} players
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
                  padding: '14px 12px',
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
                      Hi Coach! I know your roster and can help you take action. What do you need?
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {suggestions.map(question => (
                        <button
                          key={question}
                          onClick={() => void sendMessage(question)}
                          style={{
                            fontSize: 11,
                            padding: '5px 10px',
                            borderRadius: 999,
                            border: `1px solid ${TEAL}`,
                            background: TEAL_LIGHT,
                            color: TEAL,
                            cursor: 'pointer',
                            fontFamily: 'Arial, sans-serif',
                            fontWeight: 500,
                            textAlign: 'left',
                            transition: 'all 0.15s',
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
                      justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                      flexDirection: 'column',
                      alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                      gap: 6,
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
                        padding: '10px 14px',
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
                  padding: '10px 12px',
                  borderTop: `1px solid ${BORDER}`,
                  background: 'white',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  style={{
                    flex: 1,
                    padding: '8px 11px',
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
                    width: 33,
                    height: 33,
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
                  <Send size={14} color="white" />
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
