import type { SupabaseClient } from '@supabase/supabase-js'
import {
  categorizeExposureMatches,
  type ExposureMatchRow,
} from '@/lib/exposure-match-history'
import { formatDoneWeekday, formatWeekOf, getWeekStart } from '@/lib/week-boundary'

export type PlayerQuest = {
  id: string
  name: string
  payoff: string
  target: number
  progress: number
  done: boolean
  status_label: string
}

export type PlayerQuestsPayload = {
  quests: PlayerQuest[]
  weekOf: string
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export async function loadPlayerQuests(
  supabase: SupabaseClient,
  playerId: string,
): Promise<PlayerQuestsPayload> {
  const weekStart = getWeekStart()
  const weekStartIso = weekStart.toISOString()
  const monthAgo = new Date(Date.now() - THIRTY_DAYS_MS)
  const monthAgoDate = monthAgo.toISOString().split('T')[0]

  const [
    { data: videos },
    { data: drills },
    { data: player },
    { data: cohortRows },
    { data: matches },
  ] = await Promise.all([
    supabase
      .from('analysis_sessions')
      .select('id, analyzed_at')
      .eq('player_id', playerId)
      .is('lesson_id', null)
      .not('overall_score', 'is', null)
      .gte('analyzed_at', weekStartIso),
    supabase
      .from('drills')
      .select('id, completed_at')
      .eq('player_id', playerId)
      .not('completed_at', 'is', null)
      .gte('completed_at', weekStartIso)
      .order('completed_at', { ascending: true }),
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
        'id, match_date, opponent_utr_at_time, player_utr_at_time, result',
      )
      .eq('player_id', playerId)
      .eq('result', 'W')
      .gte('match_date', monthAgoDate),
  ])

  const videoRows = videos ?? []
  const drillRows = drills ?? []
  const videoCount = videoRows.length
  const drillCount = drillRows.length

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
    result: 'W' as const,
  }))

  const { quality_wins: qualityWins } = categorizeExposureMatches(
    exposureMatches,
    player?.birth_date ?? null,
    cohortRows ?? [],
  )
  const qualityWinCount = qualityWins.length

  const lastVideo = videoRows[videoRows.length - 1]
  const lastDrill = drillRows[drillRows.length - 1]

  const quests: PlayerQuest[] = [
    {
      id: 'video_log',
      name: 'Log 1 self-uploaded video',
      payoff: 'Coachability +2',
      target: 1,
      progress: Math.min(videoCount, 1),
      done: videoCount >= 1,
      status_label:
        videoCount >= 1 && lastVideo?.analyzed_at
          ? `Done ${formatDoneWeekday(lastVideo.analyzed_at)}`
          : 'Due Sunday',
    },
    {
      id: 'drills_complete',
      name: 'Complete 4 assigned drills',
      payoff: 'Coachability +3',
      target: 4,
      progress: Math.min(drillCount, 4),
      done: drillCount >= 4,
      status_label:
        drillCount >= 4 && lastDrill?.completed_at
          ? `Done ${formatDoneWeekday(lastDrill.completed_at)}`
          : 'Due Sunday',
    },
    {
      id: 'quality_wins',
      name: 'Win 2 quality matches',
      payoff: 'Exposure +4',
      target: 2,
      progress: Math.min(qualityWinCount, 2),
      done: qualityWinCount >= 2,
      status_label:
        qualityWinCount >= 2 ? 'Complete' : 'Open until end of month',
    },
  ]

  return {
    quests,
    weekOf: formatWeekOf(weekStart),
  }
}
