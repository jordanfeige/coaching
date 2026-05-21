'use client'

import { useCallback, useEffect, useState, useMemo, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getLinkedPlayerRowForUser } from '@/lib/linked-player'
import { format, startOfMonth, subDays } from 'date-fns'
import { typography } from '@/lib/brand'
import { PLAYER_VISIBLE_SESSIONS_FILTER } from '@/lib/analysis-sessions'
import { generatePlayerPageBrief } from '@/lib/via-page-brief'
import { TIERS } from '@/lib/journey-score'
import {
  nextTierAfter,
  pointsToNextTierFor,
} from '@/lib/journey-fetch'
import { TEAL_DARK } from '@/lib/player-home-tokens'
import HomeDesktopLayout from '@/components/player/home-desktop/HomeDesktopLayout'
import type { HomeStat } from '@/components/player/home/PlayerHomeQuickStats'
import PlayerHomeMobile from '@/components/player/PlayerHomeMobile'
import { usePageReady } from '@/contexts/PageLoadingContext'

type JourneyHome = {
  rating: number
  ratingDelta: number | null
  tier: string
  nextTier: string | null
  pointsToNext: number
}

function buildEditorialLine(recentCount: number): string {
  const hour = new Date().getHours()
  const dayPart =
    hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const day = format(new Date(), 'EEEE')
  if (recentCount <= 0) {
    return `${day} ${dayPart}. Your plan is ready when you are.`
  }
  if (recentCount === 1) {
    return `${day} ${dayPart}. One new thing to look at.`
  }
  return `${day} ${dayPart}. ${recentCount} new things to look at.`
}

function buildWelcomeMessage(opts: {
  firstName: string
  utr: number | null
  techniqueScore: number | null
  scoreDelta: number | null
  activeIssue?: string
}): ReactNode {
  const { firstName, utr, techniqueScore, scoreDelta, activeIssue } = opts

  if (utr != null) {
    return (
      <>
        Welcome back, {firstName}. Your UTR is{' '}
        <strong style={{ fontWeight: 700, color: TEAL_DARK }}>
          {utr.toFixed(2)}
        </strong>
        {scoreDelta != null && scoreDelta > 0 ? (
          <>
            {' '}
            and your technique score moved up{' '}
            <strong style={{ fontWeight: 700, color: TEAL_DARK }}>
              {scoreDelta}
            </strong>{' '}
            points recently.
          </>
        ) : (
          '.'
        )}
      </>
    )
  }

  if (techniqueScore != null && scoreDelta != null && scoreDelta > 0) {
    return (
      <>
        Welcome back, {firstName}. Your technique score is up{' '}
        <strong style={{ fontWeight: 700, color: TEAL_DARK }}>
          {scoreDelta}
        </strong>{' '}
        points
        {activeIssue ? (
          <>
            {' '}
            — still working on <em>{activeIssue}</em>.
          </>
        ) : (
          '.'
        )}
      </>
    )
  }

  if (techniqueScore != null) {
    return (
      <>
        Welcome back, {firstName}. Latest technique score{' '}
        <strong style={{ fontWeight: 700, color: TEAL_DARK }}>
          {techniqueScore}
        </strong>
        {activeIssue ? (
          <>
            {' '}
            — focus on <em>{activeIssue}</em>.
          </>
        ) : (
          '.'
        )}
      </>
    )
  }

  return (
    <>
      Welcome back, {firstName}. Upload your first reel and Via will start
      tracking your progress.
    </>
  )
}

