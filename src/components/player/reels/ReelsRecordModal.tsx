'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FlipHorizontal, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import {
  blobTypeForRecording,
  fileExtensionForMime,
  preferredRecorderMimeType,
} from '@/lib/media-recorder-mime'
import { uploadAndAnalyzePlayerReel } from '@/lib/player-reel-upload-client'
import { ReelNameField } from '@/components/player/reels/ReelNameField'
import { defaultReelTitle } from '@/lib/reel-display'

const SHOT_TYPES = [
  { value: 'forehand', label: 'Forehand' },
  { value: 'backhand', label: 'Backhand' },
  { value: 'serve', label: 'Serve' },
  { value: 'volley', label: 'Volley' },
] as const

const MAX_DURATION_SECONDS = 60

type Props = {
  onClose: () => void
}

export function ReelsRecordModal({ onClose }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [shotType, setShotType] = useState<string>('forehand')
  const [reelTitle, setReelTitle] = useState(() => defaultReelTitle('forehand'))
  const titleTouched = useRef(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
    'environment',
  )
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [sport, setSport] = useState('tennis')

  const videoRef = useRef<HTMLVideoElement>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderMimeRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (titleTouched.current) return
    setReelTitle(defaultReelTitle(shotType))
  }, [shotType])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setStream(null)
  }, [])

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('player_id')
          .eq('id', user.id)
          .maybeSingle()
        if (profile?.player_id) {
          setPlayerId(profile.player_id)
          const { data: player } = await supabase
            .from('players')
            .select('sport')
            .eq('id', profile.player_id)
            .maybeSingle()
          if (player?.sport) setSport(player.sport)
        }
      }
    }
    void init()
  }, [supabase])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setError('Recording is not supported in this browser. Use Upload instead.')
      return
    }

    let cancelled = false

    async function startCamera() {
      stopStream()
      try {
        const mime = preferredRecorderMimeType()
        if (!mime && typeof MediaRecorder !== 'undefined') {
          setError(
            'Recording is not supported on this browser. Use Upload instead.',
          )
          return
        }
        recorderMimeRef.current = mime

        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: true,
        })
        if (cancelled) {
          s.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = s
        setStream(s)
        if (videoRef.current) {
          videoRef.current.srcObject = s
        }
      } catch (err: unknown) {
        const name = err instanceof DOMException ? err.name : ''
        if (name === 'NotAllowedError') {
          setError(
            'Camera permission denied. Enable camera access in your browser settings.',
          )
        } else if (name === 'NotFoundError') {
          setError('No camera found on this device.')
        } else {
          setError("Couldn't start the camera. Try Upload instead.")
        }
      }
    }

    void startCamera()

    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
      stopStream()
    }
  }, [facingMode, stopStream])

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    recorder?.stop()
    setIsRecording(false)
  }, [recorder])

  const handleRecordingStop = useCallback(async () => {
    const mime = recorderMimeRef.current
    const blobType = blobTypeForRecording(mime)
    const blob = new Blob(chunksRef.current, { type: blobType })
    const ext = fileExtensionForMime(blobType)
    const file = new File([blob], `reel-${Date.now()}.${ext}`, { type: blobType })

    const title = reelTitle.trim()
    if (!title) {
      setError('Name your reel before saving.')
      return
    }

    setUploading(true)
    stopStream()

    try {
      const { sessionId } = await uploadAndAnalyzePlayerReel({
        file,
        title,
        shotType,
        sport,
        playerId,
        supabase,
      })
      router.push(`/player/reels/${sessionId}`)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Try again.')
      setUploading(false)
    }
  }, [reelTitle, shotType, sport, playerId, supabase, router, onClose, stopStream])

  function startRecording() {
    if (!stream) return
    const mime = recorderMimeRef.current
    if (!mime) {
      setError('Recording is not supported. Use Upload instead.')
      return
    }

    chunksRef.current = []
    const r = new MediaRecorder(stream, { mimeType: mime })
    r.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    r.onstop = () => {
      void handleRecordingStop()
    }
    r.start()
    setRecorder(r)
    setIsRecording(true)
    setElapsedSeconds(0)

    timerRef.current = setInterval(() => {
      setElapsedSeconds(s => {
        if (s + 1 >= MAX_DURATION_SECONDS) {
          stopRecording()
        }
        return s + 1
      })
    }, 1000)
  }

  function flipCamera() {
    stopStream()
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'))
  }

  function handleClose() {
    stopRecording()
    stopStream()
    onClose()
  }

  if (error && !stream && !uploading) {
    return (
      <ModalShell onClose={handleClose}>
        <div style={{ padding: 32, textAlign: 'center', color: '#111' }}>
          <p
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 14,
              lineHeight: 1.5,
              margin: '0 0 20px',
            }}
          >
            {error}
          </p>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: '#0F6E56',
              color: 'white',
              border: 'none',
              padding: '10px 22px',
              borderRadius: 99,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </ModalShell>
    )
  }

  return (
    <ModalShell onClose={handleClose}>
      <div
        style={{
          background: '#0A2A22',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 2,
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={uploading}
            aria-label="Close"
            style={iconButtonStyle}
          >
            <X size={18} color="white" />
          </button>

          {isRecording ? (
            <div style={recBadgeStyle}>
              <span className="ask-via-status-dot" style={recDotStyle} />
              REC
            </div>
          ) : (
            <button
              type="button"
              onClick={flipCamera}
              disabled={uploading || !stream}
              aria-label="Flip camera"
              style={iconButtonStyle}
            >
              <FlipHorizontal size={18} color="white" />
            </button>
          )}
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {!stream && !error && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.55)',
                fontSize: 13,
                fontStyle: 'italic',
                fontFamily: 'Georgia, serif',
              }}
            >
              Starting camera…
            </div>
          )}
        </div>

        <div
          style={{
            padding: '16px 18px 28px',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {!isRecording && !uploading && (
            <>
              <div style={{ marginBottom: 14 }}>
                <ReelNameField
                  dark
                  value={reelTitle}
                  onChange={value => {
                    titleTouched.current = true
                    setReelTitle(value)
                  }}
                  hint="Shown on your reel dashboard and in Ask Via."
                />
              </div>
              <div style={shotLabelStyle}>Shot type</div>
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                  marginBottom: 18,
                }}
              >
                {SHOT_TYPES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setShotType(s.value)}
                    style={{
                      fontSize: 12,
                      color:
                        shotType === s.value ? '#0A2A22' : 'rgba(255,255,255,0.85)',
                      background:
                        shotType === s.value
                          ? '#5DCAA5'
                          : 'rgba(255,255,255,0.1)',
                      padding: '7px 14px',
                      borderRadius: 99,
                      border:
                        shotType === s.value
                          ? '0.5px solid #5DCAA5'
                          : '0.5px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {error && stream && (
            <p
              style={{
                color: '#FAC775',
                fontSize: 12,
                margin: '0 0 12px',
                textAlign: 'center',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!stream || uploading}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: 'white',
              border: '3px solid rgba(255,255,255,0.3)',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: stream && !uploading ? 'pointer' : 'not-allowed',
              padding: 0,
            }}
          >
            {uploading ? (
              <Loader2
                size={28}
                color="#E53E3E"
                style={{ animation: 'spin 1s linear infinite' }}
              />
            ) : (
              <div
                style={{
                  width: isRecording ? 28 : 52,
                  height: isRecording ? 28 : 52,
                  borderRadius: isRecording ? 6 : '50%',
                  background: '#E53E3E',
                  transition: 'all 0.2s',
                }}
              />
            )}
          </button>

          <div
            style={{
              textAlign: 'center',
              color: 'white',
              fontSize: 14,
              fontWeight: 500,
              marginTop: 10,
              letterSpacing: '0.5px',
            }}
          >
            {uploading
              ? 'Uploading & analyzing…'
              : isRecording
                ? `${formatSeconds(elapsedSeconds)} / 1:00`
                : 'Tap to record'}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </ModalShell>
  )
}

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'black',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
      }}
      role="dialog"
      aria-modal
      aria-label="Record reel"
    >
      {children}
    </div>
  )
}

const iconButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  cursor: 'pointer',
}

const recBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: 'rgba(229,62,62,0.9)',
  color: 'white',
  fontSize: 11,
  fontWeight: 600,
  padding: '5px 12px',
  borderRadius: 99,
  letterSpacing: '0.05em',
}

const recDotStyle: React.CSSProperties = {
  width: 7,
  height: 7,
  background: 'white',
  borderRadius: '50%',
}

const shotLabelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.6)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 8,
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}
