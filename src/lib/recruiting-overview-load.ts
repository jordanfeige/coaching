import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import {
  categorizeExposureMatches,
  type ExposureMatchRow,
} from '@/lib/exposure-match-history'
import { formatDivision } from '@/lib/college-matching-ui'
import { computePlayerTrajectory } from '@/lib/utr-forecast'
import {
  bracketForAge,
  computeAge,
  yearInBracketForAge,
} from '@/lib/utr-forecast'

export type RecruitingOverviewData = {
  playerName: string
  playerInitials: string
  bracketLabel: string
  classYear: number | null
  goalLabel: string
  location: string
  currentUtr: number | null
  journeyRating: number | null
  journeyTier: string
  projectedUtr: number | null
  collegeMatchCount: number
  collegeBuckets: {
    reach: number
    target: number
    safety: number
    total: number
    reachLabel: string
    targetLabel: string
    safetyLabel: string
  }
  exposure: {
    qualityWins: number
    topEvent: string
    exposureScore: number
    exposureMax: number
  }
}

const GOAL_LABELS: Record<string, string> = {
  recruited_college: 'Recruited college',
  scholarship_smaller: 'D2/D3 scholarship',
  win_highest_level: 'Win at highest level',
  improve_have_fun: 'Improve & enjoy',
  help_my_child: 'Family support',
  not_sure_yet: 'Exploring',
}

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'PV'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

function bracketYearLabel(birthDate: string | null): string {
  if (!birthDate) return '—'
  const age = computeAge(birthDate)
  const bracket = bracketForAge(age)
  const year = yearInBracketForAge(age)
  return `${bracket} · year ${year}`
}

function goalLabel(
  primaryGoal: string | null | undefined,
  targetDivision: string | null | undefined,
): string {
  if (targetDivision && targetDivision !== 'not_sure') {
    return formatDivision(targetDivision)
  }
  if (primaryGoal && GOAL_LABELS[primaryGoal]) return GOAL_LABELS[primaryGoal]
  return 'Recruiting'
}

function topEventFromLevels(levels: (string | null)[]): string {
  const normalized = levels
    .map(l => (l ?? '').toLowerCase())
    .filter(Boolean)
  if (normalized.some(l => l.includes('national') || l === 'itf')) return 'National'
  if (normalized.some(l => l.includes('section'))) return 'Sectional'
  if (normalized.length > 0) return 'Local'
  return '—'
}

type RatingBreakdown = {
  categories?: Array<{
    key: string
    score?: number
    weight?: number
  }>
}

export async function loadRecruitingOverview(
  supabase: SupabaseClient,
  playerId: string,
  opts: { profileFullName: string | null; userId: string },
): Promise<RecruitingOverviewData> {
  const [
    { data: player },
    { data: profile },
    { data: prefs },
    { data: utrInput },
    { data: rating },
    { data: collegeRows },
    { data: matchRows },
    { data: cohortRows },
    { data: recruiting },
  ] = await Promise.all([
    supabase
      .from('players')
      .select('name, birth_date, utr_singles')
      .eq('id', playerId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('location')
      .eq('id', opts.userId)
      .maybeSingle(),
    supabase
      .from('journey_preferences')
      .select('primary_goal, target_division')
      .eq('player_id', playerId)
      .maybeSingle(),
    supabase
      .from('journey_score_inputs')
      .select('value_numeric')
      .eq('player_id', playerId)
      .eq('category', 'tennis')
      .eq('input_key', 'utr_rating')
      .maybeSingle(),
    supabase
      .from('journey_ratings')
      .select('total, tier, breakdown')
      .eq('player_id', playerId)
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('college_matches')
      .select('bucket')
      .eq('player_id', playerId)
      .gte('match_score', 40),
    supabase
      .from('match_results')
      .select('id, match_date, result, opponent_utr_at_time, event_level')
      .eq('player_id', playerId)
      .gte(
        'match_date',
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      ),
    supabase.from('cohort_benchmarks').select('bracket, year_in_bracket, utr_threshold'),
    supabase
      .from('recruiting_profiles')
      .select('grad_year')
      .eq('player_id', playerId)
      .maybeSingle(),
  ])

  const playerName = player?.name || opts.profileFullName || 'Player'
  const birthDate = player?.birth_date != null ? String(player.birth_date) : null

  let projectedUtr: number | null = null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && serviceKey && birthDate) {
    try {
      const service = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const trajectory = await computePlayerTrajectory(playerId, service)
      if (trajectory?.forecast.length) {
        projectedUtr =
          trajectory.forecast[trajectory.forecast.length - 1]?.utr ??
          trajectory.player.forecastUtrAtGraduation
      }
    } catch (e) {
      console.error('[recruiting-overview] trajectory:', e)
    }
  }

  const currentUtr =
    utrInput?.value_numeric != null
      ? Number(utrInput.value_numeric)
      : typeof player?.utr_singles === 'number'
        ? player.utr_singles
        : null

  const buckets = { reach: 0, target: 0, safety: 0, total: 0 }
  for (const row of collegeRows ?? []) {
    const b = String(row.bucket)
    if (b === 'reach') buckets.reach += 1
    else if (b === 'target') buckets.target += 1
    else if (b === 'likely') buckets.safety += 1
    buckets.total += 1
  }

  const cohortBenchmarks = (cohortRows ?? []).map(r => ({
    bracket: String(r.bracket),
    year_in_bracket: Number(r.year_in_bracket),
    utr_threshold: Number(r.utr_threshold),
  }))

  const exposureMatches: ExposureMatchRow[] = (matchRows ?? []).map(r => ({
    id: String(r.id),
    match_date: String(r.match_date),
    opponent_name: null,
    opponent_utr_at_time:
      r.opponent_utr_at_time != null ? Number(r.opponent_utr_at_time) : null,
    player_utr_at_time: null,
    event_division: null,
    event_level: r.event_level != null ? String(r.event_level) : null,
    event_name: null,
    event_location: null,
    result: r.result === 'L' ? 'L' : 'W',
  }))

  const { quality_wins } = categorizeExposureMatches(
    exposureMatches,
    birthDate,
    cohortBenchmarks,
  )

  const breakdown = rating?.breakdown as RatingBreakdown | null
  const exposureCat = breakdown?.categories?.find(c => c.key === 'exposure')
  const exposureScore =
    exposureCat?.score != null ? Math.round(Number(exposureCat.score)) : 0
  const exposureMax =
    exposureCat?.weight != null ? Number(exposureCat.weight) : 25

  const gradYear =
    recruiting?.grad_year != null ? Number(recruiting.grad_year) : null

  return {
    playerName,
    playerInitials: computeInitials(playerName),
    bracketLabel: bracketYearLabel(birthDate),
    classYear: gradYear,
    goalLabel: goalLabel(prefs?.primary_goal, prefs?.target_division),
    location: profile?.location?.trim() ?? '',
    currentUtr,
    journeyRating: rating?.total != null ? Math.round(Number(rating.total)) : null,
    journeyTier: rating?.tier != null ? String(rating.tier) : '—',
    projectedUtr,
    collegeMatchCount: buckets.total,
    collegeBuckets: {
      ...buckets,
      reachLabel: 'D1 power 5',
      targetLabel: 'D1 mid / D2',
      safetyLabel: 'D3 · NAIA',
    },
    exposure: {
      qualityWins: quality_wins.length,
      topEvent: topEventFromLevels(
        exposureMatches.map(m => m.event_level),
      ),
      exposureScore,
      exposureMax,
    },
  }
}
