'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getLinkedPlayersForUser, type LinkedPlayer } from '@/lib/linked-player'
import PlayerSidebar from '@/components/layout/PlayerSidebar'
import VideoAnalysisDialog, {
  analysisPreviewHeadline,
  issueSeverityCounts,
} from '@/components/video/VideoAnalysisDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Video, Sparkles, Upload } from 'lucide-react'
import { format } from 'date-fns'
import { analysisFramePreviews, extractVideoFrames } from '@/lib/video-frames'

export default function PlayerVideosPage() {
  const [players, setPlayers] = useState<LinkedPlayer[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState('all')
  const [uploadPlayerId, setUploadPlayerId] = useState('')
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzingVideo, setAnalyzingVideo] = useState<string | null>(null)
  const [videoAnalysis, setVideoAnalysis] = useState<Record<string, any>>({})
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({})
  const [sheetVideo, setSheetVideo] = useState<any>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploading, setUploading] = useState(false)
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
      setUploadPlayerId(linkedPlayers[0].id)
      const playerIds = linkedPlayers.map(p => p.id)
      const { data: v } = await supabase
        .from('videos')
        .select('*, players(id, name, sport)')
        .in('player_id', playerIds)
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

  async function analyzeVideo(video: any) {
    setAnalyzingVideo(video.id)
    try {
      const url = await getVideoUrl(video.storage_path)
      if (!url) {
        alert('Could not access this video (missing signed URL). Reload the page and try again.')
        return
      }
      setVideoUrls(prev => ({ ...prev, [video.id]: url }))
      const frames = await extractVideoFrames(url)
      const apiRes = await fetch('/api/video-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames: frames.map(({ index, timestamp, mediaType, base64 }) => ({ index, timestamp, mediaType, base64 })),
          playerName: video.players?.name,
          sport: video.players?.sport || 'tennis',
          cameraAngle: 'side-on',
        }),
      })
      const analysis = await apiRes.json()
      if (analysis.error) {
        alert(`Analysis failed: ${analysis.error}`)
        return
      }
      analysis.frame_previews = analysisFramePreviews(frames)
      await supabase.from('videos').update({ ai_analysis: JSON.stringify(analysis) }).eq('id', video.id)
      setVideoAnalysis(prev => ({ ...prev, [video.id]: analysis }))
      loadData()
    } catch (e: any) {
      alert(`Analysis failed: ${e.message}`)
    } finally {
      setAnalyzingVideo(null)
    }
  }

  async function handleUpload() {
    if (!uploadFile || !uploadPlayerId) return
    setUploading(true)
    const ext = uploadFile.name.split('.').pop()
    const path = `${uploadPlayerId}/${Date.now()}.${ext}`
    await supabase.storage.from('videos').upload(path, uploadFile)
    await supabase
      .from('videos')
      .insert({ player_id: uploadPlayerId, storage_path: path, title: uploadTitle || uploadFile.name })
    setUploadFile(null)
    setUploadTitle('')
    setShowUpload(false)
    setUploading(false)
    loadData()
  }

  async function playVideo(video: any) {
    const url = await getVideoUrl(video.storage_path)
    window.open(url, '_blank')
  }

  const filteredVideos = selectedPlayerId === 'all' ? videos : videos.filter(v => v.player_id === selectedPlayerId)

  return (
    <div className="flex min-h-screen bg-background">
      <PlayerSidebar />
      <main className="flex-1 space-y-6 overflow-auto p-4 pb-24 md:p-8 md:pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground md:text-2xl">My Videos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload practice clips — Playvia analyzes full video with Gemini.
            </p>
          </div>
          <Button onClick={() => setShowUpload(!showUpload)} className="gap-2">
            <Upload size={14} /> Upload
          </Button>
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

        {showUpload && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground">Upload a practice video</h3>
            {players.length > 1 && (
              <select
                value={uploadPlayerId}
                onChange={e => setUploadPlayerId(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground"
              >
                {players.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            )}
            <input
              type="file"
              accept="video/*"
              onChange={e => setUploadFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
            />
            <input
              value={uploadTitle}
              onChange={e => setUploadTitle(e.target.value)}
              placeholder="Video title (optional)"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleUpload} disabled={uploading || !uploadFile || !uploadPlayerId}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : filteredVideos.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Video size={40} className="mx-auto mb-3 opacity-25" />
            <p className="text-sm">No videos yet. Upload your first practice video!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredVideos.map(video => {
              const analysis =
                videoAnalysis[video.id] ||
                (video.ai_analysis ? JSON.parse(video.ai_analysis as string) : null)
              const isAnalyzing = analyzingVideo === video.id
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
                    {isAnalyzing && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Sparkles size={12} className="animate-pulse text-primary" />
                        Extracting key frames and analyzing…
                      </div>
                    )}
                    {analysis && !isAnalyzing && (
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
                            <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100">
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
                    <Button
                      type="button"
                      size="sm"
                      className="w-full gap-1"
                      disabled={isAnalyzing}
                      onClick={() => analyzeVideo(video)}
                    >
                      <Sparkles size={12} />
                      {isAnalyzing ? 'Analyzing…' : analysis ? 'Re-analyze' : 'Analyze technique'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

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
        analysis={
          sheetVideo
            ? videoAnalysis[sheetVideo.id] ??
              (typeof sheetVideo.ai_analysis === 'string'
                ? JSON.parse(sheetVideo.ai_analysis)
                : sheetVideo.ai_analysis)
            : null
        }
      />
    </div>
  )
}
