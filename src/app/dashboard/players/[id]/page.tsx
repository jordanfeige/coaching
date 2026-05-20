'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Sparkles, Video, BookOpen, Dumbbell, Clock, RefreshCw, X, CheckCircle, TrendingUp, GraduationCap } from 'lucide-react'
import RecruitingProfile from '@/components/RecruitingProfile'
import CoachRecruitingWaiting from '@/components/CoachRecruitingWaiting'
import AnalysisStepperDialog from '@/components/video/AnalysisStepperDialog'
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
import {
  analysisPreviewHeadline,
  issueSeverityCounts,
} from '@/components/video/VideoAnalysisDialog'
import {
  buildCoachReviewConfig,
  findAnalysisSession,
  getVideoAnalysisRecord,
  resolveAnalysisSessionId,
} from '@/lib/analysis-display'
import { cn } from '@/lib/utils'
import { mimeTypeFromStoragePath } from '@/lib/video-frames'
import { titleInitials } from '@/lib/video-thumbnails'
import PlayerOverviewTab from '@/components/player/PlayerOverviewTab'
import UniversalVia from '@/components/UniversalVia'
import { formatLessonTime } from '@/lib/via-page-brief'
import { typography } from '@/lib/brand'

/** Legacy rows may still store `baseball`; treat as pickleball for focuses / AI. */
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

function skillBadgeVariant(level: string): 'default' | 'secondary' | 'destructive' {
  if (level === 'advanced') return 'destructive'
  if (level === 'intermediate') return 'secondary'
  return 'default'
}

function lessonStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'completed') return 'secondary'
  if (status === 'cancelled') return 'destructive'
  return 'outline'
}

const UTR_TEAL = '#1D9E75'
const UTR_BORDER = 'hsl(30,10%,88%)'
const UTR_TEXT = 'hsl(220,20%,15%)'
const UTR_TEXT_MUTED = 'hsl(220,10%,65%)'
const UTR_WARM_BG = 'hsl(40,20%,97%)'

