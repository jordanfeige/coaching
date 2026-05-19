'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Sparkles, Video, BookOpen, Dumbbell, RefreshCw, X, Upload, Circle, Square } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import VideoAnalysisDialog, {
  analysisPreviewHeadline,
  issueSeverityCounts,
} from '@/components/video/VideoAnalysisDialog'
import CoachVerifyPanel from '@/components/CoachVerifyPanel'
import { coachReviewIssuesFromSession } from '@/lib/analysis-sessions'
import { cn } from '@/lib/utils'
import { calendarEvent } from '@/lib/calendar'
import { isImageMediaPath } from '@/lib/video-frames'
import { generateMediaThumbnailDataUrl } from '@/lib/video-thumbnails'

function normalizeSportKey(s?: string | null): string {
  if (!s) return 'tennis'
  if (s === 'baseball') return 'pickleball'
  return s
}

const SPORT_CONFIG: Record<string, { focuses: string[]; lessonTypes: string[] }> = {
  tennis: {
    focuses: ['Forehand', 'Backhand', 'Serve', 'Volleys', 'Footwork', 'Return', 'Strategy'],
    lessonTypes: ['Technical', 'Match play', 'Conditioning', 'Mental', 'Mixed'],
  },
  golf: {
    focuses: ['Drive', 'Iron play', 'Short game', 'Putting', 'Bunker', 'Setup', 'Course management'],
    lessonTypes: ['Technical', 'On-course', 'Short game focus', 'Mental game', 'Fitness', 'Mixed'],
  },
  pickleball: {
    focuses: ['Serve', 'Return', 'Dinking', 'Volleys', 'Third-shot drop', 'Drives', 'Kitchen play', 'Doubles positioning'],
    lessonTypes: ['Technical', 'Drills', 'Game scenarios', 'Conditioning', 'Mixed'],
  },
  basketball: {
    focuses: ['Shooting', 'Ball handling', 'Defense', 'Passing', 'Footwork', 'Post play'],
    lessonTypes: ['Technical', 'Scrimmage', 'Conditioning', 'Film study', 'Mixed'],
  },
}

const SHOT_TYPE_OPTIONS: Record<string, string[]> = {
  tennis: ['forehand', 'backhand', 'serve', 'volley', 'overhead'],
  golf: ['driver', 'iron', 'chip', 'putt', 'bunker'],
  baseball: ['batting', 'pitching'],
  basketball: ['jump shot', 'free throw', 'layup'],
  pickleball: ['serve', 'return', 'dink', 'volley', 'third-shot drop'],
}

function analysisSportKey(s?: string | null): string {
  return (s || 'tennis').toLowerCase()
}

function shotTypeOptionsForSport(s?: string | null): string[] {
  return SHOT_TYPE_OPTIONS[analysisSportKey(s)] || SHOT_TYPE_OPTIONS.tennis
}

