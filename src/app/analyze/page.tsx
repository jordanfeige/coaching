'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Upload, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { WaitlistForm } from '@/components/waitlist/WaitlistForm'
import { brand } from '@/lib/brand'
import FeedbackButtons from '@/components/FeedbackButtons'
import PDFExportButton from '@/components/PDFExportButton'
import AnalysisQualityBadges from '@/components/AnalysisQualityBadges'
import PoseSplitView from '@/components/PoseSplitView'
import AnalysisResultStepper, {
  mapAnalysisIssues,
  mapAnalysisStrengths,
} from '@/components/AnalysisResultStepper'
import TextSessionSection, {
  type TextAnalysisResult,
} from '@/components/TextSessionSection'
import { measurementsToPromptText, type PoseAnalysisResult } from '@/lib/poseAnalysis'

type Sport = 'tennis' | 'golf' | 'baseball' | 'basketball' | 'pickleball'
type Severity = 'critical' | 'moderate' | 'minor'

type AnalysisIssue = {
  area?: string
  severity?: Severity
  what_i_see?: string
  ideal?: string
  consequence?: string
  drill?: string
  drill_sets_reps?: string
  drill_instruction?: string
  success_criteria?: string
  simple_cue?: string
}

type AnalysisStrength = {
  area?: string
  what_i_see?: string
  why_it_helps?: string
}

type AnalysisResult = {
  observations?: string
  technique_notes?: string
  strengths?: AnalysisStrength[]
  areas_to_improve?: AnalysisIssue[]
  overall_rating?: string
  biggest_win?: string
  priority_focus?: string
  confidence?: string
  overall_score?: number
  score?: number
  issues?: AnalysisIssue[]
  checkpoint_scores?: Record<string, number>
  previous_score?: number | null
  score_delta?: number | null
  session_id?: string | null
  sessionId?: string | null
}

type AnalysisGate = {
  type: 'signup' | 'upgrade'
  message: string
  analysesUsed?: number
  scorePreview?: number[] | null
}