export default function PlayerDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [player, setPlayer] = useState<any>(null)
  const [entries, setEntries] = useState<any[]>([])
  const [drills, setDrills] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [videos, setVideos] = useState<any[]>([])
  const [playerSessions, setPlayerSessions] = useState<any[]>([])
  const [tab, setTab] = useState<
    'overview' | 'journal' | 'drills' | 'history' | 'video' | 'recruiting'
  >('overview')
  const [newEntry, setNewEntry] = useState('')
  const [saving, setSaving] = useState(false)
  const [completeModal, setCompleteModal] = useState<any>(null)
  const [completeNote, setCompleteNote] = useState('')
  const [drillForm, setDrillForm] = useState({
    age: '', focuses: ['Forehand'], lessonTypes: ['Technical'],
    duration: '60', workOn: '', skillLevel: 'intermediate'
  })
  const [generatedPlan, setGeneratedPlan] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [analyzingVideo, setAnalyzingVideo] = useState<string | null>(null)
  const [videoAnalysis, setVideoAnalysis] = useState<Record<string, any>>({})
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({})
  const [compareMode, setCompareMode] = useState(false)
  const [compareVideoId, setCompareVideoId] = useState<string | null>(null)
  const [shotType, setShotType] = useState('')
  const [analysisFlow, setAnalysisFlow] = useState<{
    video: any
    sessionId?: string
    analysis: Record<string, unknown>
  } | null>(null)
  const [recruitingProfile, setRecruitingProfile] = useState<{
    wizard_completed?: boolean
    updated_at?: string
    utr_singles?: number | null
    target_division?: string | null
  } | null>(null)
  const [showUTRLink, setShowUTRLink] = useState(false)
  const [utrSearchQuery, setUtrSearchQuery] = useState('')
  const [utrSearchResults, setUtrSearchResults] = useState<
    { id: string | number; name: string; singlesUtr?: number; location?: string; ageRange?: string }[]
  >([])
  const [utrSearching, setUtrSearching] = useState(false)
  const [utrLinking, setUtrLinking] = useState(false)
  const [utrSearchError, setUtrSearchError] = useState('')

  async function parseApiJson(res: Response) {
    const text = await res.text()
    if (!text.trim()) return { success: false as const, error: 'Empty response from server' }
    try {
      return JSON.parse(text) as {
        success?: boolean
        players?: typeof utrSearchResults
        error?: string
      }
    } catch {
      return { success: false as const, error: 'Invalid response from server' }
    }
  }

  const supabase = createClient()

  useEffect(() => { loadAll() }, [id])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedTab = params.get('tab')
    const focus = params.get('focus') || ''
    if (requestedTab === 'drills') {
      setTab('drills')
      if (focus) {
        setDrillForm(prev => ({
          ...prev,
          workOn: focus,
          focuses: [focus],
        }))
      }
    }
    if (requestedTab === 'overview' || requestedTab === 'analytics') {
      setTab('overview')
    }
    if (requestedTab === 'video' || requestedTab === 'reels') {
      setTab('video')
    }
    if (requestedTab === 'recruiting') {
      setTab('recruiting')
    }
  }, [])

  async function loadAll() {
    const { data: p } = await supabase.from('players').select('*').eq('id', id).single()
    const { data: e } = await supabase.from('journal_entries').select('*').eq('player_id', id).order('created_at', { ascending: false })
    const { data: d } = await supabase.from('drills').select('*').eq('player_id', id).order('created_at', { ascending: false })
    const { data: l } = await supabase.from('lessons').select('*, journal_entries(content, created_at)').eq('player_id', id).order('starts_at', { ascending: false })
    const { data: v } = await supabase.from('videos').select('*').eq('player_id', id).order('recorded_at', { ascending: false })
    const { data: s } = await supabase.from('analysis_sessions').select('*').eq('player_id', id).order('analyzed_at', { ascending: true })
    const { data: recruiting } = await supabase
      .from('recruiting_profiles')
      .select('wizard_completed, updated_at, utr_singles, target_division')
      .eq('player_id', id)
      .maybeSingle()
    setPlayer(p)
    setRecruitingProfile(recruiting)
    setEntries(e || [])
    setDrills(d || [])
    setLessons(l || [])
    setVideos(v || [])
    setPlayerSessions(s || [])
  }

  async function doUTRSearch() {
    if (!utrSearchQuery.trim()) return
    setUtrSearching(true)
    setUtrSearchResults([])
    setUtrSearchError('')
    try {
      const res = await fetch('/api/utr-player-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          query: utrSearchQuery,
        }),
      })
      const data = await parseApiJson(res)
      if (data.success) {
        setUtrSearchResults(data.players || [])
        if (!(data.players || []).length) {
          setUtrSearchError('No players found — try a different name or spelling.')
        }
      } else {
        setUtrSearchError(
          data.error ||
            (res.status === 401
              ? 'Please sign in again to search UTR.'
              : `Search failed (${res.status})`),
        )
      }
    } catch (e) {
      console.error('UTR search error:', e)
      setUtrSearchError(
        e instanceof Error ? e.message : 'Search failed — check your connection.',
      )
    }
    setUtrSearching(false)
  }

  useEffect(() => {
    if (showUTRLink && utrSearchQuery.trim()) {
      void doUTRSearch()
    }
  }, [showUTRLink])

  async function addEntry() {
    if (!newEntry.trim()) return
    setSaving(true)
    await supabase.from('journal_entries').insert({ player_id: id, content: newEntry })
    setNewEntry('')
    setSaving(false)
    loadAll()
  }

  async function deleteEntry(entryId: string) {
    await supabase.from('journal_entries').delete().eq('id', entryId)
    loadAll()
  }

  async function completeLesson() {
    if (!completeNote.trim() || !completeModal) return
    setSaving(true)
    await supabase.from('lessons').update({ status: 'completed' }).eq('id', completeModal.id)
    await supabase.from('journal_entries').insert({ player_id: id, lesson_id: completeModal.id, content: completeNote })
    setCompleteModal(null)
    setCompleteNote('')
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
      if (!res.ok) { const err = await res.json(); alert(`Error: ${err.error}`); return }
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
    } catch (e: any) {
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
        player_id: id,
        title: drill.title,
        description: `${drill.description}\n\nCoaching cues: ${drill.coaching_cues?.join(', ')}`,
        steps: JSON.stringify({ duration_mins: drill.duration_mins, equipment: drill.equipment }),
      })
    }
    setGeneratedPlan(null)
    setSaving(false)
    loadAll()
  }

  async function deleteDrill(drillId: string) {
    await supabase.from('drills').delete().eq('id', drillId)
    loadAll()
  }

  async function getVideoUrl(path: string) {
    const { data } = await supabase.storage.from('videos').createSignedUrl(path, 3600)
    return data?.signedUrl || ''
  }

  function openAnalysisStepper(video: any) {
    const analysis = getVideoAnalysisRecord(video, videoAnalysis, playerSessions)
    if (!analysis) {
      alert('No analysis yet. Use Add to Reels first.')
      return
    }
    const sessionId = resolveAnalysisSessionId(analysis, video.id, playerSessions)
    setAnalysisFlow({ video, analysis, sessionId })
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

      const compareUrl = compareVideo ? await getVideoUrl(compareVideo.storage_path) : undefined
      if (compareVideo && !compareUrl) {
        alert('Could not access the comparison video. Reload and try again.')
        return
      }
      const playerHistory = entries.slice(0, 3).map(entry => entry.content).join('\n---\n')
      const response = await fetch('/api/video-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: url,
          videoMimeType: mimeTypeFromStoragePath(video.storage_path || video.title),
          ...(compareUrl
            ? {
                compareVideoUrl: compareUrl,
                compareVideoMimeType: mimeTypeFromStoragePath(
                  compareVideo.storage_path || compareVideo.title,
                ),
              }
            : {}),
          playerName: player?.name,
          playerId: player?.id || id || null,
          sport: analysisSportKey(player?.sport),
          shotType,
          playerHistory,
          cameraAngle: 'side-on',
          existingVideoId: video.id,
          storagePath: video.storage_path
            ? `videos/${video.storage_path}`
            : undefined,
          lessonId: video.lesson_id || undefined,
        }),
      })
      const analysis = await response.json()
      if (!response.ok || analysis.error) {
        const message =
          response.status === 413
            ? 'Video file is too large for inline upload. Hard-refresh the page and try Re-run reel again.'
            : analysis.error || 'Reel failed'
        throw new Error(message)
      }
      await supabase
        .from('videos')
        .update({ ai_analysis: JSON.stringify(analysis) })
        .eq('id', video.id)
      const sessionId =
        typeof analysis.sessionId === 'string'
          ? analysis.sessionId
          : typeof analysis.session_id === 'string'
            ? analysis.session_id
            : null
      if (!sessionId) {
        throw new Error('Analysis saved but session id missing')
      }
      setVideoAnalysis(prev => ({ ...prev, [video.id]: analysis }))
      setAnalysisFlow({ video, sessionId, analysis })
    } catch (e: any) {
      alert(`Reel failed: ${e.message}`)
    } finally {
      setAnalyzingVideo(null)
      setCompareMode(false)
      setCompareVideoId(null)
      loadAll()
    }
  }

  function openDrillBuilder(focus?: string) {
    setTab('drills')
    setDrillForm(prev => ({
      ...prev,
      workOn: focus || prev.workOn,
      focuses: focus ? [focus] : prev.focuses,
    }))
  }

  const sortedSessions = useMemo(() => playerSessions, [playerSessions])
  const latestSession = useMemo(
    () => sortedSessions[sortedSessions.length - 1] ?? null,
    [sortedSessions],
  )
  const totalGain = useMemo(() => {
    const first = sortedSessions[0]?.overall_score
    const last = latestSession?.overall_score
    if (first == null || last == null) return 0
    return last - first
  }, [sortedSessions, latestSession])
  const activeIssues = useMemo(() => {
    const issues: string[] = []
    if (latestSession?.top_issue) issues.push(latestSession.top_issue)
    const areas = latestSession?.full_result?.areas_to_improve as
      | Array<{ area?: string }>
      | undefined
    if (areas?.length) {
      for (const area of areas) {
        if (area?.area) issues.push(area.area)
      }
    }
    return [...new Set(issues)]
  }, [latestSession])
  const fixedIssues = useMemo(() => {
    const latestIssue = latestSession?.top_issue
    const past = sortedSessions
      .slice(0, -1)
      .map(s => s.top_issue)
      .filter((issue): issue is string => Boolean(issue))
    return [...new Set(past.filter(issue => issue !== latestIssue))]
  }, [sortedSessions, latestSession])
  const scoreDelta = useMemo(() => {
    const latest = sortedSessions[sortedSessions.length - 1]?.overall_score
    const prev = sortedSessions[sortedSessions.length - 2]?.overall_score
    if (typeof latest !== 'number' || typeof prev !== 'number') return undefined
    return latest - prev
  }, [sortedSessions])

  const nextLesson = useMemo(() => {
    const upcoming = lessons
      .filter(
        (lesson: { status?: string; starts_at?: string }) =>
          lesson.status === 'scheduled' &&
          lesson.starts_at &&
          new Date(lesson.starts_at).getTime() >= Date.now(),
      )
      .sort(
        (a: { starts_at: string }, b: { starts_at: string }) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      )
    return upcoming[0] ?? null
  }, [lessons])

  const tabs = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'journal', label: 'Journal', icon: BookOpen },
    { key: 'drills', label: 'Drills', icon: Dumbbell },
    { key: 'history', label: 'Lesson history', icon: Clock },
    { key: 'video', label: 'Videos', icon: Video },
    { key: 'recruiting', label: 'Recruiting', icon: GraduationCap },
  ]

  if (!player) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>

  const sportConfig = SPORT_CONFIG[normalizeSportKey(player?.sport)] || SPORT_CONFIG.tennis
  const SKILL_FOCUSES = sportConfig.focuses
  const LESSON_TYPES = sportConfig.lessonTypes
  const SHOT_TYPES = shotTypeOptionsForSport(player?.sport)
  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
        <Link
          href="/dashboard/players"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-fit gap-2 rounded-xl')}
        >
          <ArrowLeft size={14} /> Back
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 style={{ ...typography.playerName, color: 'hsl(var(--foreground))' }}>{player.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {player.email && <span className="text-sm text-muted-foreground">{player.email}</span>}
              <Badge variant={skillBadgeVariant(player.skill_level)} className="capitalize">
                {player.skill_level}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {(normalizeSportKey(player.sport || 'tennis')).replace(/^./, c => c.toUpperCase())}
              </Badge>
              <button
                type="button"
                onClick={() => {
                  if (player.utr_player_id) {
                    setTab('recruiting')
                  } else {
                    setUtrSearchQuery(player.name || '')
                    setUtrSearchResults([])
                    setUtrSearchError('')
                    setShowUTRLink(true)
                  }
                }}
                className="inline-flex"
              >
                <Badge
                  variant={player.utr_player_id ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer',
                    player.utr_player_id
                      ? 'bg-[#085041] hover:bg-[#0F6E56]'
                      : 'text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100',
                  )}
                >
                  {player.utr_player_id
                    ? `UTR linked${player.utr_singles != null ? ` · ${Number(player.utr_singles).toFixed(2)}` : ''}`
                    : 'UTR not linked'}
                </Badge>
              </button>
            </div>
          </div>
        </div>
      </div>

      <UniversalVia
        role="coach"
        playerId={String(id)}
        playerName={player.name}
        pageContext={{
          page:
            tab === 'recruiting'
              ? 'player-profile-recruiting'
              : 'player-profile',
          playerId: String(id),
          playerName: player.name,
          playerFirstName: player.name.split(' ')[0],
          activeIssue: latestSession?.top_issue || undefined,
          techniqueScore: latestSession?.overall_score ?? undefined,
          scoreDelta,
          nextLessonDate: nextLesson?.starts_at
            ? formatLessonTime(nextLesson.starts_at)
            : undefined,
          sessionCount: playerSessions.length,
          utrSingles:
            recruitingProfile?.utr_singles != null
              ? Number(recruitingProfile.utr_singles)
              : player.utr_singles != null
                ? Number(player.utr_singles)
                : undefined,
          targetDivision:
            recruitingProfile?.target_division || undefined,
        }}
      />

      {/* Tabs */}
      <div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/50 p-1 md:w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            data-tab={key}
            onClick={() => setTab(key as any)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              tab === key
                ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <PlayerOverviewTab
          player={{ id: String(id), name: player.name }}
          sessions={playerSessions}
          sortedSessions={sortedSessions}
          latestSession={latestSession}
          activeIssues={activeIssues}
          fixedIssues={fixedIssues}
          totalGain={totalGain}
          nextLesson={nextLesson}
          utrLinked={!!player.utr_player_id}
          utrSingles={player.utr_singles}
          utrLastSynced={player.utr_last_synced}
          onLinkUTR={() => {
            setUtrSearchQuery(player.name || '')
            setUtrSearchResults([])
            setUtrSearchError('')
            setShowUTRLink(true)
          }}
          onSyncUTR={async () => {
            await fetch('/api/utr-player-sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'sync',
                playerId: player.id,
              }),
            })
            loadAll()
          }}
        />
      )}

      {tab === 'journal' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">New entry</h3>
            <Textarea
              value={newEntry}
              onChange={e => setNewEntry(e.target.value)}
              placeholder="Notes from today's lesson — what went well, what to work on..."
              rows={4}
              className="resize-none rounded-xl"
            />
            <Button className="mt-3 gap-2 rounded-xl" onClick={addEntry} disabled={saving || !newEntry.trim()}>
              <Plus size={14} /> Add entry
            </Button>
          </div>
          {entries.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No journal entries yet.</div>
          ) : (
            <div className="space-y-3">
              {entries.map(entry => (
                <div key={entry.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="mb-2 text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), 'MMMM d, yyyy • h:mm a')}
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

      {/* Drills tab */}
      {tab === 'drills' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">AI drill builder</h3>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label className="mb-2 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Skill focus <span className="font-normal normal-case text-muted-foreground/80">(select multiple)</span>
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
                  Lesson type <span className="font-normal normal-case text-muted-foreground/80">(select multiple)</span>
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {LESSON_TYPES.map(t => {
                    const active = drillForm.lessonTypes.includes(t)
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setDrillForm({
                            ...drillForm,
                            lessonTypes: active ? drillForm.lessonTypes.filter(x => x !== t) : [...drillForm.lessonTypes, t],
                          })
                        }
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted'
                        )}
                      >
                        {t}
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
                      {s.charAt(0)}
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
                  Save to player
                </Button>
              </div>
            </div>
          )}

          {drills.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Saved drills</h3>
              {drills.map(drill => (
                <div
                  key={drill.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{drill.title}</p>
                    {drill.description && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{drill.description.split('\n')[0]}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">{format(new Date(drill.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteDrill(drill.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="space-y-3">
          {lessons.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No lessons yet.</div>
          ) : (
            lessons.map(lesson => {
              const journalEntry = lesson.journal_entries?.[0]
              const playerViewedAt = lesson.player_viewed_at
              return (
                <div
                  key={lesson.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => router.push(`/dashboard/lessons/${lesson.id}`)}
                    >
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(lesson.starts_at), 'EEEE, MMM d yyyy')}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {format(new Date(lesson.starts_at), 'h:mm a')} · {lesson.duration_mins} min
                      </p>
                      {journalEntry && (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{journalEntry.content}</p>
                      )}
                      {lesson.published_at && (
                        playerViewedAt ? (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            <CheckCircle className="size-3" />
                            Viewed {format(new Date(playerViewedAt), 'MMM d')}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">Not yet viewed</p>
                        )
                      )}
                    </button>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Badge variant={lessonStatusVariant(lesson.status)} className="capitalize">
                        {lesson.status}
                      </Badge>
                      {lesson.status === 'scheduled' && (
                        <Button
                          size="sm"
                          className="rounded-lg px-3 text-xs"
                          onClick={e => {
                            e.stopPropagation()
                            setCompleteModal(lesson)
                            setCompleteNote('')
                          }}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Video tab */}
      {tab === 'video' && (
        <div className="space-y-4">
          {videos.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No media yet. Upload from the Video page.
            </div>
          ) : (
            <>
              {compareMode && (
                <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <p className="text-sm font-medium text-blue-700">Compare mode</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pick a second clip. The app will keep both frame sets with the local posture analysis.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {videos.map(video => {
                  const analysis = getVideoAnalysisRecord(video, videoAnalysis, playerSessions)
                  const isAnalyzing = analyzingVideo === video.id
                  const counts = issueSeverityCounts(analysis)
                  const headline = analysisPreviewHeadline(analysis)
                  return (
                    <div
                      key={video.id}
                      className={cn(
                        'overflow-hidden rounded-2xl border bg-card transition-all',
                        compareVideoId === video.id ? 'border-blue-500 ring-2 ring-blue-500/25' : 'border-border'
                      )}
                    >
                      <button
                        type="button"
                        className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-muted"
                        onClick={() => openAnalysisStepper(video)}
                      >
                        {video.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/25 via-primary/10 to-muted">
                            <span className="font-heading text-3xl font-bold text-primary">{titleInitials(video.title)}</span>
                          </div>
                        )}
                        {analysis && (
                          <span className="absolute bottom-2 left-2 rounded-md bg-background/95 px-2 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm backdrop-blur-sm">
                            Tap for breakdown
                          </span>
                        )}
                      </button>
                      <div className="space-y-3 p-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{video.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(video.recorded_at), 'MMM d, yyyy • h:mm a')}
                          </p>
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
                              {counts.minor > 0 && <Badge variant="outline">{counts.minor} minor</Badge>}
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
                              {videos.length > 1 && (
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
                              className="min-h-9 flex-1 bg-blue-600 text-white hover:bg-blue-600/90"
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
            </>
          )}
        </div>
      )}

      {tab === 'recruiting' && (
        <>
          {!recruitingProfile?.wizard_completed ? (
            <CoachRecruitingWaiting
              player={{
                id: String(id),
                name: player.name,
                sport: normalizeSportKey(player.sport),
              }}
              onComplete={() => loadAll()}
            />
          ) : (
            <RecruitingProfile
              playerId={String(id)}
              playerName={player.name}
              sport={normalizeSportKey(player.sport)}
              isCoach={true}
              analysisSessions={playerSessions}
            />
          )}
        </>
      )}

      <AnalysisStepperDialog
        open={!!analysisFlow}
        onOpenChange={open => {
          if (!open) setAnalysisFlow(null)
        }}
        analysis={analysisFlow?.analysis ?? null}
        sport={analysisSportKey(player?.sport)}
        shotType={(analysisFlow?.video?.shot_type ?? shotType) || undefined}
        sessionId={analysisFlow?.sessionId}
        playerId={String(id)}
        coachReview={
          analysisFlow
            ? buildCoachReviewConfig({
                sessionId: analysisFlow.sessionId,
                playerId: String(id),
                playerName: player?.name || 'Player',
                lessonId: analysisFlow.video.lesson_id || undefined,
                session: findAnalysisSession(
                  playerSessions,
                  analysisFlow.video.id,
                  analysisFlow.sessionId,
                ),
                onVerified: () => void loadAll(),
                onPublished: () => {
                  void loadAll()
                  setAnalysisFlow(null)
                },
              })
            : undefined
        }
        onReanalyze={() => setAnalysisFlow(null)}
      />

      {showUTRLink && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.45)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setShowUTRLink(false)
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              width: '100%',
              maxWidth: 440,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '13px 16px',
                borderBottom: `0.5px solid ${UTR_BORDER}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500, color: UTR_TEXT }}>
                Link {player.name}&apos;s UTR
              </span>
              <button
                type="button"
                onClick={() => setShowUTRLink(false)}
                style={{
                  background: UTR_WARM_BG,
                  border: `0.5px solid ${UTR_BORDER}`,
                  borderRadius: 7,
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: UTR_TEXT_MUTED,
                  fontSize: 16,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <p
                style={{
                  fontSize: 12,
                  color: UTR_TEXT_MUTED,
                  marginBottom: 12,
                  lineHeight: 1.55,
                }}
              >
                Search for {player.name} on UTR. Pick the right profile — this only
                needs to happen once.
              </p>
              <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
                <input
                  value={utrSearchQuery}
                  onChange={e => setUtrSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') void doUTRSearch()
                  }}
                  placeholder={`Search "${player.name}"...`}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: 9,
                    border: `0.5px solid ${UTR_BORDER}`,
                    background: UTR_WARM_BG,
                    fontSize: 13,
                    color: UTR_TEXT,
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => void doUTRSearch()}
                  disabled={utrSearching || !utrSearchQuery.trim()}
                  style={{
                    padding: '9px 14px',
                    borderRadius: 9,
                    background: utrSearching ? UTR_BORDER : UTR_TEAL,
                    border: 'none',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {utrSearching ? '...' : 'Search'}
                </button>
              </div>
              {utrSearchError && (
                <p
                  style={{
                    fontSize: 12,
                    color: '#B45309',
                    marginBottom: 10,
                    lineHeight: 1.5,
                  }}
                >
                  {utrSearchError}
                </p>
              )}
              {utrSearchResults.length > 0 && (
                <div
                  style={{
                    border: `0.5px solid ${UTR_BORDER}`,
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  {utrSearchResults.map((p, i) => (
                    <div
                      key={String(p.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 13px',
                        borderTop: i > 0 ? `0.5px solid ${UTR_BORDER}` : 'none',
                        background: i % 2 === 0 ? 'white' : UTR_WARM_BG,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: UTR_TEXT,
                          }}
                        >
                          {p.name}
                        </div>
                        <div style={{ fontSize: 11, color: UTR_TEXT_MUTED }}>
                          UTR {p.singlesUtr ?? '—'}
                          {p.location ? ` · ${p.location}` : ''}
                          {p.ageRange ? ` · ${p.ageRange}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          setUtrLinking(true)
                          try {
                            const res = await fetch('/api/utr-player-sync', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: 'link',
                                utrPlayerId: p.id.toString(),
                                playerId: player.id,
                              }),
                            })
                            const data = await parseApiJson(res)
                            if (data.success) {
                              setShowUTRLink(false)
                              setUtrSearchResults([])
                              setUtrSearchQuery('')
                              loadAll()
                            } else {
                              setUtrSearchError(
                                data.error || `Link failed (${res.status})`,
                              )
                            }
                          } finally {
                            setUtrLinking(false)
                          }
                        }}
                        disabled={utrLinking}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 8,
                          background: utrLinking ? UTR_BORDER : UTR_TEAL,
                          border: 'none',
                          color: 'white',
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        {utrLinking ? '...' : 'Link →'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!completeModal} onOpenChange={o => !o && setCompleteModal(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Complete lesson</DialogTitle>
            <DialogDescription>Add a session note before marking this lesson complete.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={completeNote}
            onChange={e => setCompleteNote(e.target.value)}
            placeholder="What did we work on? What went well? What to focus on next time..."
            rows={5}
            className="resize-none rounded-xl"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-xl" onClick={() => setCompleteModal(null)}>
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