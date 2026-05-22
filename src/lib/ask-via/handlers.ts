import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { PLAYER_VISIBLE_SESSIONS_FILTER } from '@/lib/analysis-sessions'
import {
  categorizeExposureMatches,
  type ExposureMatchRow,
} from '@/lib/exposure-match-history'
import { fetchJourneyPageSupplement } from '@/lib/journey-page-supplement'
import { loadPlayerPracticeStreak } from '@/lib/player-practice-streak'
import {
  computePlayerTrajectory,
  diagnoseTrajectoryGaps,
} from '@/lib/utr-forecast'
import type { ViaToolName } from '@/lib/ask-via/tools'
import { assignLibraryDrillToPlayer } from '@/lib/assign-library-drill'
import {
  mapCheckpointToCategory,
  sanitizeSearchQuery,
  type CustomDrillPayload,
} from '@/lib/drills-library'
import { generateCustomDrillWithVia } from '@/lib/drills-library-generate'
import { formatReelDisplayTitle } from '@/lib/reel-display'

const GOAL_THRESHOLDS: Record<
  string,
  { name: string; utr: number; gpa: number; qualityWinsPerYear: number }
> = {
  recruited_college: {
    name: 'D1 mid-major average',
    utr: 11.3,
    gpa: 3.7,
    qualityWinsPerYear: 10,
  },
  scholarship_smaller: {
    name: 'D2/D3 scholarship average',
    utr: 10.0,
    gpa: 3.5,
    qualityWinsPerYear: 7,
  },
  win_highest_level: {
    name: 'National prospect',
    utr: 11.8,
    gpa: 3.5,
    qualityWinsPerYear: 15,
  },
  improve_have_fun: {
    name: 'D3 / club average',
    utr: 9.0,
    gpa: 3.3,
    qualityWinsPerYear: 4,
  },
}

