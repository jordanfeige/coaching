'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getLinkedPlayerRowForUser } from '@/lib/linked-player'
import { PLAYER_VISIBLE_SESSIONS_FILTER } from '@/lib/analysis-sessions'
import { parseStoragePath } from '@/lib/reel-storage'
import { shouldShowReelAnalysisStepper } from '@/lib/reel-sessions'
import AnalysisResultStepper, {
  mapAnalysisIssues,
  mapAnalysisStrengths,
} from '@/components/AnalysisResultStepper'
import { analysisScore } from '@/lib/analysis-display'

type Session = {
  id: string
  sport: string
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
          'id, sport, shot_type, overall_score, source, analyzed_at, storage_path, full_result, player_id',
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

      setSession({
        id: data.id,
        sport: data.sport,
        shot_type: data.shot_type,
        overall_score: data.overall_score,
        source: data.source || 'video',
        analyzed_at: data.analyzed_at,
        storage_path: data.storage_path,
        full_result: data.full_result as Record<string, unknown> | null,
      })

      const { data: drills } = await supabase
        .from('drills')
        .select('title')
        .eq('player_id', row.id)

      setExistingDrillTitles((drills ?? []).map(d => d.title).filter(Boolean))
      setLoading(false)
    }

    void load()
  }, [router, sessionId, supabase])

  if (loading) {
    return (
      <div style={{ padding: 40, color: 'hsl(220,10%,65%)', fontFamily: 'system-ui' }}>
        Loading reel…
      </div>
    )
  }

  if (!session) return null

  if (!shouldShowReelAnalysisStepper(session)) {
    if (session.storage_path) {
      const { bucket, path } = parseStoragePath(session.storage_path)
      if (path) {
        router.replace(`/player/reels/new?session=${sessionId}`)
        return null
      }
    }
    router.replace('/player/reels')
    return null
  }

  const full = session.full_result ?? {}
  const issues = mapAnalysisIssues(
    (full.areas_to_improve ?? full.issues) as unknown[] | undefined,
  )
  const strengths = mapAnalysisStrengths(full.strengths as unknown[] | undefined)

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

      <AnalysisResultStepper
        score={analysisScore(full)}
        sport={session.sport}
        shotType={session.shot_type ?? undefined}
        issues={issues}
        strengths={strengths}
        sessionId={session.id}
        playerId={playerId ?? undefined}
        session={full}
        analyzedAt={session.analyzed_at}
        viewMode="re-view"
        existingDrillTitles={existingDrillTitles}
        progressHref="/player/progress"
      />
    </div>
  )
}
