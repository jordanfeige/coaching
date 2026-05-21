import type { SupabaseClient } from '@supabase/supabase-js'
import {
  categorizeExposureMatches,
  type ExposureMatchRow,
} from '@/lib/exposure-match-history'
import type { SubScoreNudgeContext } from '@/lib/journey-subscore-nudges'
import { getWeekStart } from '@/lib/week-boundary'

export type JourneyPageSupplement = {
  roadToOffer: {
    goalKey: string
    classYear: number
    currentUtr: number
    currentGpa: number | null
    qualityWinsLast12Mo: number
  }
  nudgeContext: SubScoreNudgeContext
}

export async function fetchJourneyPageSupplement(
  supabase: SupabaseClient,
  playerId: string,
): Promise<JourneyPageSupplement> {
  const weekStart = getWeekStart().toISOString()
  const monthAgo = new Date()
  monthAgo.setDate(monthAgo.getDate() - 30)
  const monthAgoDate = monthAgo.toISOString().split('T')[0]
  const yearAgo = new Date()
  yearAgo.setMonth(yearAgo.getMonth() - 12)
  const yearAgoDate = yearAgo.toISOString().split('T')[0]

  const [
    { data: prefs },
    { data: recruiting },
    { data: player },
    { data: inputs },
    { data: cohortRows },
    { data: matches },
    { data: weekDrills },
    { data: weekVideos },
  ] = await Promise.all([
    supabase
      .from('journey_preferences')
      .select('primary_goal')
      .eq('player_id', playerId)
      .maybeSingle(),
    supabase
      .from('recruiting_profiles')
      .select('grad_year')
      .eq('player_id', playerId)
      .maybeSingle(),
    supabase
      .from('players')
      .select('birth_date, utr_singles')
      .eq('id', playerId)
      .maybeSingle(),
    supabase
      .from('journey_score_inputs')
      .select('category, input_key, value_numeric, value_text, verified')
      .eq('player_id', playerId),
    supabase
      .from('cohort_benchmarks')
      .select('bracket, year_in_bracket, utr_threshold'),
    supabase
      .from('match_results')
      .select(
        'id, match_date, opponent_utr_at_time, player_utr_at_time, result',
      )
      .eq('player_id', playerId)
      .gte('match_date', yearAgoDate),
    supabase
      .from('drills')
      .select('id')
      .eq('player_id', playerId)
      .not('completed_at', 'is', null)
      .gte('completed_at', weekStart),
    supabase
      .from('analysis_sessions')
      .select('id')
      .eq('player_id', playerId)
      .is('lesson_id', null)
      .not('overall_score', 'is', null)
      .gte('analyzed_at', weekStart),
  ])

  const inputList = inputs ?? []
  const utrRow = inputList.find(
    i => i.category === 'tennis' && i.input_key === 'utr_rating',
  )
  const gpaRow = inputList.find(
    i => i.category === 'academics' && i.input_key === 'gpa',
  )
  const transcriptRow = inputList.find(
    i => i.category === 'academics' && i.input_key === 'transcript_uploaded',
  )
  const satRow = inputList.find(
    i => i.category === 'academics' && i.input_key === 'sat',
  )
  const actRow = inputList.find(
    i => i.category === 'academics' && i.input_key === 'act',
  )

  const currentUtr =
    utrRow?.value_numeric != null
      ? Number(utrRow.value_numeric)
      : player?.utr_singles != null
        ? Number(player.utr_singles)
        : 0

  const currentGpa =
    gpaRow?.value_numeric != null ? Number(gpaRow.value_numeric) : null

  const exposureMatches: ExposureMatchRow[] = (matches ?? []).map(row => ({
    id: String(row.id),
    match_date: String(row.match_date),
    opponent_name: null,
    opponent_utr_at_time:
      row.opponent_utr_at_time != null
        ? Number(row.opponent_utr_at_time)
        : null,
    player_utr_at_time:
      row.player_utr_at_time != null
        ? Number(row.player_utr_at_time)
        : null,
    event_division: null,
    event_level: null,
    event_name: null,
    event_location: null,
    result: row.result as 'W' | 'L',
  }))

  const birthDate = player?.birth_date ?? null
  const cohort = cohortRows ?? []
  const { quality_wins: qualityWins12 } = categorizeExposureMatches(
    exposureMatches,
    birthDate,
    cohort,
  )
  const recentMatches = exposureMatches.filter(m => m.match_date >= monthAgoDate)
  const { quality_wins: qualityWins30 } = categorizeExposureMatches(
    recentMatches,
    birthDate,
    cohort,
  )

  const classYear =
    recruiting?.grad_year != null
      ? Number(recruiting.grad_year)
      : new Date().getFullYear() + 4

  return {
    roadToOffer: {
      goalKey: prefs?.primary_goal ?? 'recruited_college',
      classYear,
      currentUtr,
      currentGpa,
      qualityWinsLast12Mo: qualityWins12.length,
    },
    nudgeContext: {
      currentUtr: currentUtr > 0 ? currentUtr : null,
      hasTranscript: Boolean(
        transcriptRow?.verified ||
          transcriptRow?.value_numeric === 1 ||
          transcriptRow?.value_text === 'true',
      ),
      gpa: currentGpa,
      hasSat: satRow?.value_numeric != null && Number(satRow.value_numeric) > 0,
      hasAct: actRow?.value_numeric != null && Number(actRow.value_numeric) > 0,
      thisWeekReels: weekVideos?.length ?? 0,
      thisWeekDrillsCompleted: weekDrills?.length ?? 0,
      qualityWinsLast30Days: qualityWins30.length,
    },
  }
}
