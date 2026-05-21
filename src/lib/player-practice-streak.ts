import type { SupabaseClient } from '@supabase/supabase-js'
import { getWeekStart } from '@/lib/week-boundary'

export type PracticeStreakPayload = {
  weekStreak: number
  totalSessions: number
  thisWeekCount: number
  needsForThisWeek: number
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

export async function loadPlayerPracticeStreak(
  supabase: SupabaseClient,
  playerId: string,
): Promise<PracticeStreakPayload> {
  const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS)

  const { data: completions } = await supabase
    .from('drills')
    .select('completed_at')
    .eq('player_id', playerId)
    .not('completed_at', 'is', null)
    .gte('completed_at', ninetyDaysAgo.toISOString())

  const weeksWithActivity = new Set<string>()
  for (const row of completions ?? []) {
    if (!row.completed_at) continue
    weeksWithActivity.add(getWeekStart(new Date(row.completed_at)).toISOString())
  }

  const now = new Date()
  let streak = 0
  for (let i = 0; i < 52; i += 1) {
    const weekTest = new Date(now)
    weekTest.setDate(now.getDate() - i * 7)
    const weekKey = getWeekStart(weekTest).toISOString()
    if (weeksWithActivity.has(weekKey)) {
      streak += 1
    } else {
      break
    }
  }

  const thisWeekStart = getWeekStart(now).toISOString()
  const thisWeekCount =
    completions?.filter(c => {
      if (!c.completed_at) return false
      return getWeekStart(new Date(c.completed_at)).toISOString() === thisWeekStart
    }).length ?? 0

  return {
    weekStreak: streak,
    totalSessions: completions?.length ?? 0,
    thisWeekCount,
    needsForThisWeek: thisWeekCount === 0 ? 1 : 0,
  }
}