type CoachingVideo = {
  videoId: string
  title: string
  thumbnail: string
  channelTitle: string
  description?: string
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const SPORTS: Sport[] = ['tennis', 'golf', 'baseball', 'basketball', 'pickleball']
const SPORT_LABELS: Record<Sport, string> = {
  tennis: '🎾 Tennis',
  golf: '⛳ Golf',
  baseball: '⚾ Baseball',
  basketball: '🏀 Basketball',
  pickleball: '🏓 Pickleball',
}
const SHOT_TYPES: Record<Sport, string[]> = {
  tennis: ['Forehand', 'Backhand', 'Serve', 'Volley', 'Overhead'],
  golf: ['Driver', 'Iron', 'Chip', 'Putt', 'Bunker'],
  baseball: ['Batting', 'Pitching'],
  basketball: ['Jump shot', 'Free throw', 'Layup'],
  pickleball: ['Serve', 'Return', 'Dink', 'Volley', 'Third shot drop', 'Drive'],
}
const LOADING_MESSAGES = [
  'Uploading your video...',
  'Via is watching your technique...',
  'Measuring joint angles...',
  'Identifying issues...',
  'Building your drill plan...',
  'Almost done...',
]
const MAX_VIDEO_FILE_MB = 300
const MAX_VIDEO_DURATION_SECONDS = 60
const SHARE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://playvia.studio'
const CHAT_STARTERS = [
  'What should I fix first?',
  'Give me one drill for this.',
  'Explain this in beginner terms.',
]

function decodeResult(value: string): AnalysisResult | null {
  try {
    return JSON.parse(decodeURIComponent(atob(value)))
  } catch {
    return null
  }
}

function safeReturnTo(value: string | null) {
  return value === '/player' ? value : ''
}

function fileSizeLabel(file: File) {
  return `${(file.size / 1024 / 1024).toFixed(1)} MB`
}

function durationLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.round(seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remaining}`
}

function timestampToSeconds(timestamp: string) {
  if (timestamp.includes(':')) {
    const parts = timestamp.split(':')
    return Number.parseInt(parts[0], 10) * 60 + Number.parseFloat(parts[1])
  }
  return Number.parseFloat(timestamp.replace('s', ''))
}

function extractTimestamps(text: string): string[] {
  const matches = text.match(/\d+:\d+|\d+\.\d+s/g) || []
  return [...new Set(matches)]
}

function getVideoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(video.duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read video duration'))
    }
    video.src = url
  })
}

async function parseJsonResponse(response: Response) {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    if (text.startsWith('Request Entity Too Large')) {
      throw new Error('That video is too large for the server upload path. Try exporting at 720p, or use a smaller file.')
    }
    throw new Error(text.slice(0, 240) || 'Server returned an unreadable response')
  }
}

function renderCoachAnswer(content: string) {
  return content.split('\n').map((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) return null
    return <p key={index}>{trimmed.replace(/\*\*/g, '')}</p>
  })
}

function YouTubeCards({ videos }: { videos: CoachingVideo[] }) {
  if (!videos.length) return null
  return (
    <div className="mt-3 space-y-2">
      {videos.slice(0, 3).map(video => (
        <a
          key={video.videoId}
          href={`https://www.youtube.com/watch?v=${video.videoId}`}
          target="_blank"
          rel="noreferrer"
          className="flex cursor-pointer items-center gap-3 overflow-hidden rounded-xl border p-2 transition-all hover:border-[#FF4444]"
          style={{ background: brand.cardAlt, borderColor: brand.border }}
        >
          {video.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={video.thumbnail} alt="" className="h-[68px] w-[120px] shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-[68px] w-[120px] shrink-0 items-center justify-center rounded-lg bg-black text-xs text-white">
              YouTube
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[11px] font-semibold" style={{ color: brand.text }}>
              {video.title.length > 60 ? `${video.title.slice(0, 60)}...` : video.title}
            </p>
            <div className="mt-1 flex items-center gap-1">
              <svg width="13" height="9" viewBox="0 0 13 9" fill="none" aria-hidden="true">
                <rect width="13" height="9" rx="2" fill="#FF0000" />
                <path d="M5.2 2.2L8.8 4.5L5.2 6.8V2.2Z" fill="white" />
              </svg>
              <p className="truncate text-[10px]" style={{ color: brand.textSecondary }}>{video.channelTitle}</p>
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}

export default function AnalyzePage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const videoRef = useRef<HTMLVideoElement>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [sport, setSport] = useState<Sport>('tennis')
  const [shotType, setShotType] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [videoURL, setVideoURL] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const [poseResult, setPoseResult] = useState<PoseAnalysisResult | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null)
  const [discarded, setDiscarded] = useState(false)
  const [linkedPlayerId, setLinkedPlayerId] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [loadingIndex, setLoadingIndex] = useState(0)
  const [error, setError] = useState('')
  const [coachingVideos, setCoachingVideos] = useState<Record<string, CoachingVideo[]>>({})
  const [loadingCoachingVideo, setLoadingCoachingVideo] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const [coachPanelOpen, setCoachPanelOpen] = useState(false)
  const [showSaveNotice, setShowSaveNotice] = useState(false)
  const [returnTo, setReturnTo] = useState('')
  const [showWelcome, setShowWelcome] = useState(false)
  const [autoFetchedIssueArea, setAutoFetchedIssueArea] = useState('')
  const [analysisGate, setAnalysisGate] = useState<AnalysisGate | null>(null)
  const [noticeMessage, setNoticeMessage] = useState('')
  const [mode, setMode] = useState<'video' | 'text'>('video')

  const WARM_BG = 'hsl(40,20%,97%)'
  const ANALYZE_BORDER = 'hsl(30,10%,88%)'
  const ANALYZE_TEXT = 'hsl(220,20%,15%)'
  const ANALYZE_TEXT_MUTED = 'hsl(220,10%,65%)'

  const shotTypes = useMemo(() => SHOT_TYPES[sport], [sport])
  const fileTooLarge = Boolean(file && file.size > MAX_VIDEO_FILE_MB * 1024 * 1024)
  const durationTooLong = Boolean(videoDuration && videoDuration > MAX_VIDEO_DURATION_SECONDS)
  const canAnalyze = Boolean(file && !fileTooLarge && !durationTooLong && !analyzing)
  const keyMoments = useMemo(() => {
    const moments: { ts: string; label: string; type: 'issue' | 'strength' }[] = []
    analysis?.areas_to_improve?.forEach(issue => {
      extractTimestamps(issue.what_i_see || '').forEach(ts => {
        moments.push({ ts, label: issue.area || 'Issue', type: 'issue' })
      })
    })
    analysis?.strengths?.forEach(strength => {
      extractTimestamps(strength.what_i_see || '').forEach(ts => {
        moments.push({ ts, label: strength.area || 'Strength', type: 'strength' })
      })
    })

    moments.sort((a, b) => timestampToSeconds(a.ts) - timestampToSeconds(b.ts))
    const seen = new Set<string>()
    return moments.filter(({ ts }) => {
      if (seen.has(ts)) return false
      seen.add(ts)
      return true
    })
  }, [analysis])

  const topCriticalIssue = useMemo(
    () => analysis?.areas_to_improve?.find(issue => issue.severity === 'critical' && issue.area) ?? null,
    [analysis]
  )

  useEffect(() => {
    async function loadPage() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.replace('/onboarding')
        return
      }

      setUserEmail(data.user.email ?? null)
      const fullName = data.user.user_metadata?.full_name
      setUserName(typeof fullName === 'string' ? fullName : '')
      const { data: profile } = await supabase
        .from('profiles')
        .select('player_id')
        .eq('id', data.user.id)
        .maybeSingle()
      setLinkedPlayerId(typeof profile?.player_id === 'string' ? profile.player_id : null)

      const params = new URLSearchParams(window.location.search)
      const safeReturnPath = safeReturnTo(params.get('returnTo'))
      if (safeReturnPath) {
        queueMicrotask(() => setReturnTo(safeReturnPath))
      }
      if (params.get('welcome') === 'true') {
        queueMicrotask(() => setShowWelcome(true))
      }
      const message = params.get('message')
      if (message) {
        queueMicrotask(() => setNoticeMessage(message))
      }
      const encoded = params.get('result')
      if (encoded) {
        queueMicrotask(() => setAnalysis(decodeResult(encoded)))
      }
      setAuthChecked(true)
    }

    loadPage()
  }, [router, supabase])

  useEffect(() => {
    return () => {
      if (videoURL) URL.revokeObjectURL(videoURL)
    }
  }, [videoURL])

  useEffect(() => {
    if (!showWelcome) return
    const timer = window.setTimeout(() => setShowWelcome(false), 8000)
    return () => window.clearTimeout(timer)
  }, [showWelcome])

  useEffect(() => {
    if (!analyzing) {
      setLoadingIndex(0)
      return
    }

    let interval: number | undefined
    const startDelay = window.setTimeout(() => {
      interval = window.setInterval(
        () => setLoadingIndex(index => (index + 1) % LOADING_MESSAGES.length),
        2800
      )
    }, 100)

    return () => {
      window.clearTimeout(startDelay)
      if (interval) window.clearInterval(interval)
    }
  }, [analyzing])

  useEffect(() => {
    const issueArea = topCriticalIssue?.area || ''
    const issueDrill = topCriticalIssue?.drill || ''
    if (!issueArea || autoFetchedIssueArea === issueArea || coachingVideos[issueArea]?.length) return

    async function fetchTopCoachingVideo() {
      setAutoFetchedIssueArea(issueArea)
      try {
        const response = await fetch('/api/youtube-coaching', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issue: issueDrill,
            sport,
            shotType,
            issueArea,
          }),
        })
        const payload = await parseJsonResponse(response)
        if (response.ok && !payload.error) {
          setCoachingVideos(prev => ({ ...prev, [issueArea]: payload.videos || [] }))
        }
      } catch {
        // Keep the report usable if YouTube lookup fails.
      }
    }

    fetchTopCoachingVideo()
  }, [autoFetchedIssueArea, coachingVideos, sport, shotType, topCriticalIssue])

  function selectSport(nextSport: Sport) {
    setSport(nextSport)
    setShotType('')
    setPoseResult(null)
  }

  function seekTo(timestamp: string) {
    if (!videoRef.current) return
    const seconds = timestampToSeconds(timestamp)
    if (!Number.isFinite(seconds)) return
    videoRef.current.currentTime = seconds
    videoRef.current.play().catch(() => {})
    videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function renderTimestampButtons(text: string | undefined) {
    const timestamps = extractTimestamps(text || '')
    if (timestamps.length === 0 || !videoURL) return null

    return (
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3" style={{ borderColor: 'hsl(30,10%,93%)' }}>
        <span className="text-[11px]" style={{ color: brand.textMuted }}>Jump to:</span>
        {timestamps.map(ts => (
          <button
            key={ts}
            type="button"
            onClick={() => seekTo(ts)}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
            style={{
              borderColor: brand.teal,
              background: brand.tealLight,
              color: brand.teal,
            }}
          >
            ▶ {ts}
          </button>
        ))}
      </div>
    )
  }

  async function handleFileSelect(nextFile: File | null) {
    if (videoURL) URL.revokeObjectURL(videoURL)
    setFile(nextFile)
    setVideoURL(nextFile ? URL.createObjectURL(nextFile) : null)
    setVideoDuration(null)
    setPoseResult(null)
    setError('')
    if (!nextFile) return

    try {
      const duration = await getVideoDuration(nextFile)
      setVideoDuration(Number.isFinite(duration) ? duration : null)
    } catch {
      setVideoDuration(null)
    }
  }

  function handleTextAnalysisComplete(payload: TextAnalysisResult) {
    if (payload.error) {
      setError(payload.error)
      return
    }
    setAnalysis(payload as AnalysisResult)
    setSavedSessionId(
      typeof payload.sessionId === 'string'
        ? payload.sessionId
        : typeof payload.session_id === 'string'
          ? payload.session_id
          : null,
    )
    setAutoFetchedIssueArea('')
    setError('')
    saveSharedAnalysis(payload as AnalysisResult).catch(() => {})
  }

  async function analyzeVideo() {
    if (!file) return
    if (file.size > MAX_VIDEO_FILE_MB * 1024 * 1024) {
      setError(`That video is ${fileSizeLabel(file)}. Uploads currently support files up to ${MAX_VIDEO_FILE_MB} MB.`)
      return
    }
    if (videoDuration && videoDuration > MAX_VIDEO_DURATION_SECONDS) {
      setError(`That clip is ${durationLabel(videoDuration)}. Trim it to ${MAX_VIDEO_DURATION_SECONDS} seconds or less for the best analysis.`)
      return
    }
    setAnalyzing(true)
    setError('')
    setShareUrl('')
    setSavedSessionId(null)
    setDiscarded(false)
    setAnalysisGate(null)
    let uploadPath: string | null = null
    try {
      const uploadResponse = await fetch('/api/analyze-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || 'video/mp4',
        }),
      })
      const uploadPayload = await parseJsonResponse(uploadResponse)
      if (!uploadResponse.ok || uploadPayload.error) throw new Error(uploadPayload.error || 'Could not prepare video upload')

      uploadPath = String(uploadPayload.path)
      const { error: storageError } = await supabase.storage
        .from('videos')
        .uploadToSignedUrl(uploadPath, String(uploadPayload.token), file, {
          contentType: file.type || 'video/mp4',
        })
      if (storageError) throw new Error(storageError.message)

      const readResponse = await fetch('/api/analyze-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', path: uploadPath }),
      })
      const readPayload = await parseJsonResponse(readResponse)
      if (!readResponse.ok || readPayload.error) throw new Error(readPayload.error || 'Could not prepare video for analysis')

      const response = await fetch('/api/video-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: readPayload.signedUrl,
          videoMimeType: file.type || 'video/mp4',
          storagePath: `videos/${uploadPath}`,
          videoDurationSeconds: videoDuration ?? undefined,
          sport,
          shotType: shotType || undefined,
          cameraAngle: 'side-on',
          playerName: 'Athlete',
          playerId: linkedPlayerId,
          poseData: poseResult
            ? {
                measurements: poseResult.measurements,
                overallPostureScore: poseResult.overallPostureScore,
                promptText: measurementsToPromptText(poseResult.measurements, sport),
              }
            : null,
        }),
      })
      const payload = await parseJsonResponse(response)
      if (payload.requiresSignup) {
        setAnalysisGate({ type: 'signup', message: payload.error || 'Please sign up to analyze videos' })
        return
      }
      if (payload.requiresUpgrade) {
        setAnalysisGate({
          type: 'upgrade',
          message: payload.error || 'Free limit reached',
          analysesUsed: Number(payload.analyses_used || 0),
          scorePreview: Array.isArray(payload.score_preview) ? payload.score_preview : null,
        })
        return
      }
      if (!response.ok || payload.error) throw new Error(payload.error || 'Analysis failed')
      setAnalysis(payload)
      setSavedSessionId(
        typeof payload.sessionId === 'string'
          ? payload.sessionId
          : typeof payload.session_id === 'string'
            ? payload.session_id
            : null
      )
      setAutoFetchedIssueArea('')
      saveSharedAnalysis(payload).catch(() => {})
      if (userEmail) {
        const saveResponse = await fetch('/api/analyze-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sport, shotType, cameraAngle: 'side-on', result: payload }),
        })
        if (!saveResponse.ok) {
          const key = `axis-analysis-history:${userEmail}`
          const prev = JSON.parse(localStorage.getItem(key) || '[]') as unknown[]
          localStorage.setItem(key, JSON.stringify([{ created_at: new Date().toISOString(), sport, shotType, result: payload }, ...prev].slice(0, 20)))
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  async function fetchCoachingVideos(issueArea: string, drill?: string) {
    setLoadingCoachingVideo(issueArea)
    try {
      const response = await fetch('/api/youtube-coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue: drill, sport, shotType, issueArea }),
      })
      const payload = await parseJsonResponse(response)
      if (!response.ok || payload.error) throw new Error(payload.error || 'Failed to find coaching videos')
      setCoachingVideos(prev => ({ ...prev, [issueArea]: payload.videos || [] }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find coaching videos')
    } finally {
      setLoadingCoachingVideo(null)
    }
  }

  async function handleDiscard() {
    if (!savedSessionId) return
    await supabase
      .from('analysis_sessions')
      .delete()
      .eq('id', savedSessionId)
    setDiscarded(true)
    setSavedSessionId(null)
  }

  async function saveSharedAnalysis(result: AnalysisResult) {
    const response = await fetch('/api/analyses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sport,
        shotType,
        name: userName || 'Athlete',
        result,
      }),
    })
    const payload = await parseJsonResponse(response)
    if (!response.ok || payload.error || !payload.id) {
      throw new Error(payload.error || 'Could not create share link')
    }
    const url = `${SHARE_ORIGIN}/analysis/${payload.id}`
    setShareUrl(url)
    return url
  }

  async function askCoach(question?: string) {
    if (!analysis) return
    const content = (question ?? chatInput).trim()
    const guestQuestionUsed = !userEmail && chatMessages.some(message => message.role === 'assistant')
    if (!content || chatLoading || guestQuestionUsed) return

    const nextMessages: ChatMessage[] = [...chatMessages, { role: 'user', content }]
    setChatMessages(nextMessages)
    setChatInput('')
    setChatError('')
    setChatLoading(true)

    try {
      const response = await fetch('/api/free-coach-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: content, analysis, sport, shotType }),
      })
      const payload = await parseJsonResponse(response)
      if (!response.ok || payload.error) throw new Error(payload.error || 'Coach AI could not answer.')
      setChatMessages([...nextMessages, { role: 'assistant', content: String(payload.answer || '') }])
    } catch (err) {
      setChatMessages(chatMessages)
      setChatError(err instanceof Error ? err.message : 'Coach AI could not answer.')
    } finally {
      setChatLoading(false)
    }
  }

  async function copyShareUrl() {
    if (!analysis) return
    try {
      const url = shareUrl || await saveSharedAnalysis(analysis)
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      window.setTimeout(() => setShareCopied(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not copy share link')
    }
  }

  function upgradeScoreText() {
    const scores = analysisGate?.scorePreview
    if (!scores?.length) return null
    const trend = scores.join(' → ')
    const improved = scores.length >= 2 && scores[scores.length - 1] > scores[0]
    return `Your scores: ${trend}${improved ? " — you're improving!" : ''}`
  }

  function coachAiPanel() {
    if (!coachPanelOpen) return null

    return (
      <div className="mt-5 space-y-4 border-t border-border pt-5">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">Ask Coach AI</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask one follow-up question about this report. Create a free account to keep the conversation going.
          </p>
        </div>
        {chatMessages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {CHAT_STARTERS.map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() => askCoach(prompt)}
                disabled={chatLoading}
                className="rounded-full border border-primary/20 bg-primary/[0.04] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {chatMessages.length > 0 && (
          <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-3">
            {chatMessages.map((message, index) => (
              message.role === 'user' ? (
                <div key={index} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground">
                  {message.content}
                </div>
              ) : (
                <div key={index} className="max-w-[92%]">
                  <div className="rounded-2xl rounded-bl-md border border-border bg-white px-4 py-3 text-sm leading-relaxed text-muted-foreground shadow-sm">
                    <div className="space-y-2">{renderCoachAnswer(message.content)}</div>
                  </div>
                  <div className="mt-1 pl-1">
                    <FeedbackButtons
                      sessionId={savedSessionId ?? undefined}
                      feedbackType="chat"
                      sport={sport}
                      chatMessage={chatMessages[index - 1]?.content}
                      chatResponse={message.content}
                      size="sm"
                    />
                  </div>
                </div>
              )
            ))}
            {chatLoading && (
              <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm">
                Thinking...
              </div>
            )}
          </div>
        )}

        {!userEmail && chatMessages.some(message => message.role === 'assistant') ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
            <p className="text-sm font-semibold text-foreground">Want to ask another question?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a free account to keep chatting with Coach AI and save future reports.
            </p>
            <Link href="/onboarding" className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
              Create free account →
            </Link>
          </div>
        ) : (
          <form
            onSubmit={event => {
              event.preventDefault()
              askCoach()
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <input
              value={chatInput}
              onChange={event => setChatInput(event.target.value)}
              placeholder="Ask about this report..."
              className="min-h-11 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
            >
              {chatLoading ? 'Asking...' : 'Ask'}
            </button>
          </form>
        )}

        {chatError && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {chatError}
          </p>
        )}
      </div>
    )
  }

  if (!authChecked) {
    return (
      <div
        style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '40px 20px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            height: 200,
            borderRadius: 16,
            background: 'hsl(30,10%,93%)',
            marginBottom: 16,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        <div
          style={{
            height: 48,
            borderRadius: 12,
            background: 'hsl(30,10%,93%)',
            marginBottom: 10,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {analysisGate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-xl font-bold text-foreground">
                  {analysisGate.type === 'signup'
                    ? 'Create a free account to analyze your videos'
                    : "You've used your 3 free reels"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {analysisGate.type === 'signup'
                    ? 'Create a free Playvia account to unlock your coaching report and track progress over time.'
                    : 'Upgrade to Pro to keep tracking your progress.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAnalysisGate(null)}
                className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            {analysisGate.type === 'signup' ? (
              <div className="mt-5">
                <Link
                  href="/onboarding"
                  className="flex w-full justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
                >
                  Sign up free
                </Link>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                {upgradeScoreText() && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm font-semibold text-primary">
                    {upgradeScoreText()}
                  </div>
                )}
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">Get notified when Pro is ready</p>
                  <WaitlistForm
                    sport={sport}
                    source="analysis-upgrade"
                    successMessage="✓ You're on the list! We'll notify you when Pro launches."
                  />
                </div>
                <Link
                  href="/pricing"
                  className="flex w-full justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
                >
                  Upgrade to Pro $12/mo →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl space-y-8 px-5 py-10">
        {showWelcome && (
          <div className="flex flex-col gap-3 rounded-2xl bg-primary px-5 py-4 text-primary-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold">
              Welcome{userName ? ` ${userName.split(/\s+/)[0]}` : ''}! Upload your first video to get your free coaching report.
            </p>
            <button
              type="button"
              onClick={() => setShowWelcome(false)}
              className="self-start rounded-full border border-primary-foreground/30 px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary-foreground/10 sm:self-auto"
            >
              Dismiss
            </button>
          </div>
        )}

        {noticeMessage && (
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-5 py-4 text-primary sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold">{noticeMessage}</p>
            <button
              type="button"
              onClick={() => setNoticeMessage('')}
              className="self-start rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold hover:bg-primary/10 sm:self-auto"
            >
              Dismiss
            </button>
          </div>
        )}

        {returnTo && userEmail && (
          <Link
            href={returnTo}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.04] px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            Back to my dashboard
          </Link>
        )}

        <section className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Free technique check</p>
          <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight md:text-6xl">
            Upload a swing. Get a coaching report.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Playvia analyzes your full motion and turns it into practical coaching cues, drills, and next steps.
          </p>
        </section>

        {!analysis ? (
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-8">
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-semibold text-foreground">Choose your sport</p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                  {SPORTS.map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => selectSport(option)}
                      className={`rounded-full border px-4 py-3 text-sm font-bold capitalize transition-all ${
                        sport === option
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {SPORT_LABELS[option]}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  background: WARM_BG,
                  borderRadius: 12,
                  padding: 3,
                  gap: 3,
                  marginBottom: 20,
                }}
              >
                {(['video', 'text'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    style={{
                      padding: '11px 0',
                      borderRadius: 9,
                      background: mode === m ? 'white' : 'transparent',
                      border:
                        mode === m
                          ? `0.5px solid ${ANALYZE_BORDER}`
                          : 'none',
                      color: mode === m ? ANALYZE_TEXT : ANALYZE_TEXT_MUTED,
                      fontSize: 13,
                      fontWeight: mode === m ? 600 : 400,
                      cursor: 'pointer',
                      fontFamily: 'Arial, sans-serif',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'all 0.15s',
                    }}
                  >
                    {m === 'video' ? '📹 Upload video' : '✍️ Describe session'}
                  </button>
                ))}
              </div>

              {mode === 'text' ? (
                <TextSessionSection
                  sport={sport}
                  playerId={linkedPlayerId}
                  onAnalysisComplete={handleTextAnalysisComplete}
                  onError={setError}
                />
              ) : (
              <>
              <div>
                <div>
                  <p className="mb-3 text-sm font-semibold text-foreground">
                    Shot type <span className="font-normal text-muted-foreground">(optional)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {shotTypes.map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setShotType(option)}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                          shotType === option
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShotType('')}
                    className="mt-2 text-xs font-medium text-muted-foreground hover:text-primary"
                  >
                    Let AI detect it
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary/30 bg-muted/30 p-12 text-center transition-colors hover:border-primary/70">
                <Upload className="mb-4 size-10 text-primary" />
                <span className="text-lg font-semibold">Drop your video here or click to upload</span>
                <span className="mt-2 text-sm text-muted-foreground">Video files only</span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={event => {
                    void handleFileSelect(event.target.files?.[0] ?? null)
                  }}
                />
              </label>

              {file && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{file.name}</span> · {fileSizeLabel(file)}
                    {videoDuration ? <> · {durationLabel(videoDuration)}</> : null}
                  </div>
                  {videoURL && (
                    <PoseSplitView
                      videoURL={videoURL}
                      sport={sport}
                      videoRef={videoRef}
                      onMeasurementsReady={result => {
                        setPoseResult(result)
                      }}
                    />
                  )}
                  <div
                    className={`rounded-2xl border p-4 text-sm ${
                      fileTooLarge || durationTooLong
                        ? 'border-destructive/25 bg-destructive/10 text-destructive'
                        : 'border-primary/20 bg-primary/10 text-foreground'
                    }`}
                  >
                    <p className="font-semibold">
                      {fileTooLarge || durationTooLong ? 'Optimize this clip before analysis' : 'Upload looks ready'}
                    </p>
                    <p className="mt-1 leading-relaxed">
                      {fileTooLarge
                        ? `This file is over ${MAX_VIDEO_FILE_MB} MB. Trim to the key swing/rep or compress to 720p before uploading.`
                        : durationTooLong
                          ? `This clip is ${durationLabel(videoDuration ?? 0)}. Trim it to ${MAX_VIDEO_DURATION_SECONDS} seconds or less so the AI focuses on the important motion.`
                          : `Best results come from a ${MAX_VIDEO_DURATION_SECONDS}-second-or-shorter clip filmed side-on or face-on.`}
                    </p>
                  </div>
                </div>
              )}

              {error && mode === 'video' && <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

              </>
              )}

              {error && mode === 'text' && <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

              {mode === 'video' && (
                <>
                  <button
                    type="button"
                    disabled={!canAnalyze}
                    onClick={analyzeVideo}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-bold text-primary-foreground transition-opacity disabled:opacity-50"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Analyzing your {sport} technique...
                      </>
                    ) : (
                      <>
                        Add to your Reels <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>
                  {analyzing && (
                    <p className="text-center text-sm text-muted-foreground">
                      {LOADING_MESSAGES[loadingIndex]}
                    </p>
                  )}
                </>
              )}
            </div>
          </section>
        ) : (
          <section className="space-y-5">
            {videoURL && (
              <div>
                <PoseSplitView
                  videoURL={videoURL}
                  sport={sport}
                  videoRef={videoRef}
                  onMeasurementsReady={result => {
                    setPoseResult(result)
                  }}
                />
                <p className="mt-2 text-[11px]" style={{ color: brand.textSecondary }}>
                  Click any timestamp in the analysis below to jump to that moment
                </p>
              </div>
            )}

            <AnalysisResultStepper
              score={
                typeof analysis.overall_score === 'number'
                  ? analysis.overall_score
                  : analysis.score ?? 0
              }
              sport={sport}
              shotType={shotType || undefined}
              issues={mapAnalysisIssues(
                analysis.areas_to_improve ?? analysis.issues
              )}
              strengths={mapAnalysisStrengths(analysis.strengths)}
              poseMeasurements={poseResult?.measurements}
              sessionId={
                savedSessionId ??
                analysis.sessionId ??
                analysis.session_id ??
                undefined
              }
              playerId={linkedPlayerId ?? undefined}
              progressHref={
                linkedPlayerId || returnTo === '/player'
                  ? '/player/progress'
                  : '/analyze/progress'
              }
              onSaved={() => setShowSaveNotice(false)}
              onReanalyze={() => {
                setAnalysis(null)
                setFile(null)
                if (videoURL) URL.revokeObjectURL(videoURL)
                setVideoURL(null)
                setVideoDuration(null)
                setPoseResult(null)
                setCoachingVideos({})
                setChatMessages([])
                setChatInput('')
                setChatError('')
                setError('')
                setCoachPanelOpen(false)
                setShareUrl('')
                setSavedSessionId(null)
                setDiscarded(false)
              }}
            />

            <details className="rounded-2xl border border-border bg-card p-4">
              <summary className="cursor-pointer font-heading text-sm font-semibold text-foreground">
                Full report details ▾
              </summary>
              <div className="mt-4 space-y-4">
                {videoURL && keyMoments.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border bg-white px-4 py-3" style={{ borderColor: brand.border }}>
                    <span className="shrink-0 text-[11px] font-semibold" style={{ color: brand.textSecondary }}>
                      Key moments:
                    </span>
                    {keyMoments.map(({ ts, label, type }) => (
                      <button
                        key={ts}
                        type="button"
                        onClick={() => seekTo(ts)}
                        className="flex shrink-0 flex-col items-center rounded-lg border px-2.5 py-1"
                        style={{
                          borderColor: type === 'issue' ? '#FCA5A5' : 'hsl(168,62%,70%)',
                          background: type === 'issue' ? '#FEF2F2' : brand.tealLight,
                          color: type === 'issue' ? '#DC2626' : brand.teal,
                        }}
                      >
                        <span className="text-[11px] font-bold">▶ {ts}</span>
                        <span className="mt-0.5 text-[10px] opacity-80">
                          {label.length > 12 ? `${label.substring(0, 12)}...` : label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <AnalysisQualityBadges rating={analysis.overall_rating} confidence={analysis.confidence} />
                <FeedbackButtons
                  sessionId={savedSessionId ?? undefined}
                  feedbackType="analysis"
                  sport={sport}
                  shotType={shotType}
                  fullAnalysis={analysis}
                  size="md"
                />
                <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="font-heading text-base font-semibold text-foreground">Ask Coach AI</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Ask a follow-up question while this report is fresh.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCoachPanelOpen(open => !open)}
                      className="w-fit rounded-xl border border-primary/25 bg-background px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                    >
                      {coachPanelOpen ? 'Hide Coach AI' : 'Ask Coach AI'}
                    </button>
                  </div>
                  {coachAiPanel()}
                </div>
                {analysis.observations && (
                  <div>
                    <p className="font-heading text-sm font-semibold text-foreground">Frame-by-frame</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{analysis.observations}</p>
                    {renderTimestampButtons(analysis.observations)}
                  </div>
                )}
                {analysis.technique_notes && (
                  <div>
                    <p className="font-heading text-sm font-semibold text-foreground">Technique notes</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{analysis.technique_notes}</p>
                    {renderTimestampButtons(analysis.technique_notes)}
                  </div>
                )}
              </div>
            </details>

                        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-heading text-lg font-semibold text-foreground">Next steps</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Share this report or save your progress.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <PDFExportButton
                    analysis={analysis}
                    playerName={userName || 'Athlete'}
                    sport={sport}
                    shotType={shotType}
                    overallScore={analysis.overall_score ?? 0}
                    playerEmail={userEmail || undefined}
                  />
                  {returnTo && userEmail && (
                    <Link
                      href={returnTo}
                      className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
                    >
                      Back to dashboard
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={copyShareUrl}
                    className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground hover:border-primary"
                  >
                    {shareCopied ? 'Copied!' : 'Share'}
                  </button>
                  {userEmail && (
                    <Link
                      href="/analyze/progress"
                      className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
                    >
                      View your progress →
                    </Link>
                  )}
                  {userEmail ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAnalysis(null)
                        setFile(null)
                        if (videoURL) URL.revokeObjectURL(videoURL)
                        setVideoURL(null)
                        setVideoDuration(null)
                        setPoseResult(null)
                        setCoachingVideos({})
                        setChatMessages([])
                        setChatInput('')
                        setChatError('')
                        setError('')
                        setCoachPanelOpen(false)
                        setShareUrl('')
                        setSavedSessionId(null)
                        setDiscarded(false)
                      }}
                      className="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
                    >
                      Add another Reel
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSaveNotice(true)}
                      className="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
                    >
                      Save report
                    </button>
                  )}
                </div>
              </div>

              {!discarded && savedSessionId && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <button
                    onClick={handleDiscard}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 12,
                      color: 'hsl(220,10%,65%)',
                      cursor: 'pointer',
                      fontFamily: 'Arial, sans-serif',
                      textDecoration: 'underline',
                    }}
                    type="button"
                  >
                    Don&apos;t save this analysis
                  </button>
                </div>
              )}

              {discarded && (
                <div
                  style={{
                    textAlign: 'center',
                    marginTop: 12,
                    fontSize: 12,
                    color: 'hsl(220,10%,65%)',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  Analysis discarded - not saved to your history
                </div>
              )}

              {!userEmail && showSaveNotice && (
                <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
                  <p className="text-sm font-semibold text-foreground">Create a free account to save this report</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Reports are only saved to an account, so you can come back later, track progress, ask more AI questions, and analyze another video.
                  </p>
                  <Link href="/onboarding" className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
                    Create free account →
                  </Link>
                </div>
              )}

            </section>
          </section>
        )}
      </main>
    </div>
  )
}
