'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import ViaDrillSaveCard from '@/components/ViaDrillSaveCard'
import { ViaPanelStyles } from '@/components/ViaPanel'
import { glass } from '@/lib/glass'
import {
  VIA_BORDER,
  VIA_TEAL,
  VIA_TEXT,
  VIA_TEXT_MUTED,
  VIA_TEXT_SEC,
  VIA_WARM_BG,
} from '@/lib/via-ui'
import type { ViaCreateDrill } from '@/lib/via-drill'
import ViaBlob from '@/components/ViaBlob'
import ViaSchoolSuggestionsCard from '@/components/ViaSchoolSuggestionsCard'
import type {
  ViaShowPlayersPayload,
  ViaShowRecruitingPayload,
  ViaSuggestSchoolsPayload,
} from '@/lib/via-universal-parse'
import {
  generatePageBrief,
  generatePlayerPageBrief,
  type CoachBriefContext,
  type PageContext,
} from '@/lib/via-page-brief'
import { useViaContextOptional } from '@/components/via/UniversalViaContext'
import { formatContextChipLabel } from '@/lib/via-anchor-context'

export type { PageContext }

const TEAL = VIA_TEAL
const TEAL_DARK = '#085041'
const TEAL_LIGHT = 'hsl(168,62%,95%)'
const BORDER = VIA_BORDER
const TEXT = VIA_TEXT
const TEXT_SEC = VIA_TEXT_SEC
const TEXT_MUTED = VIA_TEXT_MUTED
const WARM_BG = VIA_WARM_BG
const VIA_CARD_MAX_HEIGHT = 480

type Role = 'coach' | 'player'

export type ReelSessionContext = {
  id: string
  shot_type?: string | null
  top_issue?: string | null
  overall_score?: number | null
  source?: string
  analyzed_at?: string
  sport?: string
}

export type UniversalViaReelContext = {
  playerName?: string | null
  selectedSession: ReelSessionContext | null
  sessionCount: number
  onUploadVideo: (file: File) => void
  onTextReel: (text: string) => void
}

