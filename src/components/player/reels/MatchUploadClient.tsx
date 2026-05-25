'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PlayerIdentifier } from '@/components/match-analysis/PlayerIdentifier'
import type { PlayerIdentificationPayload } from '@/components/match-analysis/PlayerIdentifier'
import { UploadProgress } from '@/components/player/reels/film-room/UploadProgress'
import { brand } from '@/lib/brand'
import type { FilmRoomMatchDetail } from '@/lib/film-room/types'
import {
  deriveUploadPipelineStep,
  type UploadPipelineStep,
} from '@/lib/film-room/upload-progress'
import { uploadMatchVideoFile } from '@/lib/film-room/upload-match-video'
import { createClient } from '@/lib/supabase'
import {
  MAX_MATCH_VIDEO_BYTES,
  MAX_MATCH_VIDEO_LABEL,
} from '@/lib/match-analysis/limits'

type FormStep = 'metadata' | 'identify' | 'progress'

const POLL_MS = 5000

type Props = {
  initialMatchId?: string | null
}

export function MatchUploadClient({ initialMatchId = null }: Props) {
  const router = useRouter()
  const abortRef = useRef<AbortController | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [formStep, setFormStep] = useState<FormStep>(
    initialMatchId ? 'progress' : 'metadata',
  )
  const [matchId, setMatchId] = useState<string | null>(initialMatchId)
  const [file, setFile] = useState<File | null>(null)
  const [opponentName, setOpponentName] = useState('')
  const [matchContext, setMatchContext] = useState('')
  const [matchDate, setMatchDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  )
  const [playerHint, setPlayerHint] = useState('')
  const [uploadPct, setUploadPct] = useState<number | null>(null)
  const [uploadComplete, setUploadComplete] = useState(Boolean(initialMatchId))
  const [pipelineStep, setPipelineStep] = useState<UploadPipelineStep>(
    initialMatchId ? 'chunking' : 'uploading',
  )
  const [statusError, setStatusError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const fetchMatchStatus = useCallback(async (id: string) => {
    const res = await fetch(`/api/film-room/match/${id}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load match')
    return data as FilmRoomMatchDetail
  }, [])

  const applyMatchStatus = useCallback(
    (match: FilmRoomMatchDetail) => {
      const firstChunk = match.match_chunks.find(c => c.sequence_number === 0)
      const step = deriveUploadPipelineStep(match.status, {
        uploadComplete,
        firstChunkStatus: firstChunk?.analysis_status ?? null,
      })
      setPipelineStep(step)
      setStatusError(match.status_error)

      if (step === 'ready') {
        stopPolling()
        router.replace(`/player/reels/match/${match.id}`)
      }
      if (step === 'failed') {
        stopPolling()
      }
    },
    [router, stopPolling, uploadComplete],
  )

  const startPolling = useCallback(
    (id: string) => {
      stopPolling()
      const tick = () => {
        fetchMatchStatus(id)
          .then(applyMatchStatus)
          .catch(e => {
            setError(e instanceof Error ? e.message : 'Failed to refresh status')
          })
      }
      tick()
      pollRef.current = setInterval(tick, POLL_MS)
    },
    [applyMatchStatus, fetchMatchStatus, stopPolling],
  )

  useEffect(() => {
    if (!initialMatchId) return
    setMatchId(initialMatchId)
    setFormStep('progress')
    setUploadComplete(true)
    fetchMatchStatus(initialMatchId)
      .then(applyMatchStatus)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load match'))
    startPolling(initialMatchId)
    return () => stopPolling()
  }, [initialMatchId, applyMatchStatus, fetchMatchStatus, startPolling, stopPolling])

  useEffect(() => () => stopPolling(), [stopPolling])

  function goToMatchFilm() {
    stopPolling()
    router.push('/player/reels?tab=match-film')
  }

  async function cancelUpload() {
    if (
      matchId &&
      !window.confirm(
        'Cancel this upload? The match and any partial processing will be deleted.',
      )
    ) {
      return
    }
    abortRef.current?.abort()
    stopPolling()

    if (matchId) {
      try {
        await fetch(`/api/film-room/match/${matchId}`, { method: 'DELETE' })
      } catch {
        /* ignore */
      }
    }
    router.push('/player/reels?tab=match-film')
  }

  async function handleIdentified(id: PlayerIdentificationPayload) {
    if (!file) return

    setBusy(true)
    setError(null)
    setFormStep('progress')
    setUploadPct(0)
    setUploadComplete(false)
    setPipelineStep('uploading')
    setStatusError(null)
    abortRef.current = new AbortController()

    try {
      const supabase = createClient()
      const { matchId: newMatchId } = await uploadMatchVideoFile(
        supabase,
        file,
        {
          fileName: file.name,
          fileSize: file.size,
          opponent_name: opponentName.trim() || null,
          match_context: matchContext.trim() || null,
          match_date: matchDate || null,
        },
        pct => setUploadPct(pct),
      )

      setMatchId(newMatchId)
      setUploadComplete(true)
      setUploadPct(100)
      setPipelineStep('chunking')

      const processRes = await fetch('/api/film-room/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: newMatchId,
          referenceFrameDataUrl: id.frameDataUrl,
          tapXPercent: id.tapXPercent,
          tapYPercent: id.tapYPercent,
          frameCapturedAtSeconds: id.capturedAtSeconds,
          playerDescriptionHint: playerHint.trim() || undefined,
        }),
        signal: abortRef.current.signal,
      })

      if (!processRes.ok) {
        const data = await processRes.json()
        throw new Error(data.error || 'Processing failed to start')
      }

      startPolling(newMatchId)
    } catch (e) {
      if (e instanceof Error && e.message === 'Upload cancelled') {
        setFormStep('metadata')
        return
      }
      setError(e instanceof Error ? e.message : 'Upload failed')
      setFormStep('identify')
      stopPolling()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: '14px 16px 48px', maxWidth: 560, margin: '0 auto' }}>
      <Link
        href="/player/reels?tab=match-film"
        style={{ fontSize: 13, color: brand.tealDarkHex, textDecoration: 'none' }}
      >
        ← Match Film
      </Link>

      <h1
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 22,
          fontWeight: 500,
          margin: '16px 0 8px',
        }}
      >
        {formStep === 'progress' ? 'Processing match' : 'Upload match'}
      </h1>

      {error && (
        <p
          style={{
            padding: 12,
            background: brand.redLight,
            color: brand.red,
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          {error}
        </p>
      )}

      {formStep === 'metadata' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ fontSize: 13 }}>
            Match video
            <span style={{ display: 'block', fontSize: 11, color: brand.muted, marginTop: 4 }}>
              Up to {MAX_MATCH_VIDEO_LABEL}
            </span>
            <input
              type="file"
              accept="video/*"
              style={{ display: 'block', marginTop: 6 }}
              onChange={e => {
                const f = e.target.files?.[0] ?? null
                setFile(f)
                if (f && f.size > MAX_MATCH_VIDEO_BYTES) {
                  setError(`Max size is ${MAX_MATCH_VIDEO_LABEL} (5120 MB)`)
                } else {
                  setError(null)
                }
              }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            Opponent (optional)
            <input
              value={opponentName}
              onChange={e => setOpponentName(e.target.value)}
              style={{ display: 'block', marginTop: 6, width: '100%', padding: 8 }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            Match context (optional)
            <input
              value={matchContext}
              onChange={e => setMatchContext(e.target.value)}
              placeholder="USTA L4, 12s Quarterfinals"
              style={{ display: 'block', marginTop: 6, width: '100%', padding: 8 }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            Match date
            <input
              type="date"
              value={matchDate}
              onChange={e => setMatchDate(e.target.value)}
              style={{ display: 'block', marginTop: 6, padding: 8 }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            Describe yourself (optional)
            <input
              value={playerHint}
              onChange={e => setPlayerHint(e.target.value)}
              placeholder="white shirt, blue headband"
              style={{ display: 'block', marginTop: 6, width: '100%', padding: 8 }}
            />
          </label>
          <p style={{ fontSize: 12, color: brand.muted, lineHeight: 1.5 }}>
            Next you&apos;ll tap yourself on a frame so we know which player to track.
          </p>
          <button
            type="button"
            disabled={!file || busy}
            onClick={() => setFormStep('identify')}
            style={{
              padding: '10px 18px',
              borderRadius: 99,
              border: 'none',
              background: brand.tealDarkHex,
              color: '#fff',
              fontWeight: 600,
              cursor: file ? 'pointer' : 'not-allowed',
            }}
          >
            Continue
          </button>
          <button
            type="button"
            onClick={goToMatchFilm}
            style={{
              background: 'none',
              border: 'none',
              color: brand.muted,
              fontSize: 12,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {formStep === 'identify' && file && (
        <div>
          <p style={{ fontSize: 13, marginBottom: 12 }}>
            Tap yourself in the reference frame.
          </p>
          <PlayerIdentifier videoFile={file} onIdentified={handleIdentified} />
          {!busy && (
            <button
              type="button"
              onClick={() => setFormStep('metadata')}
              style={{
                marginTop: 12,
                background: 'none',
                border: 'none',
                color: brand.muted,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          )}
        </div>
      )}

      {formStep === 'progress' && (
        <div style={{ marginTop: 8 }}>
          <UploadProgress
            currentStep={pipelineStep}
            uploadPercent={uploadPct}
            statusError={statusError}
          />

          <p
            style={{
              fontSize: 12,
              color: brand.muted,
              lineHeight: 1.55,
              margin: '16px 0 0',
              padding: '12px 14px',
              background: brand.tealTint,
              borderRadius: 10,
            }}
          >
            You can leave this page — we&apos;ll notify you when your match is ready.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginTop: 20,
            }}
          >
            <button
              type="button"
              onClick={goToMatchFilm}
              style={{
                padding: '10px 18px',
                borderRadius: 99,
                border: 'none',
                background: brand.tealDarkHex,
                color: '#fff',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Go to Match Film
            </button>
            <button
              type="button"
              onClick={cancelUpload}
              style={{
                background: 'none',
                border: 'none',
                color: brand.muted,
                fontSize: 12,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Cancel upload
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
