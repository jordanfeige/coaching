'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getLinkedPlayersForUser, type LinkedPlayer } from '@/lib/linked-player'
import VideoAnalysisDialog, {
  analysisPreviewHeadline,
  issueSeverityCounts,
} from '@/components/video/VideoAnalysisDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Video } from 'lucide-react'
import { format } from 'date-fns'
import { isImageMediaPath } from '@/lib/video-frames'

export default function PlayerVideosPage() {
  const [players, setPlayers] = useState<LinkedPlayer[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState('all')
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({})
  const [sheetVideo, setSheetVideo] = useState<any>(null)
  const [coachingVideos, setCoachingVideos] = useState<Record<string, any[]>>({})
  const [loadingCoachingVideo, setLoadingCoachingVideo] = useState<string | null>(null)
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

  async function openAnalysisSheet(video: any) {
    setSheetVideo(video)
    if (!videoUrls[video.id]) {
      const u = await getVideoUrl(video.storage_path)
      if (u) setVideoUrls(prev => ({ ...prev, [video.id]: u }))
    }
  }

  async function playVideo(video: any) {
    const url = await getVideoUrl(video.storage_path)
    window.open(url, '_blank')
  }

  async function fetchCoachingVideos(issueArea: string, drill?: string) {
    setLoadingCoachingVideo(issueArea)
    try {
      const response = await fetch('/api/youtube-coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue: drill,
          issueArea,
          sport: sheetVideo?.players?.sport,
          shotType: '',
        }),
      })
      const payload = await response.json()
      if (!response.ok || payload.error) throw new Error(payload.error || 'Failed to find coaching videos')
      setCoachingVideos(prev => ({ ...prev, [issueArea]: payload.videos || [] }))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to find coaching videos')
    } finally {
      setLoadingCoachingVideo(null)
    }
  }

  const filteredVideos = selectedPlayerId === 'all' ? videos : videos.filter(v => v.player_id === selectedPlayerId)

  return (
    <div className="space-y-6">
        <div>
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground md:text-2xl">My Videos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Videos, images, and AI analysis from published lesson recaps.
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
            <p className="text-sm">No published lesson media yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredVideos.map(video => {
              const analysis =
                video.ai_analysis ? JSON.parse(video.ai_analysis as string) : null
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
                        onClick={() => openAnalysisSheet(video)}
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
                          {analysis.overall_rating && (
                            <Badge variant="secondary">{String(analysis.overall_rating)}</Badge>
                          )}
                          {analysis.confidence && (
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
                          onClick={() => openAnalysisSheet(video)}
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

      <VideoAnalysisDialog
        open={!!sheetVideo}
        onOpenChange={v => {
          if (!v) setSheetVideo(null)
        }}
        title={sheetVideo?.title ?? ''}
        recordedLabel={
          sheetVideo ? format(new Date(sheetVideo.recorded_at), 'MMM d, yyyy • h:mm a') : ''
        }
        videoUrl={sheetVideo ? videoUrls[sheetVideo.id] ?? null : null}
        mediaKind={sheetVideo && isImageMediaPath(sheetVideo.storage_path || sheetVideo.title) ? 'image' : 'video'}
        videoId={sheetVideo?.id ?? null}
        lessonId={sheetVideo?.lesson_id ?? null}
        sport={sheetVideo?.players?.sport ?? null}
        coachingVideos={coachingVideos}
        loadingCoachingVideo={loadingCoachingVideo}
        onFetchCoachingVideos={fetchCoachingVideos}
        analysis={
          sheetVideo
            ? (typeof sheetVideo.ai_analysis === 'string'
                ? JSON.parse(sheetVideo.ai_analysis)
                : sheetVideo.ai_analysis)
            : null
        }
      />
    </div>
  )
}