function mapCategory(category?: string): string | null {
  if (!category) return null
  if (category === 'academic') return 'academics'
  return category
}

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function runTool(
  name: ViaToolName,
  input: Record<string, unknown>,
  playerId: string,
  supabase: SupabaseClient,
  userId?: string,
): Promise<unknown> {
  switch (name) {
    case 'get_rating_breakdown': {
      const category = mapCategory(
        typeof input.category === 'string' ? input.category : undefined,
      )

      const { data: rating } = await supabase
        .from('journey_ratings')
        .select('total, tier, tier_progress, breakdown, computed_at')
        .eq('player_id', playerId)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!rating) {
        return { error: 'No journey rating computed yet' }
      }

      const breakdown = rating.breakdown as {
        categories?: Array<{
          key: string
          label?: string
          score?: number
          raw_pct?: number
        }>
      } | null

      if (category) {
        const { data: inputs } = await supabase
          .from('journey_score_inputs')
          .select(
            'input_key, value_numeric, value_text, verified, source, updated_at',
          )
          .eq('player_id', playerId)
          .eq('category', category)

        const subScore = breakdown?.categories?.find(c => c.key === category)
        return {
          total: rating.total,
          tier: rating.tier,
          category,
          subScore: subScore ?? null,
          inputs: inputs ?? [],
        }
      }

      return {
        total: rating.total,
        tier: rating.tier,
        tierProgress: rating.tier_progress,
        computedAt: rating.computed_at,
        categories: breakdown?.categories ?? [],
      }
    }

    case 'get_trajectory': {
      const service = serviceClient()
      if (!service) return { error: 'Trajectory unavailable' }

      const missing = await diagnoseTrajectoryGaps(playerId, service)
      const trajectory = await computePlayerTrajectory(playerId, service)
      if (!trajectory) {
        return { error: 'Trajectory not available', missing }
      }

      const { player, history, forecast, peerCohort } = trajectory
      const projected =
        forecast[forecast.length - 1]?.utr ?? player.forecastUtrAtGraduation

      return {
        currentUtr: player.currentUtr,
        projectedUtrAtGraduation: projected,
        classYear: player.classYear,
        bracket: player.bracket,
        historyPoints: history.length,
        forecastPoints: forecast.length,
        peerCohortSize: peerCohort.length,
        missing,
      }
    }

    case 'get_reels': {
      const limit = Math.min(
        typeof input.limit === 'number' ? input.limit : 10,
        30,
      )
      let q = supabase
        .from('analysis_sessions')
        .select('id, analyzed_at, overall_score, shot_type, title, full_result')
        .eq('player_id', playerId)
        .or(PLAYER_VISIBLE_SESSIONS_FILTER)
        .order('analyzed_at', { ascending: false })
        .limit(limit)

      if (typeof input.shotType === 'string' && input.shotType) {
        q = q.eq('shot_type', input.shotType)
      }

      const reelName =
        typeof input.reelName === 'string' ? input.reelName.trim() : ''
      if (reelName) {
        q = q.ilike('title', `%${reelName}%`)
      }

      const { data: reels } = await q
      return {
        reels: (reels ?? []).map(r => {
          const full = r.full_result as {
            top_issue?: string
            areas_to_improve?: unknown[]
          } | null
          return {
            id: r.id,
            title: r.title,
            displayName: formatReelDisplayTitle(r.title, r.shot_type),
            date: r.analyzed_at,
            score: r.overall_score,
            shotType: r.shot_type,
            topIssue: full?.top_issue ?? null,
            issueCount: full?.areas_to_improve?.length ?? 0,
          }
        }),
      }
    }

    case 'get_reel_detail': {
      const reelId = String(input.reelId ?? '').trim()
      const reelName =
        typeof input.reelName === 'string' ? input.reelName.trim() : ''

      if (!reelId && !reelName) {
        return { error: 'reelId or reelName required' }
      }

      let q = supabase
        .from('analysis_sessions')
        .select('*')
        .eq('player_id', playerId)
        .or(PLAYER_VISIBLE_SESSIONS_FILTER)

      if (reelId) {
        q = q.eq('id', reelId)
      } else {
        q = q.ilike('title', `%${reelName}%`).limit(1)
      }

      const { data: reel } = await q.maybeSingle()

      if (!reel) return { error: 'Reel not found or not accessible' }

      const full = reel.full_result as {
        top_issue?: string
        areas_to_improve?: unknown[]
        strengths?: unknown[]
        drill_prescriptions?: unknown[]
      } | null

      return {
        id: reel.id,
        title: reel.title,
        displayName: formatReelDisplayTitle(reel.title, reel.shot_type, reel.sport),
        date: reel.analyzed_at,
        shotType: reel.shot_type,
        score: reel.overall_score,
        topIssue: full?.top_issue ?? null,
        areasToImprove: full?.areas_to_improve ?? [],
        strengths: full?.strengths ?? [],
        drillPrescriptions: full?.drill_prescriptions ?? [],
      }
    }

    case 'get_match_history': {
      const limit = Math.min(
        typeof input.limit === 'number' ? input.limit : 20,
        100,
      )
      let q = supabase
        .from('match_results')
        .select(
          'match_date, opponent_name, opponent_utr_at_time, player_utr_at_time, result, event_name, event_level, event_division',
        )
        .eq('player_id', playerId)
        .order('match_date', { ascending: false })
        .limit(limit)

      const resultFilter =
        typeof input.result === 'string' ? input.result : 'all'
      if (resultFilter !== 'all') {
        q = q.eq('result', resultFilter)
      }

      const { data: matches } = await q
      return { matches: matches ?? [] }
    }

    case 'get_quality_wins_summary': {
      const months =
        input.timeframe === '3_months'
          ? 3
          : input.timeframe === '6_months'
            ? 6
            : 12
      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - months)
      const cutoffDate = cutoff.toISOString().split('T')[0]

      const [{ data: player }, { data: cohortRows }, { data: matches }] =
        await Promise.all([
          supabase
            .from('players')
            .select('birth_date')
            .eq('id', playerId)
            .maybeSingle(),
          supabase
            .from('cohort_benchmarks')
            .select('bracket, year_in_bracket, utr_threshold'),
          supabase
            .from('match_results')
            .select(
              'id, match_date, opponent_name, opponent_utr_at_time, player_utr_at_time, result, event_name, event_level',
            )
            .eq('player_id', playerId)
            .eq('result', 'W')
            .gte('match_date', cutoffDate),
        ])

      const exposureMatches: ExposureMatchRow[] = (matches ?? []).map(row => ({
        id: String(row.id),
        match_date: String(row.match_date),
        opponent_name: row.opponent_name ?? null,
        opponent_utr_at_time:
          row.opponent_utr_at_time != null
            ? Number(row.opponent_utr_at_time)
            : null,
        player_utr_at_time:
          row.player_utr_at_time != null
            ? Number(row.player_utr_at_time)
            : null,
        event_division: null,
        event_level: row.event_level ?? null,
        event_name: row.event_name ?? null,
        event_location: null,
        result: 'W' as const,
      }))

      const { quality_wins } = categorizeExposureMatches(
        exposureMatches,
        player?.birth_date ?? null,
        cohortRows ?? [],
      )

      return {
        timeframe: `${months} months`,
        qualityWinsCount: quality_wins.length,
        recentQualityWins: quality_wins.slice(0, 10).map(m => ({
          match_date: m.match_date,
          opponent_name: m.opponent_name,
          opponent_utr_at_time: m.opponent_utr_at_time,
          event_name: m.event_name,
          event_level: m.event_level,
        })),
      }
    }

    case 'get_drills': {
      const limit = Math.min(
        typeof input.limit === 'number' ? input.limit : 20,
        100,
      )
      let q = supabase
        .from('drills')
        .select('id, title, description, created_at, completed_at, lesson_id')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(limit)

      const status =
        typeof input.status === 'string' ? input.status : 'all'
      if (status === 'assigned') q = q.is('completed_at', null)
      else if (status === 'completed') q = q.not('completed_at', 'is', null)

      const { data: drills } = await q
      return { drills: drills ?? [] }
    }

    case 'get_lessons': {
      const limit = Math.min(
        typeof input.limit === 'number' ? input.limit : 10,
        50,
      )
      const now = new Date().toISOString()
      const timeframe =
        typeof input.timeframe === 'string' ? input.timeframe : 'all'

      let q = supabase
        .from('lessons')
        .select(
          'id, starts_at, status, journal_entries(content, created_at)',
        )
        .eq('player_id', playerId)
        .limit(limit)

      if (timeframe === 'past') {
        q = q.lt('starts_at', now).order('starts_at', { ascending: false })
      } else if (timeframe === 'upcoming') {
        q = q.gte('starts_at', now).order('starts_at', { ascending: true })
      } else {
        q = q.order('starts_at', { ascending: false })
      }

      const { data: lessons } = await q
      return {
        lessons: (lessons ?? []).map(l => ({
          id: l.id,
          starts_at: l.starts_at,
          status: l.status,
          notes: (
            l.journal_entries as { content?: string }[] | null
          )?.[0]?.content ?? null,
        })),
      }
    }

    case 'get_coach_info': {
      const { data: recruiting } = await supabase
        .from('recruiting_profiles')
        .select('coach_id')
        .eq('player_id', playerId)
        .maybeSingle()

      if (!recruiting?.coach_id) {
        return { coach: null, message: 'No coach assigned on recruiting profile' }
      }

      const { data: coach } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', recruiting.coach_id)
        .maybeSingle()

      return { coach: coach ?? null }
    }

    case 'get_college_matches': {
      const limit = Math.min(
        typeof input.limit === 'number' ? input.limit : 20,
        100,
      )
      const bucket =
        typeof input.bucket === 'string' ? input.bucket : 'all'

      let q = supabase
        .from('college_matches')
        .select(
          `
          match_score, bucket, school_roster_avg, rationale,
          schools (
            name, city, state,
            school_tennis_programs ( division, roster_min_utr, roster_max_utr )
          )
        `,
        )
        .eq('player_id', playerId)
        .gte('match_score', 40)
        .order('match_score', { ascending: false })
        .limit(limit)

      if (bucket !== 'all') {
        const dbBucket = bucket === 'safety' ? 'likely' : bucket
        q = q.eq('bucket', dbBucket)
      }

      const { data: rows } = await q
      return {
        matches: (rows ?? []).map(m => {
          const school = m.schools as {
            name?: string
            city?: string
            state?: string
            school_tennis_programs?: Array<{
              division?: string
              roster_min_utr?: number
              roster_max_utr?: number
            }>
          } | null
          const prog = school?.school_tennis_programs?.[0]
          return {
            schoolName: school?.name ?? 'Unknown',
            location: [school?.city, school?.state].filter(Boolean).join(', '),
            bucket: m.bucket,
            matchScore: m.match_score,
            division: prog?.division ?? null,
            rosterUtrMin: prog?.roster_min_utr ?? null,
            rosterUtrMax: prog?.roster_max_utr ?? null,
            rosterAvg: m.school_roster_avg,
            rationale: m.rationale,
          }
        }),
      }
    }

    case 'get_road_to_offer': {
      const supplement = await fetchJourneyPageSupplement(supabase, playerId)
      const { roadToOffer } = supplement
      const goalKey = roadToOffer.goalKey
      const t =
        GOAL_THRESHOLDS[goalKey] ?? GOAL_THRESHOLDS.recruited_college

      const utrGap = t.utr - roadToOffer.currentUtr
      const gpaGap =
        roadToOffer.currentGpa != null
          ? t.gpa - roadToOffer.currentGpa
          : null
      const qwGap = t.qualityWinsPerYear - roadToOffer.qualityWinsLast12Mo

      return {
        goal: t.name,
        goalKey,
        classYear: roadToOffer.classYear,
        gaps: {
          utr: {
            current: roadToOffer.currentUtr,
            target: t.utr,
            gap: utrGap,
          },
          gpa:
            roadToOffer.currentGpa != null
              ? {
                  current: roadToOffer.currentGpa,
                  target: t.gpa,
                  gap: gpaGap,
                }
              : {
                  current: null,
                  target: t.gpa,
                  gap: null,
                  note: 'GPA not provided',
                },
          qualityWins: {
            last12Months: roadToOffer.qualityWinsLast12Mo,
            targetPerYear: t.qualityWinsPerYear,
            gap: qwGap,
          },
        },
      }
    }

    case 'get_practice_streak': {
      const streak = await loadPlayerPracticeStreak(supabase, playerId)
      return {
        currentStreakWeeks: streak.weekStreak,
        totalCompletions90d: streak.totalSessions,
        drillsThisWeek: streak.thisWeekCount,
        needsDrillThisWeek: streak.needsForThisWeek,
      }
    }

    case 'search_drill_library': {
      const limit = Math.min(
        typeof input.limit === 'number' ? input.limit : 5,
        15,
      )

      let q = supabase
        .from('drills_library')
        .select(
          'id, name, primary_category, drill_type, checkpoints, skill_level, duration_minutes, mode, requires, description, steps, success_criteria, coaching_cue, source',
        )
        .order('name', { ascending: true })
        .limit(limit)

      if (typeof input.category === 'string' && input.category) {
        q = q.eq('primary_category', input.category)
      }
      if (typeof input.skill_level === 'string' && input.skill_level) {
        q = q.eq('skill_level', input.skill_level)
      }
      if (typeof input.mode === 'string' && input.mode) {
        q = q.eq('mode', input.mode)
      }
      if (typeof input.checkpoint === 'string' && input.checkpoint) {
        q = q.contains('checkpoints', [input.checkpoint])
      }

      const query =
        typeof input.query === 'string' ? sanitizeSearchQuery(input.query) : ''
      if (query) {
        q = q.or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      }

      const { data: drills, error } = await q

      if (error) {
        return { error: error.message, drills: [] }
      }

      const list = drills ?? []
      return {
        drills: list,
        topMatch: list[0] ?? null,
        note:
          list.length > 0
            ? `Found ${list.length} drill(s). Present the best match as a draft card and ask if they want it added to practice.`
            : 'No library drills matched. Use generate_custom_drill only if nothing fits.',
      }
    }

    case 'generate_custom_drill': {
      const playerRequest = String(input.player_request ?? '').trim()
      if (!playerRequest) {
        return { error: 'player_request required' }
      }

      try {
        const draft = await generateCustomDrillWithVia({
          player_request: playerRequest,
          target_checkpoints: Array.isArray(input.target_checkpoints)
            ? (input.target_checkpoints as string[])
            : undefined,
          skill_level: String(input.skill_level ?? 'intermediate'),
          duration_minutes:
            typeof input.duration_minutes === 'number'
              ? input.duration_minutes
              : 15,
          mode: String(input.mode ?? 'solo'),
        })

        return {
          draft_drill: draft,
          is_generated: true,
          note: 'Custom drill draft — player must confirm before add_drill_to_my_practice.',
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Generation failed'
        const fallback: CustomDrillPayload = {
          name: `Custom: ${playerRequest.slice(0, 48)}`,
          primary_category: mapCheckpointToCategory(
            Array.isArray(input.target_checkpoints)
              ? String(input.target_checkpoints[0] ?? '')
              : '',
          ),
          drill_type: 'live-ball',
          checkpoints: Array.isArray(input.target_checkpoints)
            ? (input.target_checkpoints as string[])
            : [],
          skill_level: String(input.skill_level ?? 'intermediate'),
          duration_minutes:
            typeof input.duration_minutes === 'number'
              ? input.duration_minutes
              : 15,
          mode: String(input.mode ?? 'solo'),
          requires: [],
          description: playerRequest,
          steps: [playerRequest, 'Repeat with quality focus.', 'Rest between sets.'],
          success_criteria: 'Complete all reps with intentional focus.',
          coaching_cue: 'Quality over speed.',
        }
        return {
          draft_drill: fallback,
          is_generated: true,
          note: `Draft created with fallback (${message}).`,
        }
      }
    }

    case 'add_drill_to_my_practice': {
      const libraryDrillId =
        typeof input.library_drill_id === 'string'
          ? input.library_drill_id
          : undefined
      const customDrillData = input.custom_drill_data as
        | CustomDrillPayload
        | undefined

      const result = await assignLibraryDrillToPlayer(supabase, playerId, {
        libraryDrillId,
        customDrillData,
      })

      if (!result.success) {
        return { success: false, error: result.error, details: result.details }
      }

      return {
        success: true,
        drill_id: result.drillId,
        library_drill_id: result.libraryDrillId,
        message: `Added "${result.title}" to your practice. View it on the Training page.`,
      }
    }

    case 'create_custom_drill_for_player': {
      if (!userId) {
        return { error: 'Not authenticated', success: false }
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      if (profile?.role !== 'coach') {
        return { error: 'Only coaches can create library drills', success: false }
      }

      const name = String(input.name ?? '').trim()
      if (!name) {
        return { error: 'name required', success: false }
      }

      const slug =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .slice(0, 50) +
        '-' +
        Date.now()

      const { data, error } = await supabase
        .from('drills_library')
        .insert({
          slug,
          name,
          primary_category: String(input.primary_category ?? 'Forehand'),
          drill_type:
            typeof input.drill_type === 'string' ? input.drill_type : null,
          checkpoints: Array.isArray(input.checkpoints)
            ? (input.checkpoints as string[])
            : [],
          skill_level: String(input.skill_level ?? 'intermediate'),
          duration_minutes:
            typeof input.duration_minutes === 'number'
              ? input.duration_minutes
              : 15,
          mode: String(input.mode ?? 'solo'),
          requires: Array.isArray(input.requires)
            ? (input.requires as string[])
            : [],
          description: String(input.description ?? ''),
          steps: Array.isArray(input.steps) ? (input.steps as string[]) : [],
          success_criteria:
            typeof input.success_criteria === 'string'
              ? input.success_criteria
              : null,
          coaching_cue:
            typeof input.coaching_cue === 'string' ? input.coaching_cue : null,
          source: 'coach',
          source_attribution: 'Coach-authored drill',
          is_public: false,
          created_by_coach_id: userId,
        })
        .select('id, name')
        .single()

      if (error || !data) {
        return {
          error: 'Failed to create drill',
          details: error?.message,
          success: false,
        }
      }

      return {
        success: true,
        drill_id: data.id,
        message: `Created "${data.name}" in your drill library.`,
      }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}
