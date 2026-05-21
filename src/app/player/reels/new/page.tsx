'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback } from 'react'
import { Loader2, ArrowLeft, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import {
  takePendingReelShotType,
  takePendingReelTitle,
  takePendingReelVideoFile,
} from '@/lib/pending-reel'
import { ReelNameField } from '@/components/player/reels/ReelNameField'
import { defaultReelTitle } from '@/lib/reel-display'
import { usePageReady } from '@/contexts/PageLoadingContext'
import AnalysisResultStepper, {
  mapAnalysisIssues,
  mapAnalysisStrengths,
} from '@/components/AnalysisResultStepper'
import TextSessionSection, {
  type TextAnalysisResult,
} from '@/components/TextSessionSection'
import PoseSplitView from '@/components/PoseSplitView'
import { measurementsToPromptText, type PoseAnalysisResult } from '@/lib/poseAnalysis'

const TEAL = 'hsl(168,62%,36%)'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const WARM_BG = 'hsl(40,20%,97%)'
const MAX_VIDEO_FILE_MB = 300
const MAX_VIDEO_DURATION_SECONDS = 60

type Sport = 'tennis' | 'golf' | 'baseball' | 'basketball' | 'pickleball'
const SPORTS: Sport[] = ['tennis', 'golf', 'baseball', 'basketball', 'pickleball']

const SHOT_TYPES = [
  { value: 'forehand', label: 'Forehand' },
  { value: 'backhand', label: 'Backhand' },
  { value: 'serve', label: 'Serve' },
  { value: 'volley', label: 'Volley' },
] as const

type AnalysisResult = {
  overall_score?: number
  score?: number
  areas_to_improve?: unknown[]
  issues?: unknown[]
  strengths?: unknown[]
  session_id?: string | null
  sessionId?: string | null
}

async function parseJsonResponse(response: Response) {
  const text = await response.text()
  if (!text) return {}
  return JSON.parse(text) as Record<string, unknown>
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

function NewReelPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const videoRef = useRef<HTMLVideoElement>(null)

  const isTextMode = searchParams.get('mode') === 'text'

  const [loading, setLoading] = useState(true)
  const [sport, setSport] = useState<Sport>('tennis')
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [videoURL, setVideoURL] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const [poseResult, setPoseResult] = useState<PoseAnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null)
  const [shotType, setShotType] = useState<string>('forehand')
  const [reelTitle, setReelTitle] = useState(() => defaultReelTitle('forehand'))
  const [textDescription, setTextDescription] = useState('')
  const [autoText, setAutoText] = useState(false)
  const titleTouched = useRef(false)

  async function handleFileSelect(nextFile: File | null) {
    setError('')
    if (!nextFile) return
    if (videoURL) URL.revokeObjectURL(videoURL)
    setFile(nextFile)
    setVideoURL(URL.createObjectURL(nextFile))
    setPoseResult(null)
    try {
      const duration = await getVideoDuration(nextFile)
      if (Number.isFinite(duration)) setVideoDuration(duration)
    } catch {
      setVideoDuration(null)
    }
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('player_id')
        .eq('id', user.id)
        .single()

      if (profile?.player_id) {
        setPlayerId(profile.player_id)
        const { data: player } = await supabase
          .from('players')
          .select('sport')
          .eq('id', profile.player_id)
          .single()
        if (player?.sport && SPORTS.includes(player.sport as Sport)) {
          setSport(player.sport as Sport)
        }
      }

      const desc = sessionStorage.getItem('pendingReelDescription')
      if (desc && isTextMode) {
        setTextDescription(desc)
        setAutoText(true)
        sessionStorage.removeItem('pendingReelDescription')
      }

      const pendingFile = takePendingReelVideoFile()
      const pendingShot = takePendingReelShotType()
      const pendingTitle = takePendingReelTitle()
      const queryShot = searchParams.get('shot')
      const shot = pendingShot || queryShot || 'forehand'
      setShotType(shot)
      if (pendingTitle) {
        setReelTitle(pendingTitle)
        titleTouched.current = true
      } else {
        setReelTitle(defaultReelTitle(shot))
      }
      if (pendingFile && !isTextMode) {
        await handleFileSelect(pendingFile)
      }

      setLoading(false)
    }
    void init()
  }, [router, supabase, isTextMode, searchParams])

  const analyzeVideo = useCallback(async () => {
    if (!file || analyzing) return
    if (file.size > MAX_VIDEO_FILE_MB * 1024 * 1024) {
      setError(`Video must be under ${MAX_VIDEO_FILE_MB} MB.`)
      return
    }
    if (videoDuration && videoDuration > MAX_VIDEO_DURATION_SECONDS) {
      setError(`Trim your clip to ${MAX_VIDEO_DURATION_SECONDS} seconds or less.`)
      return
    }

    setAnalyzing(true)
    setError('')
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
      if (!uploadResponse.ok || uploadPayload.error) {
        throw new Error(String(uploadPayload.error || 'Could not prepare upload'))
      }

      uploadPath = String(uploadPayload.path)
      const { error: storageError } = await supabase.storage
        .from('videos')
        .uploadToSignedUrl(
          uploadPath,
          String(uploadPayload.token),
          file,
          { contentType: file.type || 'video/mp4' },
        )
      if (storageError) throw new Error(storageError.message)

      const readResponse = await fetch('/api/analyze-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', path: uploadPath }),
      })
      const readPayload = await parseJsonResponse(readResponse)
      if (!readResponse.ok || readPayload.error) {
        throw new Error(String(readPayload.error || 'Could not read video'))
      }

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
          title: reelTitle.trim(),
          cameraAngle: 'side-on',
          playerName: 'Athlete',
          playerId,
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
      if (!response.ok || payload.error) {
        throw new Error(String(payload.error || 'Reel failed'))
      }

      setAnalysis(payload as AnalysisResult)
      setSavedSessionId(
        typeof payload.sessionId === 'string'
          ? payload.sessionId
          : typeof payload.session_id === 'string'
            ? payload.session_id
            : null,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reel failed')
    } finally {
      setAnalyzing(false)
    }
  }, [
    analyzing,
    file,
    videoDuration,
    supabase,
    sport,
    playerId,
    poseResult,
    shotType,
    reelTitle,
  ])

  function handleTextComplete(payload: TextAnalysisResult) {
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
    setError('')
  }

  usePageReady(!loading)

  if (loading) {
    return null
  }

  if (analysis) {
    return (
      <div
        style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '16px 0 48px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <AnalysisResultStepper
          score={
            typeof analysis.overall_score === 'number'
              ? analysis.overall_score
              : analysis.score ?? 0
          }
          sport={sport}
          issues={mapAnalysisIssues(
            (analysis.areas_to_improve ?? analysis.issues) as unknown[] | undefined,
          )}
          strengths={mapAnalysisStrengths(analysis.strengths)}
          poseMeasurements={poseResult?.measurements}
          session={analysis as Record<string, unknown>}
          sessionId={savedSessionId ?? analysis.sessionId ?? analysis.session_id ?? undefined}
          playerId={playerId ?? undefined}
          progressHref="/player/progress"
          onSaved={() => router.push('/player/reels')}
          onReanalyze={() => {
            setAnalysis(null)
            setFile(null)
            if (videoURL) URL.revokeObjectURL(videoURL)
            setVideoURL(null)
            setPoseResult(null)
          }}
        />
        <button
          type="button"
          onClick={() => router.push('/player/reels')}
          style={{
            marginTop: 16,
            width: '100%',
            padding: 12,
            borderRadius: 12,
            border: `0.5px solid ${BORDER}`,
            background: 'white',
            color: TEXT,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          Back to Reels
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: '8px 0 40px',
        fontFamily: 'Arial, sans-serif',
        color: TEXT,
      }}
    >
      <Link
        href="/player/reels"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: TEXT_MUTED,
          textDecoration: 'none',
          marginBottom: 16,
        }}
      >
        <ArrowLeft size={16} />
        Reels
      </Link>

      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>New reel</h1>
      <p style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 20 }}>
        {isTextMode ? 'Describe your session' : 'Upload your clip'}
      </p>

      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED, marginBottom: 8 }}>
          Sport
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SPORTS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSport(s)}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: `0.5px solid ${sport === s ? TEAL : BORDER}`,
                background: sport === s ? TEAL : 'white',
                color: sport === s ? 'white' : TEXT,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 10,
            background: '#FEF2F2',
            border: '0.5px solid #FCA5A5',
            color: '#DC2626',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {isTextMode ? (
        <>
          <div style={{ marginBottom: 16 }}>
            <ReelNameField
              value={reelTitle}
              onChange={value => {
                titleTouched.current = true
                setReelTitle(value)
              }}
            />
          </div>
          <TextSessionSection
            sport={sport}
            playerId={playerId}
            reelTitle={reelTitle}
            initialDescription={textDescription}
            autoSubmit={autoText}
            onAnalysisComplete={handleTextComplete}
            onError={setError}
          />
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ReelNameField
            value={reelTitle}
            onChange={value => {
              titleTouched.current = true
              setReelTitle(value)
            }}
            hint="This is how the reel appears on your dashboard and in Ask Via."
          />
          <div>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: TEXT_MUTED,
                marginBottom: 8,
              }}
            >
              Shot type
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SHOT_TYPES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setShotType(s.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: `0.5px solid ${shotType === s.value ? TEAL : BORDER}`,
                    background: shotType === s.value ? TEAL : 'white',
                    color: shotType === s.value ? 'white' : TEXT,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {videoURL && file && (
            <PoseSplitView
              videoURL={videoURL}
              sport={sport}
              videoRef={videoRef}
              onMeasurementsReady={setPoseResult}
            />
          )}
          {analyzing && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: 24,
                background: WARM_BG,
                borderRadius: 12,
              }}
            >
              <Loader2 className="size-5 animate-spin" style={{ color: TEAL }} />
              <span style={{ fontSize: 14, color: TEXT_SEC }}>
                Via is building your reel…
              </span>
            </div>
          )}
          {!file && !analyzing && (
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 28,
                borderRadius: 12,
                border: `1.5px dashed ${TEAL}`,
                background: WARM_BG,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <Upload size={28} style={{ color: TEAL, marginBottom: 10 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>
                Drop your video or tap to upload
              </span>
              <span style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 6 }}>
                Up to {MAX_VIDEO_DURATION_SECONDS}s · {MAX_VIDEO_FILE_MB} MB max
              </span>
              <input
                type="file"
                accept="video/*"
                style={{ display: 'none' }}
                onChange={e => {
                  void handleFileSelect(e.target.files?.[0] ?? null)
                }}
              />
            </label>
          )}
          {file && !analyzing && (
            <button
              type="button"
              onClick={() => void analyzeVideo()}
              style={{
                width: '100%',
                padding: 13,
                borderRadius: 12,
                background: TEAL,
                border: 'none',
                color: 'white',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              Analyze →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function NewReelPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            maxWidth: 560,
            margin: '0 auto',
            padding: 40,
            fontFamily: 'Arial, sans-serif',
          }}
        />
      }
    >
      <NewReelPageContent />
    </Suspense>
  )
}
