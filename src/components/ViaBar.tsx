'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowRight, ChevronDown, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import ViaBlob from './ViaBlob'

const TEAL = 'hsl(168,62%,36%)'
const TEAL_LIGHT = 'hsl(168,62%,95%)'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'

type Role = 'coach' | 'player'

type PlayerContext = {
  id: string
  name: string
  sport: string
  skillLevel?: string | null
}

type ViaAction = {
  type: string
  playerId?: string
  playerName?: string
  focus?: string
  sport?: string
  eventType?: string
  radiusMiles?: number
  event?: EventListing
  playerIds?: string[]
  message?: string
}

type EventListing = {
  title?: string
  start_date?: string | null
  location_city?: string | null
  location_state?: string | null
  price?: number | null
  distance_estimate?: string | null
  registration_url?: string | null
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  action?: ViaAction
  events?: EventListing[]
  isAction?: boolean
  isSuccess?: boolean
  showPlayerPicker?: boolean
}

type PlayerOption = {
  id: string
  name: string | null
  sport: string | null
  skill_level?: string | null
  email?: string | null
}

type AnalysisSession = {
  player_id?: string | null
  overall_score?: number | null
  analyzed_at?: string | null
  top_issue?: string | null
  sport?: string | null
  full_result?: {
    areas_to_improve?: Array<{ area?: string | null }>
  } | null
}

type RosterContext = Record<string, unknown>

interface Props {
  role: Role
  playerContext?: PlayerContext | null
}

const COACH_SUGGESTIONS: Record<string, string[]> = {
  '/dashboard': ['Who needs my attention today?', 'Find tournaments near me', 'Schedule a lesson'],
  '/dashboard/analytics': ['Find events for my players', 'Who should I focus on?', 'Build a group session plan'],
  '/dashboard/players': ['Which player improved most?', 'Generate drills for struggling players', 'Find camps for my roster'],
  '/dashboard/schedule': ['Schedule my most urgent lesson', 'Who should I prioritize?'],
  '/dashboard/video': ['Which player needs a reel most?', 'What should I look for?'],
  '/dashboard/bulletin': [
    'Find tennis tournaments within 100 miles',
    'Find summer camps for ages 10-16',
    'Find golf clinics near me',
  ],
}

const PLAYER_SUGGESTIONS: Record<string, string[]> = {
  '/player': ['How am I improving?', 'What should I practice this week?', 'What is my biggest weakness?'],
  '/player/reels': ['What should I film for my next reel?', 'Explain my last session', 'What was my top issue?'],
  '/player/progress': ['What is my biggest improvement?', 'Am I improving fast enough?', 'What should I focus on next?'],
  '/player/drills': ['Explain how to do this drill', 'How many times per week?', 'What should I feel when I do this right?'],
  '/player/lessons': ['What did my coach say last session?', 'How should I prepare for my next lesson?', 'Book a new lesson'],
  '/player/bulletin': ['Find tournaments near me', 'What events are good for my level?', 'Find camps this summer'],
}

const DEFAULT_COACH = ['Who needs my attention today?', 'Find events near me', 'Build a session plan']
const DEFAULT_PLAYER = ['How am I improving?', 'What should I practice?', 'Find tournaments near me']

function parseAction(response: string): { text: string; action: ViaAction | null } {
  const match = response.match(/\[ACTION:(.*?)\]/)
  if (!match) return { text: response, action: null }

  try {
    const action = JSON.parse(match[1]) as ViaAction
    const text = response.replace(/\[ACTION:.*?\]/, '').trim()
    return { text, action }
  } catch {
    return { text: response, action: null }
  }
}

function firstName(name?: string | null) {
  return name?.split(' ')[0] || 'there'
}

