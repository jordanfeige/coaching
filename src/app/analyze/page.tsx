'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Loader2, Upload, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { WaitlistForm } from '@/components/waitlist/WaitlistForm'
import { brand } from '@/lib/brand'

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
  checkpoint_scores?: Record<string, number>
  previous_score?: number | null
  score_delta?: number | null
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
  'Watching your full motion...',
  'Identifying technique patterns...',
  'Building your coaching report...',
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
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [sport, setSport] = useState<Sport>('tennis')
  const [shotType, setShotType] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
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

  const shotTypes = useMemo(() => SHOT_TYPES[sport], [sport])
  const groupedIssues = useMemo(() => {
    const groups: Record<Severity, AnalysisIssue[]> = { critical: [], moderate: [], minor: [] }
    for (const issue of analysis?.areas_to_improve || []) {
      groups[issue.severity || 'moderate'].push(issue)
    }
    return groups
  }, [analysis])
  const fileTooLarge = Boolean(file && file.size > MAX_VIDEO_FILE_MB * 1024 * 1024)
  const durationTooLong = Boolean(videoDuration && videoDuration > MAX_VIDEO_DURATION_SECONDS)
  const canAnalyze = Boolean(file && !fileTooLarge && !durationTooLong && !analyzing)

  const topCriticalIssue = useMemo(
    () => analysis?.areas_to_improve?.find(issue => issue.severity === 'critical' && issue.area) ?? null,
    [analysis]
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
      const fullName = data.user?.user_metadata?.full_name
      setUserName(typeof fullName === 'string' ? fullName : '')
    })
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
  }, [supabase])

  useEffect(() => {
    if (!showWelcome) return
    const timer = window.setTimeout(() => setShowWelcome(false), 8000)
    return () => window.clearTimeout(timer)
  }, [showWelcome])

  useEffect(() => {
    if (!analyzing) return
    const timer = window.setInterval(() => setLoadingIndex(index => (index + 1) % LOADING_MESSAGES.length), 3000)
    return () => window.clearInterval(timer)
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
  }

  async function handleFileSelect(nextFile: File | null) {
    setFile(nextFile)
    setVideoDuration(null)
    setError('')
    if (!nextFile) return

    try {
      const duration = await getVideoDuration(nextFile)
      setVideoDuration(Number.isFinite(duration) ? duration : null)
    } catch {
      setVideoDuration(null)
    }
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
          sport,
          shotType: shotType || undefined,
          cameraAngle: 'side-on',
          playerName: 'Athlete',
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
      if (uploadPath) {
        fetch('/api/analyze-upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', path: uploadPath }),
        }).catch(() => {})
      }
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

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/analyze?welcome=true`,
      },
    })
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
                <div key={index} className="max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-white px-4 py-3 text-sm leading-relaxed text-muted-foreground shadow-sm">
                  <div className="space-y-2">{renderCoachAnswer(message.content)}</div>
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
            <Link href="/signup" className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
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
                    : "You've used your 3 free analyses"}
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
              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground hover:border-primary"
                >
                  Continue with Google
                </button>
                <Link
                  href="/signup"
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

              {error && <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

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
                    Analyze my technique <ArrowRight className="size-4" />
                  </>
                )}
              </button>
              {analyzing && <p className="text-center text-sm text-muted-foreground">{LOADING_MESSAGES[loadingIndex]}</p>}
            </div>
          </section>
        ) : (
          <section className="space-y-5">
            {typeof analysis.overall_score === 'number' && (
              <div className="rounded-3xl border border-primary/25 bg-card p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Technique Score</p>
                <div className="mt-2 flex flex-wrap items-end gap-3">
                  <span className="font-heading text-6xl font-black leading-none text-primary">
                    {analysis.overall_score}
                  </span>
                  <span className="pb-2 text-sm font-semibold text-muted-foreground">/ 100</span>
                  {typeof analysis.score_delta === 'number' && (
                    <span
                      className={`mb-2 rounded-full px-3 py-1 text-xs font-bold ${
                        analysis.score_delta >= 0
                          ? 'bg-primary/10 text-primary'
                          : 'bg-destructive/10 text-destructive'
                      }`}
                    >
                      {analysis.score_delta >= 0 ? '+' : ''}{analysis.score_delta} from last session {analysis.score_delta >= 0 ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {analysis.overall_rating && <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">{analysis.overall_rating}</span>}
                {analysis.confidence && <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">{analysis.confidence} confidence</span>}
              </div>
              <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-heading text-base font-semibold text-foreground">Ask Coach AI</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ask a follow-up question while this report is fresh.
                    </p>
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
                <details className="mt-5 rounded-2xl border border-border bg-muted/30 p-4">
                  <summary className="cursor-pointer font-heading text-sm font-semibold text-foreground">
                    See full frame-by-frame breakdown ▾
                  </summary>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{analysis.observations}</p>
                </details>
              )}
              {analysis.technique_notes && (
                <div className="mt-5 rounded-2xl border border-border bg-muted/40 p-4">
                  <h3 className="font-heading text-sm font-semibold text-foreground">Technique notes</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{analysis.technique_notes}</p>
                </div>
              )}
            </div>

            {analysis.biggest_win && (
              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
                <p className="font-heading text-sm font-bold uppercase tracking-wide text-primary">Biggest win</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">{analysis.biggest_win}</p>
              </div>
            )}

            {!!analysis.strengths?.length && (
              <div>
                <h2 className="mb-3 font-heading text-xl font-semibold">Strengths</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {analysis.strengths.map((strength, index) => (
                    <div key={index} className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                      <p className="font-semibold text-primary">{strength.area || 'Strength'}</p>
                      {strength.what_i_see && <p className="mt-2 text-sm text-foreground/80">{strength.what_i_see}</p>}
                      {strength.why_it_helps && <p className="mt-2 text-sm text-muted-foreground"><span className="font-semibold text-foreground">Why it helps: </span>{strength.why_it_helps}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="mb-3 font-heading text-xl font-semibold">Issues to fix</h2>
              <div className="space-y-4">
                {(['critical', 'moderate', 'minor'] as Severity[]).map(severity =>
                  groupedIssues[severity].length ? (
                    <div key={severity}>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{severity}</p>
                      <div className="space-y-3">
                        {groupedIssues[severity].map((issue, index) => {
                          const area = issue.area || `Issue ${index + 1}`
                          return (
                            <div key={`${area}-${index}`} className="rounded-2xl border border-[#222] bg-white p-4 text-slate-900">
                              <p className="font-heading font-semibold">{area}</p>
                              <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">
                                {issue.what_i_see && <p><span className="font-semibold text-slate-950">What I see: </span>{issue.what_i_see}</p>}
                                {issue.ideal && <p><span className="font-semibold text-slate-950">Ideal: </span>{issue.ideal}</p>}
                                {issue.consequence && <p><span className="font-semibold text-slate-950">Why it matters: </span>{issue.consequence}</p>}
                                {issue.simple_cue && <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-slate-950">Cue: &quot;{issue.simple_cue}&quot;</span>}
                              </div>
                              {(issue.drill || issue.drill_instruction || issue.success_criteria) && (
                                <div className="mt-3 border-t border-slate-200 pt-3">
                                  {issue.drill && <p className="font-heading text-sm font-semibold text-emerald-700">Drill: {issue.drill}</p>}
                                  {issue.drill_sets_reps && <p className="mt-1 text-xs font-semibold">{issue.drill_sets_reps}</p>}
                                  {issue.drill_instruction && <p className="mt-1 text-sm text-slate-700">{issue.drill_instruction}</p>}
                                  {issue.success_criteria && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="font-semibold">Success: </span>{issue.success_criteria}</p>}
                                </div>
                              )}
                              <div className="mt-3">
                                {coachingVideos[area]?.length ? (
                                  <YouTubeCards videos={coachingVideos[area].slice(0, topCriticalIssue?.area === area ? 1 : 3)} />
                                ) : (
                                  <button
                                    type="button"
                                    disabled={loadingCoachingVideo === area}
                                    onClick={() => fetchCoachingVideos(area, issue.drill || '')}
                                    className="rounded-xl px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-60"
                                    style={{ background: '#FF000015', color: '#FF4444', border: '1px solid #FF000030' }}
                                  >
                                    {loadingCoachingVideo === area ? 'Searching...' : '▶ Find more coaching videos'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </div>

            {analysis.priority_focus && (
              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
                <p className="font-heading text-sm font-bold uppercase tracking-wide text-info">Priority focus</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">{analysis.priority_focus}</p>
              </div>
            )}

            <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-heading text-lg font-semibold text-foreground">Next steps</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Share this report or save your progress.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
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
                        setVideoDuration(null)
                        setCoachingVideos({})
                        setChatMessages([])
                        setChatInput('')
                        setChatError('')
                        setError('')
                        setCoachPanelOpen(false)
                        setShareUrl('')
                      }}
                      className="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
                    >
                      Analyze another
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

              {!userEmail && showSaveNotice && (
                <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
                  <p className="text-sm font-semibold text-foreground">Create a free account to save this report</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Reports are only saved to an account, so you can come back later, track progress, ask more AI questions, and analyze another video.
                  </p>
                  <Link href="/signup" className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
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