type UniversalViaProps = {
  role: Role
  playerId?: string
  playerName?: string
  pageContext?: PageContext
  embedded?: boolean
  reelContext?: UniversalViaReelContext
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
  createDrill?: ViaCreateDrill
  showPlayers?: ViaShowPlayersPayload
  showRecruiting?: ViaShowRecruitingPayload
  suggestSchools?: ViaSuggestSchoolsPayload
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

export default function UniversalVia({
  role,
  playerId,
  playerName,
  pageContext,
  embedded = false,
  reelContext,
}: UniversalViaProps) {
  const pathname = usePathname()
  const [brief, setBrief] = useState('')
  const [quickPrompts, setQuickPrompts] = useState<string[]>([])
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
  const [isMobile, setIsMobile] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const [coachBriefCtx, setCoachBriefCtx] = useState<CoachBriefContext | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const viaCtx = useViaContextOptional()
  const [isPrefilled, setIsPrefilled] = useState(false)
  const pendingAnchorContextRef = useRef<string | null>(null)

  useEffect(() => {
    const prompt = viaCtx?.prefilledPrompt
    if (!prompt) return
    setInput(prompt)
    setIsPrefilled(true)
    pendingAnchorContextRef.current = viaCtx.prefilledContext
    if (isMobile && !embedded) setMobileExpanded(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [viaCtx?.prefilledPrompt, viaCtx?.prefilledContext, isMobile, embedded])

  function handleInputChange(value: string) {
    setInput(value)
    if (isPrefilled) {
      setIsPrefilled(false)
      viaCtx?.clearPrefill()
    }
  }

  const loadCoachContext = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setBriefLoading(false)
      return
    }

    const [{ data: players }, { data: sessions }, { data: lessons }, { data: unverified }] =
      await Promise.all([
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
        supabase
          .from('analysis_sessions')
          .select('id')
          .eq('coach_verified', false)
          .limit(100),
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
    setCoachBriefCtx({
      players: safePlayers.map(p => ({
        id: p.id,
        name: p.name || 'Player',
      })),
      recentSessions: safeSessions.filter(
        (s): s is AnalysisSession & { player_id: string } =>
          Boolean(s.player_id),
      ),
      upcomingLessons: safeLessons,
      unverifiedAnalyses: unverified || [],
    })
    setBriefLoading(false)
  }, [supabase])

  useEffect(() => {
    if (role === 'coach') {
      void loadCoachContext()
    }
  }, [loadCoachContext, role])

  useEffect(() => {
    if (role === 'coach' && coachBriefCtx) {
      const { brief: b, prompts } = generatePageBrief(coachBriefCtx, pageContext)
      setBrief(b)
      setQuickPrompts(prompts)
      return
    }
    if (role === 'player' && pageContext) {
      const { brief: b, prompts } = generatePlayerPageBrief(pageContext)
      setBrief(b)
      setQuickPrompts(prompts)
      setBriefLoading(false)
      return
    }
    if (role === 'player' && reelContext && !pageContext) {
      setBriefLoading(false)
      const sel = reelContext.selectedSession
      if (sel) {
        const label = sel.shot_type || sel.sport || 'session'
        setBrief(
          `You're viewing your ${label} reel from ${sel.analyzed_at ? format(new Date(sel.analyzed_at), 'MMM d') : 'recently'}.` +
            (sel.top_issue
              ? ` Top issue: ${sel.top_issue}. Ask me anything about it.`
              : ' Ask me what to work on next.'),
        )
        setQuickPrompts([
          'What stands out in this reel?',
          'How do I fix my top issue?',
          'Compare this to my last session',
        ])
      } else {
        setBrief(
          reelContext.sessionCount > 0
            ? `You have ${reelContext.sessionCount} reel${reelContext.sessionCount === 1 ? '' : 's'}. Select one to get specific feedback, or upload a new session.`
            : 'Upload a video or describe a session — Via will analyze your technique.',
        )
        setQuickPrompts([
          'What should I work on next?',
          'Explain my top issue',
          'How do I add a new reel?',
        ])
      }
      return
    }
    if (role === 'player') {
      setBriefLoading(false)
      setBrief('Ask Via anything about your training.')
      setQuickPrompts(['How am I improving?', 'Add a reel', 'Show my drills'])
    }
  }, [role, coachBriefCtx, pageContext, reelContext])

  useEffect(() => {
    if (embedded && messages.length === 0) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, embedded])

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
    if (!msg || loading) return
    const canChat =
      role === 'coach' || (role === 'player' && (pageContext || reelContext))
    if (!canChat) return

    if (isMobile && !embedded) setMobileExpanded(true)

    const anchorContext = pendingAnchorContextRef.current
    if (isPrefilled) {
      setIsPrefilled(false)
      viaCtx?.clearPrefill()
    }
    pendingAnchorContextRef.current = null

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
          role,
          message: msg,
          context: anchorContext ?? undefined,
          pageContext,
          currentPath: pathname,
          rosterContext:
            role === 'coach'
              ? { ...(rosterContext || {}), currentPage: pathname }
              : undefined,
          playerContext:
            role === 'player'
              ? {
                  playerId,
                  playerName: playerName || reelContext?.playerName,
                  page: pathname,
                  sessionCount: reelContext?.sessionCount,
                  selectedSession: reelContext?.selectedSession,
                  ...pageContext,
                }
              : undefined,
          history: messages.slice(-8).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })
      const data = (await response.json()) as {
        response?: string
        createDrill?: ViaCreateDrill | null
        showPlayers?: ViaShowPlayersPayload | null
        showRecruiting?: ViaShowRecruitingPayload | null
        suggestSchools?: ViaSuggestSchoolsPayload | null
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
          suggestSchools: data.suggestSchools || undefined,
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

  const canRender =
    role === 'coach' ||
    (role === 'player' && (pageContext || (embedded && reelContext)))

  if (!canRender) return null

  const mobileFullscreen = isMobile && (embedded || mobileExpanded)
  const showMessagesPane = messages.length > 0 || loading
  const showCollapsedMobile = isMobile && !embedded && !mobileExpanded

  const cardStyle: CSSProperties = mobileFullscreen
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
      }
    : showCollapsedMobile
      ? {
          background: 'rgba(255,255,255,.52)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255,255,255,.65)',
          borderRadius: 16,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          boxShadow: '0 2px 16px rgba(29,158,117,.06)',
        }
      : {
          position: 'relative',
          background: 'rgba(255,255,255,.52)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255,255,255,.65)',
          borderRadius: 16,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: VIA_CARD_MAX_HEIGHT,
          minHeight: messages.length > 0 ? 340 : undefined,
          boxShadow:
            '0 2px 16px rgba(29,158,117,.06), 0 1px 0 rgba(255,255,255,.8) inset',
        }

  if (showCollapsedMobile) {
    return (
      <div style={{ marginBottom: embedded ? 14 : 24 }}>
        <ViaPanelStyles />
        <div
          role="button"
          tabIndex={0}
          onClick={() => setMobileExpanded(true)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') setMobileExpanded(true)
          }}
          style={cardStyle}
        >
          <div
            style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <ViaBlob size={30} thinking={briefLoading} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: TEXT }}>Via</div>
              <div
                style={{
                  fontSize: 12,
                  color: TEXT_MUTED,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {briefLoading ? 'Loading…' : brief || 'Tap to open Via'}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: mobileFullscreen ? 0 : embedded ? 14 : 24 }}>
      <ViaPanelStyles />
      <div style={cardStyle}>
        {mobileFullscreen && (
          <div
            style={{
              background:
                'linear-gradient(135deg,#E1F5EE 0%,#EEF0FE 55%,#F5EFFE 100%)',
              padding: '12px 18px',
              borderBottom: '0.5px solid rgba(29,158,117,.12)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            <ViaBlob size={30} thinking={loading} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: TEXT }}>Via</div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                {role === 'coach' ? 'coaching assistant' : 'your assistant'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileExpanded(false)}
              aria-label="Close Via"
              style={{
                background: 'rgba(0,0,0,.06)',
                border: 'none',
                borderRadius: 8,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={TEXT_SEC}
                strokeWidth="2"
              >
                <polyline points="18 15 12 21 6 15" />
              </svg>
            </button>
          </div>
        )}
        {mobileFullscreen && brief && messages.length === 0 && (
          <div
            style={{
              padding: '12px 18px',
              background: WARM_BG,
              borderBottom: `0.5px solid ${BORDER}`,
              flexShrink: 0,
            }}
          >
            <p style={{ fontSize: 13, color: TEXT, lineHeight: 1.65, margin: '0 0 10px' }}>
              {stripMarkdown(brief)}
            </p>
            {quickPrompts.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {quickPrompts.map((qp, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => void sendMessage(qp)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: `0.5px solid ${BORDER}`,
                      background: 'white',
                      fontSize: 12,
                      color: TEXT,
                      cursor: 'pointer',
                      fontFamily: 'Arial, sans-serif',
                    }}
                  >
                    {qp}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {!mobileFullscreen && (
        <div
          style={{
            background:
              'linear-gradient(135deg, rgba(29,158,117,.08) 0%, rgba(100,80,220,.04) 55%, rgba(120,60,200,.03) 100%)',
            padding: '16px 20px 14px',
            flexShrink: 0,
            overflow: 'hidden',
            position: 'relative',
            zIndex: 1,
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
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <ViaBlob size={36} thinking={loading || briefLoading} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontFamily:
                      'var(--font-dm-serif), "DM Serif Display", Georgia, serif',
                    fontStyle: 'italic',
                    fontSize: 15,
                    color: '#1D9E75',
                  }}
                >
                  Via
                </span>
                <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                  · {role === 'coach' ? 'coaching assistant' : 'your assistant'}
                </span>
              </div>
              {brief && messages.length === 0 && !briefLoading && (
                <p
                  style={{
                    fontSize: 13,
                    color: TEXT,
                    lineHeight: 1.65,
                    margin: '0 0 10px',
                  }}
                >
                  {stripMarkdown(brief)}
                </p>
              )}
              {briefLoading && messages.length === 0 && (
                <p style={{ fontSize: 13, color: TEXT_MUTED, margin: '0 0 10px' }}>
                  Loading…
                </p>
              )}
              {messages.length === 0 && !briefLoading && quickPrompts.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {quickPrompts.map((qp, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => void sendMessage(qp)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '0.5px solid rgba(29,158,117,.25)',
                        background: 'rgba(255,255,255,.6)',
                        fontSize: 12,
                        color: TEAL_DARK,
                        cursor: 'pointer',
                        fontFamily: 'Arial, sans-serif',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {qp}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {(showMessagesPane || mobileFullscreen) && (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '12px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              background: '#ffffff',
              borderTop: `0.5px solid ${BORDER}`,
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

                {message.suggestSchools &&
                  message.suggestSchools.schools?.length > 0 && (
                    <div style={{ width: '100%' }}>
                      <ViaSchoolSuggestionsCard
                        schools={message.suggestSchools.schools}
                        readOnly
                      />
                      <p
                        style={{
                          fontSize: 10,
                          color: TEXT_SEC,
                          margin: '6px 0 0',
                          fontStyle: 'italic',
                        }}
                      >
                        Via suggested — coach verify in recruiting profile
                      </p>
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
            padding: '10px 16px',
            borderTop:
              messages.length > 0 ? `0.5px solid ${BORDER}` : mobileFullscreen ? 'none' : 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            background: mobileFullscreen ? 'white' : 'rgba(255,255,255,.5)',
            flexShrink: 0,
            paddingBottom: mobileFullscreen
              ? 'calc(10px + env(safe-area-inset-bottom, 0px))'
              : undefined,
          }}
        >
          {isPrefilled && viaCtx?.prefilledContext && (
            <div
              style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: 10,
                fontWeight: 600,
                color: TEAL_DARK,
                padding: '4px 10px',
                borderRadius: 999,
                background: TEAL_LIGHT,
                border: `0.5px solid rgba(45,155,127,0.35)`,
                width: 'fit-content',
              }}
            >
              {formatContextChipLabel(viaCtx.prefilledContext)}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              position: 'relative',
              borderRadius: 12,
              border: isPrefilled ? '2px solid #2D9B7F' : 'none',
              boxShadow: isPrefilled
                ? '0 0 0 3px rgba(45,155,127,0.18), 0 4px 16px rgba(45,155,127,0.12)'
                : 'none',
              padding: isPrefilled ? 4 : 0,
              transition: 'border 0.2s, box-shadow 0.2s',
            }}
          >
            {isPrefilled && (
              <>
                <style>{`
                  @keyframes viaPrefillPulse {
                    0%, 100% { opacity: 0.5; transform: scale(0.92); }
                    50% { opacity: 1; transform: scale(1); }
                  }
                `}</style>
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: '#22C55E',
                    boxShadow: '0 0 0 2px white',
                    animation: 'viaPrefillPulse 1.4s infinite',
                    zIndex: 2,
                  }}
                />
              </>
            )}
            {role === 'player' && reelContext && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 10,
                    background: TEAL,
                    border: 'none',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: 8,
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  Upload video to analyze
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) reelContext.onUploadVideo(file)
                  }}
                />
              </>
            )}
            {role === 'player' && reelContext && input.trim() && (
              <button
                type="button"
                onClick={() => {
                  reelContext.onTextReel(input.trim())
                  setInput('')
                }}
                style={{
                  width: '100%',
                  padding: '7px',
                  marginBottom: 8,
                  borderRadius: 8,
                  background: WARM_BG,
                  border: `0.5px solid ${BORDER}`,
                  color: TEXT_SEC,
                  fontSize: 11,
                  cursor: 'pointer',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                Log as new text reel →
              </button>
            )}
            <input
              ref={inputRef}
              value={input}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void sendMessage()
                }
              }}
              disabled={loading}
              placeholder={
                role === 'player' && reelContext
                  ? reelContext.selectedSession
                    ? 'Ask about this reel...'
                    : 'Ask Via or describe a session...'
                  : role === 'coach'
                    ? 'Ask Via about players, lessons, drills, recruiting...'
                    : 'Ask Via anything...'
              }
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: 10,
                border: '0.5px solid rgba(29,158,117,.25)',
                background: 'rgba(255,255,255,.7)',
                fontSize: 13,
                color: TEXT,
                fontFamily: 'Arial, sans-serif',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={!input.trim() || loading}
              aria-label="Send message"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: input.trim() && !loading ? TEAL : 'rgba(29,158,117,.3)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