async function mediaUrlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Could not download media (HTTP ${response.status}). Reload and try again.`)
  }
  const blob = await response.blob()
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(new Error('Could not read media file.'))
    reader.readAsDataURL(blob)
  })
  return { base64, mimeType: blob.type || 'video/mp4' }
}

function lessonStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'completed') return 'secondary'
  if (status === 'cancelled') return 'destructive'
  return 'outline'
}

export default function LessonDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [lesson, setLesson] = useState<any>(null)
  const [player, setPlayer] = useState<any>(null)
  const [entries, setEntries] = useState<any[]>([])
  const [drills, setDrills] = useState<any[]>([])
  const [videos, setVideos] = useState<any[]>([])
  const [tab, setTab] = useState<'drills' | 'journal' | 'video'>('drills')
  const [newEntry, setNewEntry] = useState('')
  const [saving, setSaving] = useState(false)
  const [completeModal, setCompleteModal] = useState(false)
  const [completeNote, setCompleteNote] = useState('')
  const [drillForm, setDrillForm] = useState({
    age: '', focuses: ['Forehand'], lessonTypes: ['Technical'],
    duration: '60', workOn: '', skillLevel: 'intermediate'
  })
  const [generatedPlan, setGeneratedPlan] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [manualDrill, setManualDrill] = useState({ title: '', description: '' })
  const [showManual, setShowManual] = useState(false)
  const [openUpload, setOpenUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordTitle, setRecordTitle] = useState('')
  const [showRecord, setShowRecord] = useState(false)
  const [allPlayerVideos, setAllPlayerVideos] = useState<any[]>([])
  const [analyzingVideo, setAnalyzingVideo] = useState<string | null>(null)
  const [videoAnalysis, setVideoAnalysis] = useState<Record<string, any>>({})
  const [compareMode, setCompareMode] = useState(false)
  const [compareVideoId, setCompareVideoId] = useState<string | null>(null)
  const [sheetVideo, setSheetVideo] = useState<any>(null)
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({})
  const [shotType, setShotType] = useState('')
  const [coachingVideos, setCoachingVideos] = useState<Record<string, any[]>>({})
  const [loadingCoachingVideo, setLoadingCoachingVideo] = useState<string | null>(null)
  const [lessonAnalyses, setLessonAnalyses] = useState<any[]>([])
  const timerRef = useRef<any>(null)

  const supabase = createClient()

  useEffect(() => { loadAll() }, [id])

  async function loadAll() {
    const { data: l } = await supabase
      .from('lessons')
      .select('*, players(id, name, skill_level, email, sport)')
      .eq('id', id)
      .single()
    if (l) {
      setLesson(l)
      setPlayer(l.players)
      if (l.players?.skill_level) {
        setDrillForm(prev => ({ ...prev, skillLevel: l.players.skill_level }))
      }
      if (l.players?.id) {
        const { data: allVids } = await supabase
          .from('videos')
          .select('*')
          .eq('player_id', l.players.id)
          .order('recorded_at', { ascending: true })
        setAllPlayerVideos(allVids || [])
      } else {
        setAllPlayerVideos([])
      }
    }
    const { data: e } = await supabase.from('journal_entries').select('*').eq('lesson_id', id).order('created_at', { ascending: false })
    const { data: d } = await supabase.from('drills').select('*').eq('lesson_id', id).order('created_at', { ascending: true })
    const { data: v } = await supabase.from('videos').select('*').eq('lesson_id', id).order('recorded_at', { ascending: false })
    setEntries(e || [])
    setDrills(d || [])
    setVideos(v || [])

    if (l?.id && l?.players?.id) {
      const { data: tied } = await supabase
        .from('analysis_sessions')
        .select('*')
        .eq('lesson_id', l.id)
        .order('analyzed_at', { ascending: false })

      let nearby: typeof tied = []
      if (l.starts_at) {
        const lessonDate = new Date(l.starts_at)
        const from = new Date(lessonDate)
        from.setHours(from.getHours() - 48)
        const to = new Date(lessonDate)
        to.setHours(to.getHours() + 48)

        const { data: near } = await supabase
          .from('analysis_sessions')
          .select('*')
          .eq('player_id', l.players.id)
          .gte('analyzed_at', from.toISOString())
          .lte('analyzed_at', to.toISOString())
          .is('lesson_id', null)
          .order('analyzed_at', { ascending: false })

        nearby = near || []
      }

      const merged = new Map<string, Record<string, unknown>>()
      for (const row of [...(tied || []), ...nearby]) {
        if (row?.id) merged.set(row.id, row)
      }
      setLessonAnalyses([...merged.values()])
    } else {
      setLessonAnalyses([])
    }
  }

  async function addEntry() {
    if (!newEntry.trim()) return
    setSaving(true)
    await supabase.from('journal_entries').insert({ player_id: player?.id, lesson_id: id, content: newEntry })
    setNewEntry('')
    setSaving(false)
    loadAll()
  }

  async function deleteEntry(entryId: string) {
    await supabase.from('journal_entries').delete().eq('id', entryId)
    loadAll()
  }

  async function completeLesson() {
    if (!completeNote.trim()) return
    setSaving(true)
    await supabase.from('lessons').update({ status: 'completed' }).eq('id', id)
    await supabase.from('journal_entries').insert({ player_id: player?.id, lesson_id: id, content: completeNote })
    setCompleteModal(false)
    setCompleteNote('')
    setSaving(false)
    loadAll()
  }

  async function cancelLesson() {
    await supabase.from('lessons').update({ status: 'cancelled' }).eq('id', id)
    if (player?.email && lesson?.starts_at) {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lesson_cancelled_player',
          to: player.email,
          playerName: player.name,
          coachName: 'Coach',
          date: format(new Date(lesson.starts_at), 'EEEE, MMMM d'),
          time: format(new Date(lesson.starts_at), 'h:mm a'),
          sport: player.sport || 'Tennis',
          bookingUrl: `${window.location.origin}/book`,
        }),
      }).catch(error => console.error('Could not send cancellation email:', error))
    }
    loadAll()
  }

  async function publishLesson() {
    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    await supabase
      .from('lessons')
      .update({
        published_at: new Date().toISOString(),
        published_by_profile_id: user?.id ?? null,
      })
      .eq('id', id)
    setSaving(false)
    loadAll()
  }

  async function unpublishLesson() {
    if (!window.confirm('Hide this recap from the player/parent portal?')) return
    setSaving(true)
    await supabase
      .from('lessons')
      .update({
        published_at: null,
        published_by_profile_id: null,
      })
      .eq('id', id)
    setSaving(false)
    loadAll()
  }

  async function generateDrills() {
    if (!drillForm.workOn) return
    setGenerating(true)
    setGeneratedPlan(null)
    try {
      const res = await fetch('/api/drills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: player?.name, sport: normalizeSportKey(player?.sport) || 'tennis', ...drillForm }),
      })
      if (!res.ok) { alert('Failed to generate'); return }
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullText += decoder.decode(value, { stream: true })
        }
      }
      const clean = fullText.replace(/```json|```/g, '').trim()
      setGeneratedPlan(JSON.parse(clean))
    } catch {
      alert('Failed to generate drills. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function saveDrillPlan() {
    if (!generatedPlan) return
    setSaving(true)
    for (const drill of generatedPlan.drills) {
      await supabase.from('drills').insert({
        player_id: player?.id,
        lesson_id: id,
        title: drill.title,
        description: `${drill.description}\n\nCoaching cues: ${drill.coaching_cues?.join(', ')}`,
        steps: JSON.stringify({ duration_mins: drill.duration_mins, equipment: drill.equipment }),
      })
    }
    setGeneratedPlan(null)
    setSaving(false)
    loadAll()
  }

  async function saveManualDrill() {
    if (!manualDrill.title.trim()) return
    setSaving(true)
    await supabase.from('drills').insert({ player_id: player?.id, lesson_id: id, title: manualDrill.title, description: manualDrill.description })
    setManualDrill({ title: '', description: '' })
    setShowManual(false)
    setSaving(false)
    loadAll()
  }

  async function deleteDrill(drillId: string) {
    await supabase.from('drills').delete().eq('id', drillId)
    loadAll()
  }

  async function handleUpload() {
    if (!uploadFile) return
    setUploading(true)
    const ext = uploadFile.name.split('.').pop()
    const path = `${player?.id}/${crypto.randomUUID()}.${ext}`
    const thumbnailUrl = await generateMediaThumbnailDataUrl(uploadFile)
    await supabase.storage.from('videos').upload(path, uploadFile)
    await supabase.from('videos').insert({ player_id: player?.id, lesson_id: id, storage_path: path, title: uploadTitle || uploadFile.name, thumbnail_url: thumbnailUrl })
    setUploadFile(null)
    setUploadTitle('')
    setOpenUpload(false)
    setUploading(false)
    loadAll()
  }

  async function startRecording() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setStream(s)
      const chunks: Blob[] = []
      const mr = new MediaRecorder(s)
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      mr.onstop = () => setRecordedChunks(chunks)
      mr.start()
      setMediaRecorder(mr)
      setRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch { alert('Camera access denied.') }
  }

  function stopRecording() {
    mediaRecorder?.stop()
    stream?.getTracks().forEach(t => t.stop())
    setRecording(false)
    clearInterval(timerRef.current)
  }

  async function saveRecording() {
    if (!recordedChunks.length) return
    setUploading(true)
    const blob = new Blob(recordedChunks, { type: 'video/webm' })
    const path = `${player?.id}/${crypto.randomUUID()}.webm`
    const thumbnailUrl = await generateMediaThumbnailDataUrl(blob)
    await supabase.storage.from('videos').upload(path, blob)
    await supabase.from('videos').insert({ player_id: player?.id, lesson_id: id, storage_path: path, title: recordTitle || `Recording ${format(new Date(), 'MMM d yyyy h:mm a')}`, thumbnail_url: thumbnailUrl })
    setRecordedChunks([])
    setRecordTitle('')
    setShowRecord(false)
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
    return data?.signedUrl || ''
  }

  async function playVideo(video: any) {
    const url = await getVideoUrl(video.storage_path)
    window.open(url, '_blank')
  }

  async function openAnalysisSheet(video: any) {
    setSheetVideo(video)
    if (!videoUrls[video.id]) {
      const u = await getVideoUrl(video.storage_path)
      if (u) setVideoUrls(prev => ({ ...prev, [video.id]: u }))
    }
  }

  async function analyzeVideo(video: any, compareVideo?: any) {
    setAnalyzingVideo(video.id)
    try {
      const url = await getVideoUrl(video.storage_path)
      if (!url) {
        alert('Could not access this video (missing signed URL). Reload the page and try again.')
        return
      }
      setVideoUrls(prev => ({ ...prev, [video.id]: url }))
      const media = await mediaUrlToBase64(url)
      const compareUrl = compareVideo ? await getVideoUrl(compareVideo.storage_path) : undefined
      if (compareVideo && !compareUrl) {
        alert('Could not access the comparison video. Reload and try again.')
        return
      }
      const compareMedia = compareUrl ? await mediaUrlToBase64(compareUrl) : null
      const isPrimaryImage = media.mimeType.startsWith('image/') || isImageMediaPath(video.storage_path || video.title)
      const isCompareImage = compareVideo && compareMedia
        ? compareMedia.mimeType.startsWith('image/') || isImageMediaPath(compareVideo.storage_path || compareVideo.title)
        : false
      const playerHistory = entries.slice(0, 3).map(entry => entry.content).join('\n---\n')
      const response = await fetch('/api/video-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isPrimaryImage
            ? { imageBase64: media.base64, mediaType: media.mimeType }
            : { videoBase64: media.base64, videoMimeType: media.mimeType }),
          ...(compareMedia
            ? isCompareImage
              ? { compareImageBase64: compareMedia.base64, compareMediaType: compareMedia.mimeType }
              : { compareVideoBase64: compareMedia.base64, compareVideoMimeType: compareMedia.mimeType }
            : {}),
          playerName: player?.name,
          playerId: player?.id || lesson?.player_id || null,
          sport: analysisSportKey(player?.sport),
          shotType,
          playerHistory,
          cameraAngle: 'side-on',
        }),
      })
      const analysis = await response.json()
      if (!response.ok || analysis.error) {
        throw new Error(analysis.error || 'Reel failed')
      }
      await supabase.from('videos').update({ ai_analysis: JSON.stringify(analysis) }).eq('id', video.id)
      setVideoAnalysis(prev => ({ ...prev, [video.id]: analysis }))
    } catch (e: any) {
      alert(`Reel failed: ${e.message}`)
    } finally {
      setAnalyzingVideo(null)
      setCompareMode(false)
      setCompareVideoId(null)
      loadAll()
    }
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
          sport: player?.sport,
          shotType,
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

  function formatTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  const tabs = [
    { key: 'drills', label: 'Drills', icon: Dumbbell },
    { key: 'journal', label: 'Journal', icon: BookOpen },
    { key: 'video', label: 'Video', icon: Video },
  ]

  if (!lesson) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>

  const sportConfig = SPORT_CONFIG[normalizeSportKey(player?.sport)] || SPORT_CONFIG.tennis
  const SKILL_FOCUSES = sportConfig.focuses
  const LESSON_TYPES = sportConfig.lessonTypes
  const SHOT_TYPES = shotTypeOptionsForSport(player?.sport)
  const isCompleted = lesson.status === 'completed'
  const isCancelled = lesson.status === 'cancelled'
  const isPublished = Boolean(lesson.published_at)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const lessonCalendar = calendarEvent({
    title: `Playvia lesson: ${player?.name || 'Player'}`,
    startsAt: lesson.starts_at,
    durationMins: lesson.duration_mins,
    description: lesson.notes || `Lesson for ${player?.name || 'player'}.`,
    actionLinks: origin
      ? [
          { label: 'Cancel lesson', url: `${origin}/dashboard/lessons/${lesson.id}` },
          { label: 'Reschedule lesson', url: `${origin}/dashboard/schedule` },
        ]
      : undefined,
  })

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => router.back()}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'w-fit gap-2 rounded-xl'
          )}
        >
          <ArrowLeft size={14} /> Back
        </button>
        {player && (
          <Link
            href={`/dashboard/players/${player.id}`}
            className="flex min-w-0 items-center gap-3 rounded-xl transition-opacity hover:opacity-90"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{player.name}</p>
              <p className="text-xs text-muted-foreground">View player profile →</p>
            </div>
          </Link>
        )}
      </div>

      {/* Lesson info */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div className="min-w-0">
            <p className="font-heading text-xl font-bold text-foreground">
              {format(new Date(lesson.starts_at), 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {format(new Date(lesson.starts_at), 'h:mm a')} · {lesson.duration_mins} minutes
            </p>
            {lesson.notes && (
              <p className="mt-2 rounded-xl bg-muted/80 px-3 py-2 text-sm text-muted-foreground">{lesson.notes}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={lessonCalendar.googleUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'rounded-lg text-xs')}
            >
              Google Calendar
            </a>
            <a
              href={lessonCalendar.icsHref}
              download="playvia-lesson.ics"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-lg text-xs')}
            >
              Device calendar
            </a>
            <Badge variant={lessonStatusVariant(lesson.status)} className="capitalize">
              {lesson.status}
            </Badge>
            <Badge variant={isPublished ? 'default' : 'secondary'}>
              {isPublished ? 'Published' : 'Draft'}
            </Badge>
            {isPublished ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg text-xs"
                onClick={unpublishLesson}
                disabled={saving}
              >
                Unpublish
              </Button>
            ) : (
              <Button
                size="sm"
                className="rounded-lg px-3 text-xs"
                onClick={publishLesson}
                disabled={saving}
              >
                Publish to player
              </Button>
            )}
            {!isCompleted && !isCancelled && (
              <Button size="sm" className="rounded-lg px-3 text-xs" onClick={() => setCompleteModal(true)}>
                Complete lesson
              </Button>
            )}
            {!isCompleted && !isCancelled && (
              <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={cancelLesson}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      {lessonAnalyses.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Session analysis review
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Verify Via&apos;s analysis from this lesson window before publishing to the player.
            </p>
          </div>
          {lessonAnalyses.map(analysis => (
            <CoachVerifyPanel
              key={analysis.id}
              sessionId={analysis.id}
              lessonId={String(id)}
              playerId={analysis.player_id || player?.id}
              playerName={player?.name || 'Player'}
              score={
                analysis.coach_score_override ??
                analysis.overall_score ??
                0
              }
              issues={coachReviewIssuesFromSession(analysis.full_result)}
              source={analysis.source === 'text' ? 'text' : 'video'}
              sport={player?.sport || 'tennis'}
              alreadyVerified={Boolean(analysis.coach_verified)}
              alreadyPublished={Boolean(analysis.published_to_player)}
              onVerified={() => void loadAll()}
              onPublished={() => void loadAll()}
            />
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/50 p-1 md:w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key as any)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              tab === key
                ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon size={14} /> {label}
            {key === 'drills' && drills.length > 0 && (
              <Badge
                variant={tab === 'drills' ? 'default' : 'secondary'}
                className="px-1.5 py-0 text-[10px]"
              >
                {drills.length}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Drills tab */}
      {tab === 'drills' && (
        <div className="space-y-4">
          {drills.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h3 className="text-sm font-semibold text-foreground">Lesson drills</h3>
                <span className="text-xs text-muted-foreground">
                  {drills.reduce((acc: number, d: any) => {
                    try {
                      return acc + (JSON.parse(d.steps)?.duration_mins || 0)
                    } catch {
                      return acc
                    }
                  }, 0)}{' '}
                  min total
                </span>
              </div>
              <div className="divide-y divide-border">
                {drills.map((drill, i) => {
                  let duration = 0
                  try {
                    duration = JSON.parse(drill.steps)?.duration_mins || 0
                  } catch {}
                  return (
                    <div key={drill.id} className="flex items-start gap-3 px-5 py-4">
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{drill.title}</p>
                          {duration > 0 && (
                            <Badge variant="secondary" className="text-[10px]">
                              {duration}m
                            </Badge>
                          )}
                        </div>
                        {drill.description && (
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {drill.description.split('\n')[0]}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteDrill(drill.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Add manually */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <button
              type="button"
              onClick={() => setShowManual(!showManual)}
              className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60"
            >
              <div className="flex items-center gap-2 text-foreground">
                <Plus size={16} className="text-primary" /> Add drill manually
              </div>
              <span className="text-muted-foreground">{showManual ? '−' : '+'}</span>
            </button>
            {showManual && (
              <div className="space-y-3 border-t border-border px-5 pb-5 pt-4">
                <Input
                  value={manualDrill.title}
                  onChange={e => setManualDrill({ ...manualDrill, title: e.target.value })}
                  placeholder="Drill name e.g. Cross-court forehand rally"
                  className="rounded-xl"
                />
                <Textarea
                  value={manualDrill.description}
                  onChange={e => setManualDrill({ ...manualDrill, description: e.target.value })}
                  placeholder="Instructions, cues, duration..."
                  rows={3}
                  className="resize-none rounded-xl"
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => setShowManual(false)}>
                    Cancel
                  </Button>
                  <Button className="rounded-xl" onClick={saveManualDrill} disabled={saving || !manualDrill.title.trim()}>
                    Add drill
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* AI builder */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">AI drill builder</h3>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label className="mb-2 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Skill focus{' '}
                  <span className="font-normal normal-case text-muted-foreground/80">(select multiple)</span>
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {SKILL_FOCUSES.map(f => {
                    const active = drillForm.focuses.includes(f)
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() =>
                          setDrillForm({
                            ...drillForm,
                            focuses: active ? drillForm.focuses.filter(x => x !== f) : [...drillForm.focuses, f],
                          })
                        }
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted'
                        )}
                      >
                        {f}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <Label className="mb-2 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Lesson type{' '}
                  <span className="font-normal normal-case text-muted-foreground/80">(select multiple)</span>
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {LESSON_TYPES.map(ty => {
                    const active = drillForm.lessonTypes.includes(ty)
                    return (
                      <button
                        key={ty}
                        type="button"
                        onClick={() =>
                          setDrillForm({
                            ...drillForm,
                            lessonTypes: active ? drillForm.lessonTypes.filter(x => x !== ty) : [...drillForm.lessonTypes, ty],
                          })
                        }
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted'
                        )}
                      >
                        {ty}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Player age</Label>
                <Input
                  value={drillForm.age}
                  onChange={e => setDrillForm({ ...drillForm, age: e.target.value })}
                  placeholder="e.g. 12"
                  className="rounded-xl text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Duration</Label>
                <div className="flex gap-1">
                  {['30', '60', '90'].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDrillForm({ ...drillForm, duration: d })}
                      className={cn(
                        'flex-1 rounded-xl border py-2 text-xs font-medium transition-colors',
                        drillForm.duration === d
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Skill level</Label>
                <div className="flex gap-1">
                  {['beginner', 'intermediate', 'advanced'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDrillForm({ ...drillForm, skillLevel: s })}
                      className={cn(
                        'flex-1 rounded-xl border py-2 text-xs font-medium capitalize transition-colors',
                        drillForm.skillLevel === s
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {s.charAt(0).toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mb-4 space-y-2">
              <Label className="text-xs">What to focus on most</Label>
              <Input
                value={drillForm.workOn}
                onChange={e => setDrillForm({ ...drillForm, workOn: e.target.value })}
                placeholder="e.g. Inconsistent topspin, rushes net too early..."
                className="rounded-xl text-sm"
              />
            </div>
            <Button className="gap-2 rounded-xl" onClick={generateDrills} disabled={generating || !drillForm.workOn}>
              <Sparkles size={14} />
              {generating ? 'Generating…' : 'Generate drill plan'}
            </Button>
          </div>

          {generatedPlan && (
            <div className="rounded-2xl border border-primary/25 bg-primary/[0.03] p-5 shadow-sm">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-primary" />
                  <span className="text-sm font-semibold text-foreground">AI-generated plan</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {generatedPlan.total_mins} min · {generatedPlan.drills?.length} drills
                </span>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">{generatedPlan.summary}</p>
              <div className="mb-4 space-y-2">
                {generatedPlan.drills?.map((drill: any, i: number) => (
                  <div key={i} className="flex gap-3 rounded-xl bg-card p-3 ring-1 ring-border">
                    <Badge variant="secondary" className="h-fit shrink-0 px-2 py-1">
                      {drill.duration_mins}m
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{drill.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{drill.description}</p>
                      {drill.coaching_cues?.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {drill.coaching_cues.map((cue: string, j: number) => (
                            <Badge key={j} variant="outline" className="text-xs font-normal">
                              {cue}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2 rounded-xl" onClick={generateDrills}>
                  <RefreshCw size={13} /> Regenerate
                </Button>
                <Button className="rounded-xl" onClick={saveDrillPlan} disabled={saving}>
                  Save to lesson
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Journal tab */}
      {tab === 'journal' && (
        <div className="space-y-4">
          {!isCompleted && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Add session note</h3>
              <Textarea
                value={newEntry}
                onChange={e => setNewEntry(e.target.value)}
                placeholder="What did we work on? What went well? What to focus on next time..."
                rows={4}
                className="resize-none rounded-xl"
              />
              <Button className="mt-3 gap-2 rounded-xl" onClick={addEntry} disabled={saving || !newEntry.trim()}>
                <Plus size={14} /> Add note
              </Button>
            </div>
          )}
          {entries.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No notes for this lesson yet.</div>
          ) : (
            <div className="space-y-3">
              {entries.map(entry => (
                <div key={entry.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="mb-2 text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{entry.content}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteEntry(entry.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Video tab */}
      {tab === 'video' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button className="gap-2 rounded-xl" onClick={() => setOpenUpload(true)}>
              <Upload size={14} /> Upload media
            </Button>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => setShowRecord(!showRecord)}>
              <Circle size={14} className="text-red-500" /> Record
            </Button>
          </div>

          {showRecord && (
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-zinc-900">
                {recording && (
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                    <span className="size-2 animate-pulse rounded-full bg-red-500" />
                    {formatTime(recordingTime)}
                  </div>
                )}
                {recordedChunks.length > 0 && !recording ? (
                  <p className="text-sm text-white">Recording ready to save</p>
                ) : (
                  !recording && <p className="text-sm text-muted-foreground">Camera preview will appear here</p>
                )}
              </div>
              <div className="flex justify-center gap-2">
                {!recording && recordedChunks.length === 0 && (
                  <Button className="gap-2 rounded-xl bg-red-600 hover:bg-red-600/90" onClick={startRecording}>
                    <Circle size={14} /> Start recording
                  </Button>
                )}
                {recording && (
                  <Button variant="outline" className="gap-2 rounded-xl" onClick={stopRecording}>
                    <Square size={14} /> Stop
                  </Button>
                )}
                {recordedChunks.length > 0 && !recording && (
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      setRecordedChunks([])
                      setRecordingTime(0)
                    }}
                  >
                    Retake
                  </Button>
                )}
              </div>
              {recordedChunks.length > 0 && !recording && (
                <div className="space-y-3 border-t border-border pt-4">
                  <Input
                    value={recordTitle}
                    onChange={e => setRecordTitle(e.target.value)}
                    placeholder="Recording title (optional)"
                    className="rounded-xl"
                  />
                  <Button className="w-full rounded-xl" onClick={saveRecording} disabled={uploading}>
                    {uploading ? 'Saving…' : 'Save recording'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {openUpload && (
            <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Upload video or image</h3>
              <input
                type="file"
                accept="video/*,image/*"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
              />
              <Input
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
                placeholder="Title (optional)"
                className="rounded-xl"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setOpenUpload(false)}>
                  Cancel
                </Button>
                <Button className="rounded-xl" onClick={handleUpload} disabled={uploading || !uploadFile}>
                  {uploading ? 'Uploading…' : 'Upload'}
                </Button>
              </div>
            </div>
          )}

          {/* Compare mode banner */}
          {compareMode && (
            <div className="flex items-center justify-between rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
              <div>
                <p className="text-sm font-semibold text-primary">Compare mode</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Select any video from {player?.name}&apos;s history to compare
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
                onClick={() => {
                  setCompareMode(false)
                  setCompareVideoId(null)
                }}
              >
                <X size={16} />
              </Button>
            </div>
          )}

          {compareMode && allPlayerVideos.filter(v => v.id !== compareVideoId).length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-3">
                <p className="text-xs font-semibold text-foreground">All videos from {player?.name}</p>
              </div>
              <div className="divide-y divide-border">
                {allPlayerVideos.filter(v => v.id !== compareVideoId).map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      const baseVideo = videos.find(vid => vid.id === compareVideoId)
                      if (baseVideo) analyzeVideo(baseVideo, v)
                    }}
                    className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/60"
                  >
                    <p className="text-xs font-medium text-foreground">{v.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {format(new Date(v.recorded_at), 'MMM d, yyyy • h:mm a')}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {videos.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No media for this lesson yet.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {videos.map(video => {
                const analysis =
                  videoAnalysis[video.id] ||
                  (video.ai_analysis ? JSON.parse(video.ai_analysis as string) : null)
                const isAnalyzing = analyzingVideo === video.id
                const counts = issueSeverityCounts(analysis)
                const headline = analysisPreviewHeadline(analysis)
                return (
                  <div
                    key={video.id}
                    className={cn(
                      'overflow-hidden rounded-2xl border bg-card transition-all',
                      compareVideoId === video.id ? 'border-primary ring-2 ring-primary/25' : 'border-border'
                    )}
                  >
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
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{video.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(video.recorded_at), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteVideo(video)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>

                      {isAnalyzing && (
                        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                          <Sparkles size={12} className="animate-pulse text-primary" />
                          Generating AI coach feedback…
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
                            View reel
                          </Button>
                        </div>
                      )}

                      <div className="space-y-2">
                        <select
                          value={shotType}
                          onChange={event => setShotType(event.target.value)}
                          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground"
                        >
                          <option value="">Auto-detect shot type</option>
                          {SHOT_TYPES.map(option => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      <div className="flex gap-2">
                        {!compareMode ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              className="min-h-9 flex-1 gap-1"
                              disabled={isAnalyzing}
                              onClick={() => analyzeVideo(video)}
                            >
                              <Sparkles size={12} />
                              {isAnalyzing ? 'Adding to Reels (may take 30s)…' : analysis ? 'Re-run reel' : 'Add to Reels'}
                            </Button>
                            {allPlayerVideos.length > 1 && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="min-h-9 flex-1"
                                onClick={() => {
                                  setCompareMode(true)
                                  setCompareVideoId(video.id)
                                }}
                              >
                                Compare
                              </Button>
                            )}
                          </>
                        ) : compareVideoId !== video.id ? (
                          <Button
                            type="button"
                            size="sm"
                            className="min-h-9 flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => {
                              const baseVideo = videos.find(v => v.id === compareVideoId)
                              if (baseVideo) analyzeVideo(baseVideo, video)
                            }}
                          >
                            Compare with this
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-h-9 flex-1"
                            onClick={() => {
                              setCompareMode(false)
                              setCompareVideoId(null)
                            }}
                          >
                            <X size={12} /> Cancel
                          </Button>
                        )}
                      </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
        lessonId={lesson?.id ?? (typeof id === 'string' ? id : null)}
        sport={player?.sport ?? null}
        coachingVideos={coachingVideos}
        loadingCoachingVideo={loadingCoachingVideo}
        onFetchCoachingVideos={fetchCoachingVideos}
        analysis={
          sheetVideo
            ? videoAnalysis[sheetVideo.id] ??
              (typeof sheetVideo.ai_analysis === 'string'
                ? JSON.parse(sheetVideo.ai_analysis)
                : sheetVideo.ai_analysis)
            : null
        }
      />

      <Dialog open={completeModal} onOpenChange={setCompleteModal}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Complete lesson</DialogTitle>
            <DialogDescription>
              Add a session note to complete this lesson. Visible on {player?.name}&apos;s athlete portal (shared login).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={completeNote}
            onChange={e => setCompleteNote(e.target.value)}
            placeholder="What did we work on? What went well? What to focus on next time..."
            rows={5}
            className="resize-none rounded-xl"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-xl" onClick={() => setCompleteModal(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={completeLesson} disabled={saving || !completeNote.trim()}>
              {saving ? 'Saving…' : 'Complete lesson'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}