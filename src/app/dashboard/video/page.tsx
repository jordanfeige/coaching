'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Video, Upload, Circle, Square, Trash2, Play } from 'lucide-react'
import { format } from 'date-fns'
import { isImageMediaPath } from '@/lib/video-frames'
import { generateMediaThumbnailDataUrl, titleInitials } from '@/lib/video-thumbnails'

export default function VideoPage() {
  const [videos, setVideos] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [openUpload, setOpenUpload] = useState(false)
  const [openRecord, setOpenRecord] = useState(false)
  const [openPlay, setOpenPlay] = useState<any>(null)
  const [uploadForm, setUploadForm] = useState<{ player_id: string | null, title: string, file: File | null }>({ player_id: '', title: '', file: null })
  const [recordForm, setRecordForm] = useState<{ player_id: string | null, title: string }>({ player_id: '', title: '' })
  const [recordingTime, setRecordingTime] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playbackRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<any>(null)
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: v } = await supabase
      .from('videos')
      .select('*, players(name)')
      .order('recorded_at', { ascending: false })
    const { data: p } = await supabase.from('players').select('*').order('name')
    setVideos(v || [])
    setPlayers(p || [])
  }

  async function handleUpload() {
    if (!uploadForm.file || !uploadForm.player_id) return
    setUploading(true)
    const ext = uploadForm.file.name.split('.').pop()
    const path = `${uploadForm.player_id}/${crypto.randomUUID()}.${ext}`
    const thumbnailUrl = await generateMediaThumbnailDataUrl(uploadForm.file)
    await supabase.storage.from('videos').upload(path, uploadForm.file)
    await supabase.from('videos').insert({
      player_id: uploadForm.player_id,
      storage_path: path,
      title: uploadForm.title || uploadForm.file.name,
      thumbnail_url: thumbnailUrl,
    })
    setUploadForm({ player_id: '', title: '', file: null })
    setOpenUpload(false)
    setUploading(false)
    loadAll()
  }

  async function startRecording() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setStream(s)
      if (videoRef.current) {
        videoRef.current.srcObject = s
        videoRef.current.play()
      }
      const chunks: Blob[] = []
      const mr = new MediaRecorder(s)
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      mr.onstop = () => setRecordedChunks(chunks)
      mr.start()
      setMediaRecorder(mr)
      setRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch (err) {
      alert('Camera access denied. Please allow camera access and try again.')
    }
  }

  function stopRecording() {
    mediaRecorder?.stop()
    stream?.getTracks().forEach(t => t.stop())
    setRecording(false)
    clearInterval(timerRef.current)
  }

  async function saveRecording() {
    if (!recordedChunks.length || !recordForm.player_id) return
    setUploading(true)
    const blob = new Blob(recordedChunks, { type: 'video/webm' })
    const path = `${recordForm.player_id}/${crypto.randomUUID()}.webm`
    const thumbnailUrl = await generateMediaThumbnailDataUrl(blob)
    await supabase.storage.from('videos').upload(path, blob)
    await supabase.from('videos').insert({
      player_id: recordForm.player_id,
      storage_path: path,
      title: recordForm.title || `Recording ${format(new Date(), 'MMM d yyyy h:mm a')}`,
      thumbnail_url: thumbnailUrl,
    })
    setRecordedChunks([])
    setRecordForm({ player_id: '', title: '' })
    setOpenRecord(false)
    setUploading(false)
    loadAll()
  }

  async function deleteVideo(video: any) {
    await supabase.storage.from('videos').remove([video.storage_path])
    await supabase.from('videos').delete().eq('id', video.id)
    loadAll()
  }

  async function getVideoUrl(path: string) {
    const { data } = await supabase.storage.from('videos').createSignedUrl(path, 3600)
    return data?.signedUrl
  }

  async function handlePlay(video: any) {
    const url = await getVideoUrl(video.storage_path)
    setOpenPlay({ ...video, url })
  }

  function formatTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">Video</h1>
          <p className="text-muted-foreground mt-1">Record and review player footage</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenRecord(true)} className="flex items-center gap-2">
            <Circle size={14} className="text-red-500" /> Record
          </Button>
          <Button onClick={() => setOpenUpload(true)} className="flex items-center gap-2">
            <Upload size={14} /> Upload media
          </Button>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Video size={40} className="mx-auto mb-3 opacity-30" />
          <p>No media yet. Record or upload your first clip or image!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map(video => (
            <Card key={video.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div
                  className="flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-black/90 transition-colors hover:bg-black"
                  onClick={() => handlePlay(video)}
                >
                  {video.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/25 via-primary/10 to-muted">
                      <span className="font-heading text-2xl font-bold text-primary">{titleInitials(video.title)}</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{video.title}</p>
                  <p className="text-xs text-muted-foreground">{video.players?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(video.recorded_at), 'MMM d, yyyy • h:mm a')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 flex items-center gap-1"
                    onClick={() => handlePlay(video)}>
                    <Play size={12} /> Play
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteVideo(video)}
                    className="text-muted-foreground hover:text-destructive">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={openUpload} onOpenChange={setOpenUpload}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload video or image</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Player</Label>
              <Select value={uploadForm.player_id} onValueChange={v => setUploadForm({ ...uploadForm, player_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select a player" /></SelectTrigger>
                <SelectContent>
                  {players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={uploadForm.title} onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="e.g. Forehand drill session" />
            </div>
            <div className="space-y-2">
              <Label>Media file</Label>
              <Input type="file" accept="video/*,image/*"
                onChange={e => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpenUpload(false)}>Cancel</Button>
              <Button onClick={handleUpload} disabled={uploading || !uploadForm.file || !uploadForm.player_id}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record dialog */}
      <Dialog open={openRecord} onOpenChange={v => {
        if (!v) { stream?.getTracks().forEach(t => t.stop()); setRecording(false); setRecordedChunks([]) }
        setOpenRecord(v)
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Record video</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {recording && (
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  {formatTime(recordingTime)}
                </div>
              )}
              {recordedChunks.length > 0 && !recording && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <p className="text-white font-medium">Recording ready to save</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-center">
              {!recording && recordedChunks.length === 0 && (
                <Button onClick={startRecording} className="flex items-center gap-2 bg-red-600 hover:bg-red-700">
                  <Circle size={14} /> Start recording
                </Button>
              )}
              {recording && (
                <Button onClick={stopRecording} variant="outline" className="flex items-center gap-2">
                  <Square size={14} /> Stop recording
                </Button>
              )}
              {recordedChunks.length > 0 && !recording && (
                <Button onClick={() => { setRecordedChunks([]); setRecordingTime(0) }} variant="outline">
                  Retake
                </Button>
              )}
            </div>

            {recordedChunks.length > 0 && !recording && (
              <div className="space-y-3 border-t pt-4">
                <div className="space-y-2">
                  <Label>Player</Label>
                  <Select value={recordForm.player_id} onValueChange={v => setRecordForm({ ...recordForm, player_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select a player" /></SelectTrigger>
                    <SelectContent>
                      {players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={recordForm.title} onChange={e => setRecordForm({ ...recordForm, title: e.target.value })}
                    placeholder="e.g. Backhand session" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setOpenRecord(false)}>Cancel</Button>
                  <Button onClick={saveRecording} disabled={uploading || !recordForm.player_id}>
                    {uploading ? 'Saving...' : 'Save recording'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Playback dialog */}
      <Dialog open={!!openPlay} onOpenChange={v => { if (!v) setOpenPlay(null) }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{openPlay?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {openPlay && isImageMediaPath(openPlay.storage_path || openPlay.title) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={openPlay.url} alt={openPlay.title || 'Player media'} className="w-full rounded-lg" />
            ) : (
              <video ref={playbackRef} src={openPlay?.url} controls className="w-full rounded-lg" />
            )}
            <p className="text-sm text-muted-foreground">
              {openPlay?.players?.name} · {openPlay && format(new Date(openPlay.recorded_at), 'MMMM d, yyyy • h:mm a')}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}