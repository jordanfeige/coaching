'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import ViaDrillSaveCard from '@/components/ViaDrillSaveCard'
import {
  ViaPanelBrief,
  ViaPanelInput,
  ViaPanelRow,
  ViaPanelStyles,
  ViaPanelTitleRow,
  ViaPanelChip,
} from '@/components/ViaPanel'
import { glass } from '@/lib/glass'
import { VIA_BORDER, VIA_TEAL, VIA_TEXT, VIA_TEXT_SEC, VIA_WARM_BG } from '@/lib/via-ui'
import type { ViaCreateDrill } from '@/lib/via-drill'
import type { ViaShowPlayersPayload, ViaShowRecruitingPayload } from '@/lib/via-universal-parse'

const TEAL = VIA_TEAL
const TEAL_LIGHT = 'hsl(168,62%,95%)'
const BORDER = VIA_BORDER
const TEXT = VIA_TEXT
const TEXT_SEC = VIA_TEXT_SEC
const WARM_BG = VIA_WARM_BG

const QUICK_PROMPTS = [
  'Who needs my attention today?',
  'Find tournaments near me',
  'Schedule a lesson',
  'Build a session plan',
]

type Role = 'coach' | 'player'

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
  createDrill?: ViaCreateDrill
  showPlayers?: ViaShowPlayersPayload
  showRecruiting?: ViaShowRecruitingPayload
  events?: EventListing[]
  isAction?: boolean
  isSuccess?: boolean
  showPlayerPicker?: boolean
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`(.*?)`/g, '$1')
    .replace(/^[-*]\s+/gm, '· ')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

type PlayerOption = {
  id: string
  name: string | null
  sport: string | null
  skill_level?: string | null
}

type AnalysisSession = {
  player_id?: string | null
  overall_score?: number | null
  analyzed_at?: string | null
  top_issue?: string | null
}

type UpcomingLesson = {
  id: string
  starts_at: string
  status?: string | null
  players?: { name?: string | null } | null
}

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

function buildFallbackBrief(context: {
  totalPlayers: number
  needsAttentionCount: number
  upcomingCount: number
  firstAttentionName?: string | null
  nextLesson?: { playerName: string; when: string } | null
}) {
  const parts: string[] = []
  if (context.totalPlayers === 0) {
    return 'Add your first player to start building your roster — Via can help you schedule lessons and plan sessions.'
  }
  parts.push(`You have ${context.totalPlayers} player${context.totalPlayers === 1 ? '' : 's'}`)
  if (context.upcomingCount > 0 && context.nextLesson) {
    parts.push(
      `${context.upcomingCount} upcoming lesson${context.upcomingCount === 1 ? '' : 's'} (next: ${context.nextLesson.playerName}, ${context.nextLesson.when})`,
    )
  } else {
    parts.push('no lessons on the calendar yet')
  }
  if (context.needsAttentionCount > 0 && context.firstAttentionName) {
    parts.push(
      `${context.needsAttentionCount} need${context.needsAttentionCount === 1 ? 's' : ''} attention — start with ${context.firstAttentionName}`,
    )
  } else {
    parts.push('your roster looks on track')
  }
  return `${parts[0]}, ${parts[1]}, and ${parts[2]}.`
}