export default function PlayerHomeClient() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [player, setPlayer] = useState<{
    id: string
    name: string | null
    sport: string | null
    utr_singles?: number | null
  } | null>(null)
  const [utrFromJourney, setUtrFromJourney] = useState<number | null>(null)
  const [sessions, setSessions] = useState<Array<Record<string, unknown>>>([])
  const [sessionsThisMonth, setSessionsThisMonth] = useState(0)
  const [drillCount, setDrillCount] = useState(0)
  const [drills, setDrills] = useState<Array<Record<string, unknown>>>([])
  const [lessons, setLessons] = useState<Array<Record<string, unknown>>>([])
  const [journey, setJourney] = useState<JourneyHome | null>(null)
  const [recentActivityCount, setRecentActivityCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const reloadHomeData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const playerData = await getLinkedPlayerRowForUser(supabase, user.id)
    if (!playerData?.id) return

    setPlayer({
      id: playerData.id,
      name: playerData.name,
      sport: playerData.sport,
      utr_singles:
        typeof playerData.utr_singles === 'number'
          ? playerData.utr_singles
          : null,
    })

    const playerId = playerData.id
    const monthStart = startOfMonth(new Date()).toISOString()
    const threeDaysAgo = subDays(new Date(), 3).toISOString()
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString()

    const [
      { data: sessionRows },
      { count: monthSessionCount },
      { count: allDrillCount },
      { data: drillRows },
      { data: lessonRows },
      { data: latestRating },
      { data: monthAgoRating },
      { count: recentSessions },
      { data: utrInput },
    ] = await Promise.all([
      supabase
        .from('analysis_sessions')
        .select('*')
        .eq('player_id', playerId)
        .or(PLAYER_VISIBLE_SESSIONS_FILTER)
        .order('analyzed_at', { ascending: true }),
      supabase
        .from('analysis_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', playerId)
        .or(PLAYER_VISIBLE_SESSIONS_FILTER)
        .gte('analyzed_at', monthStart),
      supabase
        .from('drills')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', playerId),
      supabase
        .from('drills')
        .select('id, title, description, completed_at')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('lessons')
        .select('*')
        .eq('player_id', playerId)
        .eq('status', 'scheduled')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(1),
      supabase
        .from('journey_ratings')
        .select('total, tier')
        .eq('player_id', playerId)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('journey_ratings')
        .select('total')
        .eq('player_id', playerId)
        .lt('computed_at', thirtyDaysAgo)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('analysis_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', playerId)
        .or(PLAYER_VISIBLE_SESSIONS_FILTER)
        .gte('analyzed_at', threeDaysAgo),
      supabase
        .from('journey_score_inputs')
        .select('value_numeric')
        .eq('player_id', playerId)
        .eq('category', 'tennis')
        .eq('input_key', 'utr_rating')
        .maybeSingle(),
    ])

    setSessions(sessionRows || [])
    setSessionsThisMonth(monthSessionCount ?? 0)
    setDrillCount(allDrillCount ?? 0)
    setDrills(drillRows || [])
    setLessons(lessonRows || [])

    if (utrInput?.value_numeric != null) {
      setUtrFromJourney(Number(utrInput.value_numeric))
    } else if (typeof playerData.utr_singles === 'number') {
      setUtrFromJourney(playerData.utr_singles)
    }

    const ratingTotal = latestRating ? Number(latestRating.total) : 0
    const tierLabel =
      latestRating?.tier ??
      TIERS.find(t => ratingTotal >= t.minRating)?.label ??
      TIERS[0].label
    const ratingDelta =
      latestRating && monthAgoRating
        ? Number(
            (
              Number(latestRating.total) - Number(monthAgoRating.total)
            ).toFixed(1),
          )
        : null

    setJourney({
      rating: ratingTotal,
      ratingDelta,
      tier: tierLabel,
      nextTier: nextTierAfter(tierLabel),
      pointsToNext: pointsToNextTierFor(ratingTotal),
    })

    let recent = recentSessions ?? 0
    if (drillRows && drillRows.length > 0) recent += 1
    setRecentActivityCount(recent)
  }, [supabase])

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
        utr_singles:
          typeof playerData.utr_singles === 'number'
            ? playerData.utr_singles
            : null,
      })

      await reloadHomeData()
      setLoading(false)
    }
    void load()
  }, [router, supabase, reloadHomeData])

  useEffect(() => {
    function onUtrUpdated() {
      void reloadHomeData()
    }
    window.addEventListener('playvia:utr-updated', onUtrUpdated)
    return () => window.removeEventListener('playvia:utr-updated', onUtrUpdated)
  }, [reloadHomeData])

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

  const currentScore =
    typeof latest?.overall_score === 'number' ? latest.overall_score : null
  const delta =
    currentScore !== null &&
    previous &&
    typeof previous.overall_score === 'number'
      ? currentScore - previous.overall_score
      : null

  const firstName = player?.name?.split(' ')[0] || 'there'
  const utr =
    utrFromJourney ??
    (typeof player?.utr_singles === 'number' ? player.utr_singles : null)

  const { prompts } = generatePlayerPageBrief({
    page: 'player-home',
    techniqueScore: currentScore ?? undefined,
    scoreDelta: delta ?? undefined,
    activeIssue:
      typeof latest?.top_issue === 'string' ? latest.top_issue : undefined,
    sessionCount: sortedSessions.length,
    utrSingles: utr ?? undefined,
  })

  const stats: HomeStat[] = [
    {
      label: 'Sessions',
      value: String(sessionsThisMonth),
      delta: null,
      positive: null,
      source: 'This month',
    },
    {
      label: 'Reels',
      value: String(sortedSessions.length),
      delta: null,
      positive: null,
      source: 'Analyzed',
    },
    {
      label: 'Drills done',
      value: String(drillCount),
      delta: null,
      positive: null,
      source: 'All time',
    },
  ]

  const upcomingDrill = drills[0]
  const nextLesson = lessons[0]
  const nextLessonDate =
    nextLesson && typeof nextLesson.starts_at === 'string'
      ? new Date(nextLesson.starts_at)
      : null

  usePageReady(!loading)

  if (loading) {
    return null
  }

  if (!player) {
    return (
      <div style={{ fontFamily: 'system-ui', color: '#111827', padding: '40px 0' }}>
        <h1 style={{ ...typography.greeting, fontSize: 22, marginBottom: 8 }}>
          Welcome to Playvia
        </h1>
        <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
          Your coach hasn&apos;t linked a player profile to this account yet. Ask
          them to send you an invite, then come back here to see your progress.
        </p>
      </div>
    )
  }

  const mobileProps = {
    player,
    journey,
    stats,
    drill: upcomingDrill
      ? {
          id: String(upcomingDrill.id),
          title: String(upcomingDrill.title),
          description:
            typeof upcomingDrill.description === 'string'
              ? upcomingDrill.description
              : null,
          completed_at:
            typeof upcomingDrill.completed_at === 'string'
              ? upcomingDrill.completed_at
              : null,
        }
      : null,
    lesson:
      nextLesson && nextLessonDate
        ? {
            startsAt: nextLessonDate,
            notes:
              typeof nextLesson.notes === 'string' ? nextLesson.notes : null,
          }
        : null,
    welcomeMessage: buildWelcomeMessage({
      firstName,
      utr,
      techniqueScore: currentScore,
      scoreDelta: delta,
      activeIssue:
        typeof latest?.top_issue === 'string' ? latest.top_issue : undefined,
    }),
    prompts,
    sessions: sortedSessions,
    currentScore,
    delta,
  }

  const desktopProps = {
    playerId: player.id,
    playerName: player.name ?? firstName,
    firstName,
    editorialLine: buildEditorialLine(recentActivityCount),
    welcomeMessage: buildWelcomeMessage({
      firstName,
      utr,
      techniqueScore: currentScore,
      scoreDelta: delta,
      activeIssue:
        typeof latest?.top_issue === 'string' ? latest.top_issue : undefined,
    }),
    prompts,
    stats,
    drill: upcomingDrill
      ? {
          id: String(upcomingDrill.id),
          title: String(upcomingDrill.title),
          description:
            typeof upcomingDrill.description === 'string'
              ? upcomingDrill.description
              : null,
          completed_at:
            typeof upcomingDrill.completed_at === 'string'
              ? upcomingDrill.completed_at
              : null,
        }
      : null,
    lesson:
      nextLesson && nextLessonDate
        ? {
            startsAt: nextLessonDate,
            notes:
              typeof nextLesson.notes === 'string' ? nextLesson.notes : null,
          }
        : null,
    journey,
  }

  return (
    <>
      <div className="lg:hidden">
        <PlayerHomeMobile {...mobileProps} />
      </div>
      <div className="hidden lg:block">
        <HomeDesktopLayout {...desktopProps} />
      </div>
    </>
  )
}
