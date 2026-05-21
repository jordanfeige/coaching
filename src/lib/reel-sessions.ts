import { PLAYER_VISIBLE_SESSIONS_FILTER } from '@/lib/analysis-sessions'

export { PLAYER_VISIBLE_SESSIONS_FILTER }

/** Video reel = stored clip on analysis_sessions (not a text-only session). */
export function isVideoReelSession(session: {
  storage_path?: string | null
  source?: string | null
}): boolean {
  return Boolean(session.storage_path) && session.source !== 'text'
}

/** Show the analysis stepper (vs legacy detail sheet). */
export function shouldShowReelAnalysisStepper(session: {
  storage_path?: string | null
  source?: string | null
  overall_score?: number | null
  full_result?: unknown
}): boolean {
  return (
    isVideoReelSession(session) &&
    session.overall_score != null &&
    session.full_result != null &&
    typeof session.full_result === 'object'
  )
}
