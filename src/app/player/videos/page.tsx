'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getLinkedPlayersForUser, type LinkedPlayer } from '@/lib/linked-player'
import AnalysisStepperDialog from '@/components/video/AnalysisStepperDialog'
import {
  analysisPreviewHeadline,
  issueSeverityCounts,
} from '@/components/video/VideoAnalysisDialog'
import {
  getVideoAnalysisRecord,
  resolveAnalysisSessionId,
} from '@/lib/analysis-display'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Video } from 'lucide-react'
import { format } from 'date-fns'
import { usePageReady } from '@/contexts/PageLoadingContext'
export default function PlayerVideosPage() {
  const [players, setPlayers] = useState<LinkedPlayer[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState('all')
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [analysisFlow, setAnalysisFlow] = useState<{
    video: any
    sessionId?: string
    analysis: Record<string, unknown>
  } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const linkedPlayers = await getLinkedPlayersForUser(supabase, user.id)
    setPlayers(linkedPlayers)
    if (linkedPlayers.length) {
      const playerIds = linkedPlayers.map(p => p.id)
      const { data: publishedLessons } = await supabase
        .from('lessons')
        .select('id')
        .in('player_id', playerIds)
        .not('published_at', 'is', null)
      const publishedLessonIds = (publishedLessons || []).map(lesson => lesson.id)
      if (!publishedLessonIds.length) {
        setVideos([])
        setLoading(false)
        return
      }
      const { data: v } = await supabase
        .from('videos')
        .select('*, players(id, name, sport)')
        .in('player_id', playerIds)
        .in('lesson_id', publishedLessonIds)
        .order('recorded_at', { ascending: false })
      setVideos(v || [])
    }
    setLoading(false)
  }

  async function getVideoUrl(path: string) {
    const { data } = await supabase.storage.from('videos').createSignedUrl(path, 3600)
    return data?.signedUrl || ''
  }

  function openAnalysisStepper(video: any) {
    const analysis = getVideoAnalysisRecord(video)
    if (!analysis) return
    const sessionId = resolveAnalysisSessionId(analysis, video.id)
    setAnalysisFlow({ video, analysis, sessionId })
  }

  async function playVideo(video: any) {
    const url = await getVideoUrl(video.storage_path)
    window.open(url, '_blank')
  }

  const filteredVideos = selectedPlayerId === 'all' ? videos : videos.filter(v => v.player_id === selectedPlayerId)

  usePageReady(!loading)

  return (
    <div className="space-y-6">
        <div>
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground md:text-2xl">My Videos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Videos, images, and AI analysis from published training recaps.
            </p>
          </div>
        </div>

        {players.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedPlayerId('all')}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${selectedPlayerId === 'all' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'}`}
            >
              All
            </button>
            {players.map(player => (
              <button
                key={player.id}
                type="button"
                onClick={() => setSelectedPlayerId(player.id)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium ${selectedPlayerId === player.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'}`}
              >
                {player.name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : filteredVideos.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Video size={40} className="mx-auto mb-3 opacity-25" />
            <p className="text-sm">No published training media yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredVideos.map(video => {
              const analysis = getVideoAnalysisRecord(video)
              const counts = issueSeverityCounts(analysis)
              const headline = analysisPreviewHeadline(analysis)
              return (
                <div key={video.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="relative flex aspect-video items-center justify-center bg-muted">
                    <Video className="size-8 text-muted-foreground/40" />
                    <div className="absolute inset-x-2 bottom-2 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="flex-1 bg-background/95 text-xs backdrop-blur-sm"
                        onClick={() => playVideo(video)}
                      >
                        Play
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => openAnalysisStepper(video)}
                      >
                        Analysis
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3 p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{video.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {video.players?.name && players.length > 1 ? `${video.players.name} · ` : ''}
                        {format(new Date(video.recorded_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                    {analysis && (
                      <div className="space-y-2 border-t border-border pt-3">
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.overall_rating != null && analysis.overall_rating !== '' && (
                            <Badge variant="secondary">{String(analysis.overall_rating)}</Badge>
                          )}
                          {analysis.confidence != null && analysis.confidence !== '' && (
                            <Badge variant="outline">{String(analysis.confidence)} confidence</Badge>
                          )}
                          {counts.total > 0 && counts.critical > 0 && (
                            <Badge variant="destructive">{counts.critical} critical</Badge>
                          )}
                          {counts.moderate > 0 && (
                            <Badge className="border-accent/30 bg-accent/15 text-foreground">
                              {counts.moderate} moderate
                            </Badge>
                          )}
                        </div>
                        {headline && (
                          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{headline}</p>
                        )}
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          onClick={() => openAnalysisStepper(video)}
                        >
                          View full breakdown
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      <AnalysisStepperDialog
        open={!!analysisFlow}
        onOpenChange={open => {
          if (!open) setAnalysisFlow(null)
        }}
        analysis={analysisFlow?.analysis ?? null}
        sport={(analysisFlow?.video?.players?.sport || 'tennis').toLowerCase()}
        sessionId={analysisFlow?.sessionId}
        playerId={analysisFlow?.video?.player_id}
        progressHref="/player/progress"
        onSaved={() => setAnalysisFlow(null)}
        onReanalyze={() => setAnalysisFlow(null)}
      />
    </div>
  )
}