export default function ViaBar({ role, playerContext }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [rosterContext, setRosterContext] = useState<RosterContext | null>(null)
  const [playerList, setPlayerList] = useState<PlayerOption[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<ViaAction | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventListing | null>(null)
  const [briefText, setBriefText] = useState(role === 'coach' ? 'Ask Via anything about your coaching' : 'Ask Via anything about your training')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const playerId = playerContext?.id
  const playerName = playerContext?.name
  const playerSport = playerContext?.sport
  const playerSkillLevel = playerContext?.skillLevel

  const loadContext = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    if (role === 'coach') {
      const [{ data: players }, { data: sessions }] = await Promise.all([
        supabase.from('players').select('id, name, sport, skill_level, email').order('name'),
        supabase
          .from('analysis_sessions')
          .select('player_id, overall_score, analyzed_at, top_issue, sport, rating')
          .order('analyzed_at', { ascending: false })
          .limit(50),
      ])

      const safePlayers = (players || []) as PlayerOption[]
      const safeSessions = (sessions || []) as AnalysisSession[]
      const playerMap = safePlayers.map(player => {
        const playerSessions = safeSessions.filter(session => session.player_id === player.id)
        const latest = playerSessions[0]
        const previous = playerSessions[1]
        return {
          id: player.id,
          name: player.name,
          sport: player.sport,
          skillLevel: player.skill_level,
          latestScore: latest?.overall_score || null,
          topIssue: latest?.top_issue || null,
          delta:
            typeof latest?.overall_score === 'number' && typeof previous?.overall_score === 'number'
              ? latest.overall_score - previous.overall_score
              : null,
          daysSince: latest?.analyzed_at
            ? Math.floor((Date.now() - new Date(latest.analyzed_at).getTime()) / 86400000)
            : 999,
          sessions: playerSessions.length,
        }
      })
      const needsAttention = playerMap.filter(player => (player.delta !== null && player.delta <= -5) || player.daysSince >= 14)

      setPlayerList(safePlayers)
      setRosterContext({
        role: 'coach',
        totalPlayers: safePlayers.length,
        players: playerMap,
      })
      setBriefText(
        needsAttention.length > 0
          ? `${needsAttention[0].name} needs your attention${needsAttention.length > 1 ? ` and ${needsAttention.length - 1} others` : ''} - ask Via for details`
          : playerMap.length > 0
            ? 'Your roster is looking good - ask Via anything'
            : 'Ask Via anything about your coaching',
      )
      return
    }

    if (role === 'player' && playerId && playerName && playerSport) {
      const { data: sessions } = await supabase
        .from('analysis_sessions')
        .select('*')
        .eq('player_id', playerId)
        .order('analyzed_at', { ascending: false })
        .limit(10)

      const safeSessions = (sessions || []) as AnalysisSession[]
      const latest = safeSessions[0]
      const issueCounts: Record<string, number> = {}
      safeSessions.forEach(session => {
        session.full_result?.areas_to_improve?.forEach(issue => {
          if (issue.area) issueCounts[issue.area] = (issueCounts[issue.area] || 0) + 1
        })
      })
      const topIssues = Object.entries(issueCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([issue]) => issue)

      setRosterContext({
        role: 'player',
        player: {
          id: playerId,
          name: playerName,
          sport: playerSport,
          skillLevel: playerSkillLevel,
        },
        sessions: safeSessions.length,
        latestScore: latest?.overall_score || null,
        topIssue: latest?.top_issue || null,
        persistentIssues: topIssues,
        recentSessions: safeSessions.slice(0, 3).map(session => ({
          score: session.overall_score,
          date: session.analyzed_at,
          topIssue: session.top_issue,
        })),
      })
      setBriefText(
        latest?.overall_score
          ? `Your latest score is ${latest.overall_score} - ask Via how to improve`
          : `Hi ${firstName(playerName)}! Ask Via anything about your training`,
      )
    }
  }, [playerId, playerName, playerSkillLevel, playerSport, role, supabase])

  useEffect(() => {
    queueMicrotask(() => {
      void loadContext()
    })
  }, [loadContext])

  useEffect(() => {
    if (!expanded) return
    const container = messagesContainerRef.current
    if (container) container.scrollTop = container.scrollHeight
    const timer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 100)
    return () => window.clearTimeout(timer)
  }, [messages, expanded])

  async function executeSearchEvents(action: ViaAction) {
    const response = await fetch('/api/bulletin-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: 'Sioux Falls',
        state: 'SD',
        sport: action.sport || 'all',
        type: action.eventType || 'all',
        ageGroup: 'all',
        radiusMiles: action.radiusMiles || 100,
        forceRefresh: false,
      }),
    })
    const data = (await response.json()) as { listings?: EventListing[]; coachListings?: EventListing[] }
    return [...(data.coachListings || []), ...(data.listings || [])]
  }

  async function handleAction(action: ViaAction | null) {
    if (!action) return

    switch (action.type) {
      case 'search_events': {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Searching for upcoming events...', isAction: true }])
        try {
          const events = await executeSearchEvents(action)
          setMessages(prev => [
            ...prev.slice(0, -1),
            {
              role: 'assistant',
              content: events.length > 0 ? `Found ${events.length} upcoming events:` : 'No events found nearby. Try a larger radius.',
              events,
              isAction: true,
            },
          ])
        } catch {
          setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: 'I could not search events right now.', isAction: true }])
        }
        break
      }
      case 'notify_players':
        if (!action.playerIds?.length) {
          setSelectedEvent(action.event || null)
          setPendingAction(action)
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: `Which players should I notify about "${action.event?.title || 'this event'}"?`,
              isAction: true,
              showPlayerPicker: true,
            },
          ])
          return
        }
        const notifiedCount = action.playerIds.length
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `Ready to notify ${notifiedCount} player${notifiedCount === 1 ? '' : 's'}.`,
            isAction: true,
            isSuccess: true,
          },
        ])
        setSelectedPlayers([])
        setSelectedEvent(null)
        setPendingAction(null)
        break
      case 'schedule':
        router.push(action.playerId ? `/dashboard/schedule?player=${action.playerId}` : '/dashboard/schedule')
        setExpanded(false)
        break
      case 'drill':
        router.push(
          action.playerId
            ? `/dashboard/players/${action.playerId}?tab=drills&focus=${encodeURIComponent(action.focus || '')}`
            : '/dashboard/drills',
        )
        setExpanded(false)
        break
      case 'viewPlayer':
        if (action.playerId) router.push(`/dashboard/players/${action.playerId}`)
        setExpanded(false)
        break
      case 'analyzeVideo':
        router.push(action.playerId ? `/dashboard/video?player=${action.playerId}` : '/dashboard/video')
        setExpanded(false)
        break
      case 'bookLesson':
        router.push('/player/lessons')
        setExpanded(false)
        break
      case 'analyze':
        router.push('/player/reels')
        setExpanded(false)
        break
      case 'viewProgress':
        router.push('/player/progress')
        setExpanded(false)
        break
      case 'viewDrills':
        router.push('/player/drills')
        setExpanded(false)
        break
    }
  }

  async function sendMessage(text?: string) {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    if (!expanded) setExpanded(true)

    const userMsg: Message = { role: 'user', content: msg }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    const apiRoute = role === 'coach' ? '/api/pulse-chat' : '/api/player-chat'
    const contextKey = role === 'coach' ? 'rosterContext' : 'playerContext'

    try {
      const response = await fetch(apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          [contextKey]: {
            ...rosterContext,
            currentPage: pathname,
          },
        }),
      })
      const data = (await response.json()) as { response?: string }
      const { text: responseText, action } = parseAction(data.response || '')

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: responseText,
          action: action || undefined,
        },
      ])

      if (action) await handleAction(action)
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

  const suggestions = role === 'coach' ? COACH_SUGGESTIONS[pathname] || DEFAULT_COACH : PLAYER_SUGGESTIONS[pathname] || DEFAULT_PLAYER
  const playerFirstName = role === 'player' ? firstName(playerContext?.name) : null

  return (
    <div style={{ marginBottom: 20, fontFamily: 'Arial, sans-serif', position: 'relative', zIndex: expanded ? 40 : 1 }}>
      <div
        style={{
          background: 'white',
          border: `0.5px solid ${expanded ? 'hsl(168,62%,60%)' : BORDER}`,
          borderRadius: 14,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          transition: 'border-color 0.2s',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
        onClick={() => {
          if (!expanded) setExpanded(true)
        }}
      >
        <ViaBlob size={34} thinking={loading} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TEAL }}>Via</span>
            <span style={{ fontSize: 11, color: TEXT_MUTED }}>AI {role === 'coach' ? 'Coaching' : 'Training'} Assistant</span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: TEXT_SEC,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: 1,
            }}
          >
            {loading ? 'Via is thinking...' : briefText}
          </div>
        </div>

        {!expanded && (
          <div onClick={event => event.stopPropagation()} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              placeholder="Ask Via..."
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && input.trim()) void sendMessage()
              }}
              onClick={event => {
                event.stopPropagation()
                setExpanded(true)
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                border: `0.5px solid ${BORDER}`,
                fontSize: 12,
                fontFamily: 'Arial, sans-serif',
                outline: 'none',
                color: TEXT,
                background: WARM_BG,
                width: 160,
              }}
            />
            <button
              type="button"
              onClick={event => {
                event.stopPropagation()
                if (input.trim()) void sendMessage()
              }}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: input.trim() ? TEAL : BORDER,
                border: 'none',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Send size={12} color="white" />
            </button>
          </div>
        )}

        {expanded && (
          <button
            type="button"
            onClick={event => {
              event.stopPropagation()
              setExpanded(false)
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: TEXT_MUTED,
              display: 'flex',
              alignItems: 'center',
              padding: 4,
            }}
          >
            <ChevronDown size={16} />
          </button>
        )}
      </div>

      {expanded && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'white',
            border: '0.5px solid hsl(168,62%,60%)',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 14px 36px rgba(0,0,0,0.14)',
          }}
        >
          <div
            ref={messagesContainerRef}
            style={{
              maxHeight: 'min(360px, calc(100vh - 220px))',
              minHeight: 180,
              overflowY: 'auto',
              padding: '14px 14px 8px',
              background: WARM_BG,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {messages.length === 0 && (
              <div>
                <div
                  style={{
                    padding: '10px 13px',
                    borderRadius: '10px 10px 10px 3px',
                    background: 'white',
                    border: `0.5px solid ${BORDER}`,
                    fontSize: 13,
                    color: TEXT,
                    lineHeight: 1.5,
                    marginBottom: 10,
                  }}
                >
                  {role === 'coach'
                    ? "Hey Coach! I'm Via. I know your roster and can help with events, lessons, drill plans, and player priorities."
                    : `Hey ${playerFirstName || 'there'}! I'm Via. I know your training history and can help you improve, find events, and prepare for lessons.`}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {suggestions.map(question => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void sendMessage(question)}
                      style={{
                        fontSize: 11,
                        padding: '5px 10px',
                        borderRadius: 999,
                        border: `0.5px solid ${TEAL}`,
                        background: TEAL_LIGHT,
                        color: TEAL,
                        cursor: 'pointer',
                        fontFamily: 'Arial, sans-serif',
                        fontWeight: 500,
                      }}
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
                    maxWidth: '88%',
                    padding: '9px 12px',
                    borderRadius: message.role === 'user' ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
                    background: message.isSuccess && message.role === 'assistant' ? 'hsl(145,60%,97%)' : message.role === 'user' ? TEAL : 'white',
                    border:
                      message.role === 'user'
                        ? 'none'
                        : message.isSuccess
                          ? '0.5px solid hsl(145,60%,70%)'
                          : `0.5px solid ${BORDER}`,
                    fontSize: 12,
                    color: message.role === 'user' ? 'white' : TEXT,
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {message.role === 'assistant' && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: TEAL, display: 'block', marginBottom: 3 }}>Via</span>
                  )}
                  {message.content}
                </div>

                {message.events && message.events.length > 0 && (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {message.events.map((event, eventIndex) => (
                      <div
                        key={`${event.title}-${eventIndex}`}
                        style={{
                          background: 'white',
                          border: `0.5px solid ${BORDER}`,
                          borderRadius: 10,
                          padding: '10px 12px',
                          fontSize: 12,
                        }}
                      >
                        <div style={{ fontWeight: 600, color: TEXT, marginBottom: 3 }}>{event.title}</div>
                        <div style={{ color: TEXT_SEC, fontSize: 11, marginBottom: 6 }}>
                          {event.start_date ? `${event.start_date} · ` : ''}
                          {event.location_city}
                          {event.location_state ? `, ${event.location_state}` : ''}
                          {event.price ? ` · $${event.price}` : ''}
                          {event.distance_estimate ? ` · ${event.distance_estimate}` : ''}
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {role === 'coach' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEvent(event)
                                setPendingAction({ type: 'notify_players', event })
                                setMessages(prev => [
                                  ...prev,
                                  {
                                    role: 'assistant',
                                    content: `Select players to notify about "${event.title || 'this event'}":`,
                                    isAction: true,
                                    showPlayerPicker: true,
                                  },
                                ])
                              }}
                              style={{
                                flex: 1,
                                padding: '5px 8px',
                                borderRadius: 6,
                                background: TEAL,
                                color: 'white',
                                border: 'none',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: 'Arial, sans-serif',
                              }}
                            >
                              Notify players
                            </button>
                          )}
                          {event.registration_url && (
                            <a
                              href={event.registration_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '5px 10px',
                                borderRadius: 6,
                                background: WARM_BG,
                                border: `0.5px solid ${BORDER}`,
                                color: TEXT_SEC,
                                fontSize: 11,
                                textDecoration: 'none',
                                fontFamily: 'Arial, sans-serif',
                              }}
                            >
                              View
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {message.showPlayerPicker && role === 'coach' && (
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                      {playerList.map(player => (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() =>
                            setSelectedPlayers(prev =>
                              prev.includes(player.id) ? prev.filter(id => id !== player.id) : [...prev, player.id],
                            )
                          }
                          style={{
                            padding: '5px 10px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: 'pointer',
                            fontFamily: 'Arial, sans-serif',
                            border: `0.5px solid ${selectedPlayers.includes(player.id) ? TEAL : BORDER}`,
                            background: selectedPlayers.includes(player.id) ? TEAL_LIGHT : 'white',
                            color: selectedPlayers.includes(player.id) ? TEAL : TEXT_SEC,
                          }}
                        >
                          {player.name}
                        </button>
                      ))}
                    </div>
                    {selectedPlayers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (pendingAction && selectedEvent) {
                            void handleAction({ ...pendingAction, playerIds: selectedPlayers, event: selectedEvent })
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: 8,
                          background: TEAL,
                          color: 'white',
                          border: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'Arial, sans-serif',
                        }}
                      >
                        Notify {selectedPlayers.length} player{selectedPlayers.length !== 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                )}

                {message.action && !message.events && !message.showPlayerPicker && (
                  <button
                    type="button"
                    onClick={() => void handleAction(message.action || null)}
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
                  >
                    {message.action.playerName || 'Take action'}
                    <ArrowRight size={11} />
                  </button>
                )}
              </div>
            ))}

            {loading && (
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  padding: '6px 12px',
                  background: 'white',
                  borderRadius: '10px 10px 10px 3px',
                  width: 'fit-content',
                  border: `0.5px solid ${BORDER}`,
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
                      animation: `viaBounce 1.2s ease-in-out ${index * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderTop: `0.5px solid ${BORDER}`,
              background: 'white',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void sendMessage()
                }
              }}
              placeholder="Ask Via anything..."
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 10,
                border: `0.5px solid ${BORDER}`,
                fontSize: 13,
                fontFamily: 'Arial, sans-serif',
                outline: 'none',
                color: TEXT,
                background: WARM_BG,
              }}
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: input.trim() && !loading ? TEAL : BORDER,
                border: 'none',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Send size={14} color="white" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes viaBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
