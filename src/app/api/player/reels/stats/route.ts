import { NextResponse } from 'next/server'
import { PLAYER_VISIBLE_SESSIONS_FILTER } from '@/lib/analysis-sessions'
import { aggregateRecurringIssue, type ReelInsightRow } from '@/lib/reel-insights'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const playerId = await getLinkedPlayerIdForUser(supabase, user.id)
  if (!playerId) {
    return NextResponse.json({ error: 'No player' }, { status: 404 })
  }

  const { data: allReels } = await supabase
    .from('analysis_sessions')
    .select('id, analyzed_at, overall_score, full_result, shot_type')
    .eq('player_id', playerId)
    .or(PLAYER_VISIBLE_SESSIONS_FILTER)
    .order('analyzed_at', { ascending: false })

  const rows = (allReels ?? []) as ReelInsightRow[]
  const totalCount = rows.length

  const thisMonth = new Date()
  thisMonth.setDate(1)
  thisMonth.setHours(0, 0, 0, 0)
  const thisMonthCount = rows.filter(
    r => new Date(r.analyzed_at) >= thisMonth,
  ).length

  const lastFour = rows.slice(0, 4)
  const priorFour = rows.slice(4, 8)

  const avg = (list: ReelInsightRow[]) =>
    list.length > 0
      ? list.reduce((sum, r) => sum + (r.overall_score ?? 0), 0) / list.length
      : 0

  const avgLastFour = avg(lastFour)
  const avgPriorFour = avg(priorFour)
  const scoreTrend =
    lastFour.length >= 2 ? Math.round(avgLastFour - avgPriorFour) : null

  const topIssue = aggregateRecurringIssue(rows.slice(0, 8))

  return NextResponse.json({
    totalCount,
    thisMonthCount,
    scoreTrend,
    avgLastFourScore: Math.round(avgLastFour),
    topIssue,
  })
}
