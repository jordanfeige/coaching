import type { MatchAnalysisV2 } from '@/lib/match-analysis/types'

/** True when chunk analysis has enough content for the match-detail teaser. */
export function isChunkAnalysisDisplayable(
  analysis: MatchAnalysisV2 | null | undefined,
): boolean {
  if (!analysis) return false
  const hasPlan = Boolean(analysis.tactical_game_plan?.theme?.trim())
  const hasWorkOn = (analysis.work_on_top_three?.length ?? 0) > 0
  return hasPlan || hasWorkOn
}