export default function UniversalVia({ role }: { role: Role }) {
  const [brief, setBrief] = useState('')
  const [briefLoading, setBriefLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [rosterContext, setRosterContext] = useState<Record<string, unknown> | null>(null)
  const [playerList, setPlayerList] = useState<PlayerOption[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<ViaAction | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventListing | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const loadCoachContext = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setBriefLoading(false)
      return
    }

    const [{ data: players }, { data: sessions }, { data: lessons }] = await Promise.all([
      supabase.from('players').select('id, name, sport, skill_level, email').order('name'),
      supabase
        .from('analysis_sessions')
        .select('player_id, overall_score, analyzed_at, top_issue')
        .order('analyzed_at', { ascending: false })
        .limit(50),
      supabase
        .from('lessons')
        .select('id, starts_at, status, players(name)')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(5),
    ])

    const safePlayers = (players || []) as PlayerOption[]
    const safeSessions = (sessions || []) as AnalysisSession[]
    const safeLessons = (lessons || []) as UpcomingLesson[]

    const playerMap = safePlayers.map(player => {
      const playerSessions = safeSessions.filter(session => session.player_id === player.id)
      const latest = playerSessions[0]
      const previous = playerSessions[1]
      const daysSince = latest?.analyzed_at
        ? Math.floor((Date.now() - new Date(latest.analyzed_at).getTime()) / 86400000)
        : 999
      const delta =
        typeof latest?.overall_score === 'number' && typeof previous?.overall_score === 'number'
          ? latest.overall_score - previous.overall_score
          : null
      return {
        id: player.id,
        name: player.name,
        sport: player.sport,
        latestScore: latest?.overall_score ?? null,
        topIssue: latest?.top_issue ?? null,
        delta,
        daysSince,
        needsAttention: (delta !== null && delta <= -5) || daysSince >= 14,
      }
    })

    const needsAttention = playerMap.filter(player => player.needsAttention)
    const upcomingLessons = safeLessons.map(lesson => ({
      id: lesson.id,
      startsAt: lesson.starts_at,
      status: lesson.status,
      playerName: lesson.players?.name || 'Player',
    }))

    const context = {
      role: 'coach',
      totalPlayers: safePlayers.length,
      needsAttentionCount: needsAttention.length,
      upcomingLessonCount: safeLessons.length,
      upcomingLessons,
      players: playerMap,
    }

    setPlayerList(safePlayers)
    setRosterContext(context)

    const nextLesson = safeLessons[0]
    const fallback = buildFallbackBrief({
      totalPlayers: safePlayers.length,
      needsAttentionCount: needsAttention.length,
      upcomingCount: safeLessons.length,
      firstAttentionName: needsAttention[0]?.name,
      nextLesson: nextLesson
        ? {
            playerName: nextLesson.players?.name || 'a player',
            when: format(new Date(nextLesson.starts_at), 'EEE h:mm a'),
          }
        : null,
    })

    if (safePlayers.length === 0) {
      setBrief(fallback)
      setBriefLoading(false)
      return
    }

    try {
      const res = await fetch('/api/coaching-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      })
      const data = (await res.json()) as { brief?: string }
      setBrief(data.brief?.trim() || fallback)
    } catch {
      setBrief(fallback)
    } finally {
      setBriefLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (role !== 'coach') {
      setBriefLoading(false)
      setBrief('Ask Via anything about your training.')
      return
    }
    void loadCoachContext()
  }, [loadCoachContext, role])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    function handleViaOpen(event: Event) {
      const detail = (event as CustomEvent<{ prompt?: string }>).detail
      if (detail?.prompt) {
        setInput(detail.prompt)
        void sendMessage(detail.prompt)
      }
    }
    window.addEventListener('open-via-chat', handleViaOpen)
    return () => window.removeEventListener('open-via-chat', handleViaOpen)
  })

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
              content:
                events.length > 0
                  ? `Found ${events.length} upcoming events:`
                  : 'No events found nearby. Try a larger radius.',
              events,
              isAction: true,
            },
          ])
        } catch {
          setMessages(prev => [
            ...prev.slice(0, -1),
            { role: 'assistant', content: 'I could not search events right now.', isAction: true },
          ])
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
        {
          const count = action.playerIds?.length ?? 0
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: `Ready to notify ${count} player${count === 1 ? '' : 's'}.`,
              isSuccess: true,
            },
          ])
        }
        setSelectedPlayers([])
        setSelectedEvent(null)
        setPendingAction(null)
        break
      case 'schedule':
        router.push(action.playerId ? `/dashboard/schedule?player=${action.playerId}` : '/dashboard/schedule')
        break
      case 'drill':
        router.push(
          action.playerId
            ? `/dashboard/players/${action.playerId}?tab=drills&focus=${encodeURIComponent(action.focus || '')}`
            : '/dashboard/players',
        )
        break
      case 'viewPlayer':
        if (action.playerId) router.push(`/dashboard/players/${action.playerId}`)
        break
      case 'analyzeVideo':
        router.push(action.playerId ? `/dashboard/video?player=${action.playerId}` : '/dashboard/video')
        break
    }
  }

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading || role !== 'coach') return
    setInput('')
    const userMsg: Message = { role: 'user', content: msg }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)
    try {
      const response = await fetch('/api/via-universal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'coach',
          messages: newMessages,
          rosterContext: { ...rosterContext, currentPage: '/dashboard' },
        }),
      })
      const data = (await response.json()) as {
        response?: string
        createDrill?: ViaCreateDrill | null
        showPlayers?: ViaShowPlayersPayload | null
        showRecruiting?: ViaShowRecruitingPayload | null
        navigate?: string | null
      }
      if (data.navigate) {
        router.push(data.navigate)
      }
      const { text: responseText, action } = parseAction(data.response || '')
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: stripMarkdown(responseText),
          action: action || undefined,
          createDrill: data.createDrill || undefined,
          showPlayers: data.showPlayers || undefined,
          showRecruiting: data.showRecruiting || undefined,
        },
      ])
      if (action) await handleAction(action)
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (role !== 'coach') {
    return null
  }

  return (
    <div>
      <ViaPanelStyles />
      <div
        style={{
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 24,
          background: 'rgba(255,255,255,.52)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255,255,255,.65)',
          boxShadow:
            '0 2px 16px rgba(29,158,117,.06), 0 1px 0 rgba(255,255,255,.8) inset',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '8%',
            right: '8%',
            height: 1,
            background: 'rgba(255,255,255,.9)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(29,158,117,.06) 0%, rgba(100,80,220,.04) 55%, rgba(120,60,200,.03) 100%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ padding: '18px 20px 16px' }}>
          <ViaPanelRow blobSize={36} thinking={loading && !briefLoading} frameBlob>
            <ViaPanelTitleRow role="coach" mode="via" />
            <ViaPanelBrief loading={briefLoading} mode="via">
              {stripMarkdown(brief)}
            </ViaPanelBrief>
            {messages.length === 0 && !briefLoading && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                {QUICK_PROMPTS.map(question => (
                  <ViaPanelChip key={question} mode="light" onClick={() => void sendMessage(question)}>
                    {question}
                  </ViaPanelChip>
                ))}
              </div>
            )}
          </ViaPanelRow>
        </div>

        {(messages.length > 0 || loading) && (
          <div
            style={{
              maxHeight: 360,
              overflowY: 'auto',
              padding: '0 16px 12px',
              background: 'rgba(255,255,255,.35)',
              borderTop: '0.5px solid rgba(255,255,255,.45)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
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
                    background:
                      message.isSuccess && message.role === 'assistant'
                        ? 'hsl(145,60%,97%)'
                        : message.role === 'user'
                          ? TEAL
                          : 'white',
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
                    <span style={{ fontSize: 10, fontWeight: 700, color: TEAL, display: 'block', marginBottom: 3 }}>
                      Via
                    </span>
                  )}
                  {message.role === 'assistant'
                    ? stripMarkdown(message.content)
                    : message.content}
                </div>

                {message.showPlayers && message.showPlayers.players.length > 0 && (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {message.showPlayers.players.map(player => (
                      <Link
                        key={player.id}
                        href={player.href}
                        style={{
                          display: 'block',
                          background: player.urgent ? 'hsl(0,70%,97%)' : 'white',
                          border: `0.5px solid ${player.urgent ? 'hsl(0,70%,78%)' : BORDER}`,
                          borderRadius: 10,
                          padding: '10px 12px',
                          textDecoration: 'none',
                          color: TEXT,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{player.name}</span>
                          {typeof player.score === 'number' && (
                            <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>
                              {player.score}
                              {typeof player.score_delta === 'number' && player.score_delta !== 0 && (
                                <span
                                  style={{
                                    marginLeft: 4,
                                    color: player.score_delta > 0 ? 'hsl(145,60%,40%)' : 'hsl(0,70%,55%)',
                                  }}
                                >
                                  {player.score_delta > 0 ? '+' : ''}
                                  {player.score_delta}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        {player.subtitle && (
                          <div style={{ fontSize: 11, color: TEXT_SEC, marginTop: 4 }}>{player.subtitle}</div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}

                {message.showRecruiting && (
                  <Link
                    href={message.showRecruiting.href}
                    style={{
                      display: 'block',
                      width: '100%',
                      background: 'white',
                      border: `0.5px solid ${BORDER}`,
                      borderRadius: 10,
                      padding: '12px 14px',
                      textDecoration: 'none',
                      color: TEXT,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                      {message.showRecruiting.name}
                    </div>
                    <div style={{ fontSize: 11, color: TEXT_SEC, lineHeight: 1.5 }}>
                      {message.showRecruiting.wtn != null && `WTN ${message.showRecruiting.wtn}`}
                      {message.showRecruiting.national_rank != null &&
                        ` · National #${message.showRecruiting.national_rank}`}
                      {message.showRecruiting.target_division &&
                        ` · ${message.showRecruiting.target_division}`}
                      {message.showRecruiting.grad_year != null &&
                        ` · Class of ${message.showRecruiting.grad_year}`}
                    </div>
                  </Link>
                )}

                {message.createDrill && (
                  <ViaDrillSaveCard
                    drill={message.createDrill}
                    onSaved={confirmation =>
                      setMessages(prev => [
                        ...prev,
                        { role: 'assistant', content: confirmation, isSuccess: true },
                      ])
                    }
                  />
                )}

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
                        <div style={{ fontWeight: 600, color: TEXT, marginBottom: 3 }}>
                          {event.title}
                        </div>
                        <div style={{ color: TEXT_SEC, fontSize: 11 }}>
                          {event.start_date ? `${event.start_date} · ` : ''}
                          {event.location_city}
                          {event.location_state ? `, ${event.location_state}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {message.showPlayerPicker && (
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                      {playerList.map(player => (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() =>
                            setSelectedPlayers(prev =>
                              prev.includes(player.id)
                                ? prev.filter(id => id !== player.id)
                                : [...prev, player.id],
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
                    {selectedPlayers.length > 0 && pendingAction && selectedEvent && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleAction({
                            ...pendingAction,
                            playerIds: selectedPlayers,
                            event: selectedEvent,
                          })
                        }
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
                      animation: `viaPanelBounce 1.2s ease-in-out ${index * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div
          style={{
            padding: '12px 20px 14px',
            background: 'rgba(255,255,255,.6)',
            borderTop: '0.5px solid rgba(29,158,117,.1)',
          }}
        >
            <ViaPanelInput
              value={input}
              onChange={setInput}
              onSend={() => void sendMessage()}
              disabled={loading}
              mode="light"
              placeholder="Ask Via about your roster..."
            />
        </div>
        </div>
      </div>
    </div>
  )
}
