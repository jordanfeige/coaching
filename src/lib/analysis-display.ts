import type { CoachReviewConfig } from '@/components/AnalysisResultStepper'

export type AnalysisRecord = Record<string, unknown>

export function parseStoredAnalysis(raw: unknown): AnalysisRecord | null {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as AnalysisRecord
    } catch {
      return null
    }
  }
  if (typeof raw === 'object') return raw as AnalysisRecord
  return null
}

export function analysisScore(analysis: AnalysisRecord | null | undefined): number {
  if (!analysis) return 0
  const overall = analysis.overall_score
  if (typeof overall === 'number') return overall
  const score = analysis.score
  if (typeof score === 'number') return score
  if (typeof overall === 'string') return Number(overall) || 0
  if (typeof score === 'string') return Number(score) || 0
  return 0
}

type SessionRow = {
  id: string
  video_id?: string | null
  full_result?: unknown
  coach_verified?: boolean | null
  published_to_player?: boolean | null
  source?: string | null
}

export function resolveAnalysisSessionId(
  analysis: AnalysisRecord | null | undefined,
  videoId?: string | null,
  sessions?: SessionRow[] | null,
): string | undefined {
  const direct = analysis?.sessionId ?? analysis?.session_id
  if (typeof direct === 'string' && direct.trim()) return direct.trim()
  if (!videoId || !sessions?.length) return undefined
  const match = [...sessions].reverse().find(s => s.video_id === videoId)
  return match?.id
}

export function findAnalysisSession(
  sessions: SessionRow[] | undefined,
  videoId?: string | null,
  sessionId?: string | null,
): SessionRow | undefined {
  if (!sessions?.length) return undefined
  if (sessionId) {
    const byId = sessions.find(s => s.id === sessionId)
    if (byId) return byId
  }
  if (videoId) {
    return [...sessions].reverse().find(s => s.video_id === videoId)
  }
  return undefined
}

export function getVideoAnalysisRecord(
  video: { id: string; ai_analysis?: unknown },
  cache?: Record<string, AnalysisRecord>,
  sessions?: SessionRow[] | null,
): AnalysisRecord | null {
  const fromCache = cache?.[video.id]
  if (fromCache) return fromCache
  const fromVideo = parseStoredAnalysis(video.ai_analysis)
  if (fromVideo) return fromVideo
  if (sessions?.length) {
    const session = [...sessions].reverse().find(s => s.video_id === video.id)
    if (session?.full_result) return parseStoredAnalysis(session.full_result)
  }
  return null
}

export function buildCoachReviewConfig(opts: {
  sessionId?: string
  playerId: string
  playerName: string
  lessonId?: string
  session?: SessionRow | null
  onVerified?: () => void
  onPublished?: () => void
}): CoachReviewConfig | undefined {
  if (!opts.sessionId) return undefined
  return {
    sessionId: opts.sessionId,
    playerId: opts.playerId,
    playerName: opts.playerName,
    lessonId: opts.lessonId,
    source: opts.session?.source === 'text' ? 'text' : 'video',
    alreadyVerified: Boolean(opts.session?.coach_verified),
    alreadyPublished: Boolean(opts.session?.published_to_player),
    onVerified: opts.onVerified,
    onPublished: opts.onPublished,
  }
}
