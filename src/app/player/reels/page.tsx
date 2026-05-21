import { redirect } from 'next/navigation'
import { PLAYER_VISIBLE_SESSIONS_FILTER } from '@/lib/analysis-sessions'
import { topIssueFromFullResult } from '@/lib/reel-insights'
import { formatReelDisplayTitle } from '@/lib/reel-display'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'
import {
  ReelsLandingClient,
  type ReelSummary,
} from '@/components/player/reels/ReelsLandingClient'

export const dynamic = 'force-dynamic'

export default async function ReelsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const playerId = await getLinkedPlayerIdForUser(supabase, user.id)
  if (!playerId) redirect('/onboarding')

  const { count } = await supabase
    .from('analysis_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .or(PLAYER_VISIBLE_SESSIONS_FILTER)

  const { data: recentReels } = await supabase
    .from('analysis_sessions')
    .select(
      'id, analyzed_at, overall_score, shot_type, title, full_result, top_issue, video_duration_seconds',
    )
    .eq('player_id', playerId)
    .or(PLAYER_VISIBLE_SESSIONS_FILTER)
    .order('analyzed_at', { ascending: false })
    .limit(6)

  const summaries: ReelSummary[] = (recentReels ?? []).map(row => {
    const full = row.full_result as Record<string, unknown> | null
    const areas = full?.areas_to_improve
    return {
      id: row.id,
      analyzedAt: row.analyzed_at,
      score: row.overall_score,
      shotType: row.shot_type,
      title: formatReelDisplayTitle(row.title, row.shot_type),
      topIssue: topIssueFromFullResult(full, row.top_issue),
      issueCount: Array.isArray(areas) ? areas.length : 0,
      durationSeconds: row.video_duration_seconds ?? null,
    }
  })

  return (
    <ReelsLandingClient
      recentReels={summaries}
      hasAnyReels={(count ?? 0) > 0}
    />
  )
}
