'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getLinkedPlayerRowForUser } from '@/lib/linked-player'
import { PLAYER_VISIBLE_SESSIONS_FILTER } from '@/lib/analysis-sessions'
import { shouldShowReelAnalysisStepper, isVideoReelSession } from '@/lib/reel-sessions'
import { signedUrlForReelStorage } from '@/lib/player-reel-video'
import AnalysisResultStepper, {
  mapAnalysisIssues,
  mapAnalysisStrengths,
} from '@/components/AnalysisResultStepper'
import { analysisScore } from '@/lib/analysis-display'
import { usePageReady } from '@/contexts/PageLoadingContext'
import { ReelTitleEditor } from '@/components/player/reels/ReelTitleEditor'
import { ReelVideoPlayer } from '@/components/player/reels/ReelVideoPlayer'
import { formatReelDisplayTitle } from '@/lib/reel-display'

type Session = {
  id: string
  sport: string
  title: string | null
  shot_type: string | null
  overall_score: number | null
  source: string
  analyzed_at: string
  storage_path: string | null
  full_result: Record<string, unknown> | null
}

export default function ReelDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = typeof params.id === 'string' ? params.id : ''
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [existingDrillTitles, setExistingDrillTitles] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      if (!sessionId) {
        router.replace('/player/reels')
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const row = await getLinkedPlayerRowForUser(supabase, user.id)
      if (!row?.id) {
        router.replace('/player/reels')
        return
      }
      setPlayerId(row.id)

      const { data } = await supabase
        .from('analysis_sessions')
        .select(
          'id, sport, title, shot_type, overall_score, source, analyzed_at, storage_path, full_result, player_id',
        )
        .eq('id', sessionId)
        .eq('player_id', row.id)
        .not('storage_path', 'is', null)
        .or(PLAYER_VISIBLE_SESSIONS_FILTER)
        .maybeSingle()

      if (!data) {
        router.replace('/player/reels')
        return
      }

      const loaded: Session = {
        id: data.id,
        sport: data.sport,
        title: data.title,
        shot_type: data.shot_type,
        overall_score: data.overall_score,
        source: data.source || 'video',
        analyzed_at: data.analyzed_at,
        storage_path: data.storage_path,
        full_result: data.full_result as Record<string, unknown> | null,
      }
      setSession(loaded)

      if (isVideoReelSession(loaded)) {
        const url = await signedUrlForReelStorage(supabase, loaded.storage_path)
        setVideoUrl(url)
      }

      const { data: drills } = await supabase
        .from('drills')
        .select('title')
        .eq('player_id', row.id)

      setExistingDrillTitles((drills ?? []).map(d => d.title).filter(Boolean))
      setLoading(false)
    }

    void load()
  }, [router, sessionId, supabase])

  usePageReady(!loading)

  if (loading) {
    return null
  }

  if (!session) return null

  const displayTitle = formatReelDisplayTitle(
    session.title,
    session.shot_type,
    session.sport,
  )
  const full = session.full_result ?? {}
  const showStepper = shouldShowReelAnalysisStepper(session)
  const isVideo = isVideoReelSession(session)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 48px' }}>
      <button
        type="button"
        onClick={() => router.push('/player/reels')}
        style={{
          background: 'transparent',
          border: 'none',
          fontSize: 13,
          color: 'hsl(168,62%,36%)',
          cursor: 'pointer',
          marginBottom: 12,
          padding: 0,
          fontFamily: 'system-ui',
        }}
      >
        ← Back to reels
      </button>

      <ReelTitleEditor
        reelId={session.id}
        initialTitle={displayTitle}
      />

      {isVideo && (
        <ReelVideoPlayer
          videoUrl={videoUrl}
          storagePath={session.storage_path}
          title={displayTitle}
        />
      )}

      {showStepper ? (
        <AnalysisResultStepper
          score={analysisScore(full)}
          sport={session.sport}
          shotType={session.shot_type ?? undefined}
          issues={mapAnalysisIssues(
            (full.areas_to_improve ?? full.issues) as unknown[] | undefined,
          )}
          strengths={mapAnalysisStrengths(full.strengths as unknown[] | undefined)}
          sessionId={session.id}
          playerId={playerId ?? undefined}
          session={full}
          analyzedAt={session.analyzed_at}
          viewMode="re-view"
          existingDrillTitles={existingDrillTitles}
          progressHref="/player/progress"
        />
      ) : (
        <ReelLegacySummary session={session} full={full} />
      )}
    </div>
  )
}

function ReelLegacySummary({
  session,
  full,
}: {
  session: Session
  full: Record<string, unknown>
}) {
  const summary =
    (typeof full.via_summary === 'string' && full.via_summary) ||
    (typeof full.biggest_win === 'string' && full.biggest_win) ||
    null
  const issues =
    (full.areas_to_improve as Array<Record<string, unknown>> | undefined) ?? []

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {session.overall_score != null && (
        <p style={{ fontSize: 14, color: 'hsl(220,10%,45%)', margin: '0 0 12px' }}>
          Score: <strong>{session.overall_score}</strong>
        </p>
      )}
      {summary && (
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: 'hsl(220,20%,15%)',
            margin: '0 0 16px',
          }}
        >
          {summary}
        </p>
      )}
      {issues.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
          {issues.slice(0, 5).map((item, i) => {
            const area =
              typeof item === 'string'
                ? item
                : typeof item.area === 'string'
                  ? item.area
                  : 'Focus area'
            return <li key={i}>{area}</li>
          })}
        </ul>
      )}
      {!summary && issues.length === 0 && (
        <p style={{ fontSize: 13, color: 'hsl(220,10%,45%)' }}>
          Analysis details are limited for this reel. Your video is available above.
        </p>
      )}
    </div>
  )
}
