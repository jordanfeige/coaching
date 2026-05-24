'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PlayerIdentifier } from '@/components/match-analysis/PlayerIdentifier'
import type { PlayerIdentificationPayload } from '@/components/match-analysis/PlayerIdentifier'
import { brand } from '@/lib/brand'
import { startFilmRoomProcessing } from '@/lib/film-room/start-processing'
import { uploadMatchVideoFile } from '@/lib/film-room/upload-match-video'
import { createClient } from '@/lib/supabase'
import {
  MAX_MATCH_VIDEO_BYTES,
  MAX_MATCH_VIDEO_MB,
} from '@/lib/match-analysis/limits'

type Step =
  | 'form'
  | 'uploading'
  | 'identify'
  | 'processing'
  | 'polling'
  | 'done'

type MatchChunk = {
  id: string
  sequence_number: number
  start_seconds: number
  end_seconds: number
  analysis_status: string
  analysis_error: string | null
  analysis_result: unknown
}

type MatchRecord = {
  id: string
  status: string
  status_error: string | null
  opponent_name: string | null
  match_context: string | null
  raw_video_duration_seconds: number | null
  match_chunks?: MatchChunk[]
}

export default function FilmRoomTestPage() {
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<Step>('form')
  const [matchId, setMatchId] = useState<string | null>(null)
  const [opponentName, setOpponentName] = useState('')
  const [matchContext, setMatchContext] = useState('12U Boys Singles, L4 Tournament')
  const [playerHint, setPlayerHint] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [match, setMatch] = useState<MatchRecord | null>(null)
  const [analyzingChunkId, setAnalyzingChunkId] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const fetchMatch = useCallback(async (id: string) => {
    const res = await fetch(`/api/film-room/match/${id}`)
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load match')
    }
    setMatch(data as MatchRecord)
    return data as MatchRecord
  }, [])

  const startPolling = useCallback(
    (id: string) => {
      stopPolling()
      setStep('polling')
      pollRef.current = setInterval(async () => {
        try {
          const m = await fetchMatch(id)
          if (m.status === 'ready' || m.status === 'failed') {
            stopPolling()
            setStep('done')
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Poll failed')
          stopPolling()
          setStep('done')
        }
      }, 3000)
    },
    [fetchMatch, stopPolling],
  )

  useEffect(() => () => stopPolling(), [stopPolling])

  async function handleStartUpload() {
    if (!file) return
    if (file.size > MAX_MATCH_VIDEO_BYTES) {
      setError(`File is ${(file.size / 1024 / 1024).toFixed(0)}MB. Max ${MAX_MATCH_VIDEO_MB}MB.`)
      return
    }

    setError(null)
    setStep('uploading')
    setMatch(null)

    try {
      const supabase = createClient()
      const { matchId: newMatchId } = await uploadMatchVideoFile(supabase, file, {
        fileName: file.name,
        fileSize: file.size,
        opponent_name: opponentName || null,
        match_context: matchContext,
      })
      setMatchId(newMatchId)
      setStep('identify')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      setStep('form')
    }
  }

  async function handleIdentified(id: PlayerIdentificationPayload) {
    if (!matchId || !file) return

    setStep('processing')
    setError(null)

    startFilmRoomProcessing({
      matchId,
      referenceFrameDataUrl: id.frameDataUrl,
      tapXPercent: id.tapXPercent,
      tapYPercent: id.tapYPercent,
      frameCapturedAtSeconds: id.capturedAtSeconds,
      playerDescriptionHint: playerHint.trim() || undefined,
    })

    try {
      await fetchMatch(matchId)
      startPolling(matchId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load match status')
      setStep('done')
    }
  }

  async function analyzeChunk(chunkId: string) {
    setAnalyzingChunkId(chunkId)
    setError(null)
    try {
      const res = await fetch('/api/film-room/analyze-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunkId }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Analyze failed')
      }
      if (matchId) await fetchMatch(matchId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analyze failed')
    } finally {
      setAnalyzingChunkId(null)
    }
  }

  return (
    <div style={{ maxWidth: 900, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 500 }}>
        Film Room — Pipeline Test
      </h1>
      <p style={{ color: brand.textMuted, fontSize: 14, lineHeight: 1.5 }}>
        Sign in as a player account with a linked profile. Upload → Supabase Storage → server
        ffmpeg chunking → GCS → Vertex AI per chunk. Direct browser upload — video does not pass
        through Next.js.
      </p>

      {error && (
        <p
          style={{
            padding: 12,
            background: brand.redLight,
            color: brand.red,
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          {error}
        </p>
      )}

      {(step === 'form' || step === 'uploading') && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ fontSize: 13 }}>
            Match video
            <input
              type="file"
              accept="video/*"
              style={{ display: 'block', marginTop: 4 }}
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            Opponent
            <input
              value={opponentName}
              onChange={e => setOpponentName(e.target.value)}
              style={{ display: 'block', marginTop: 4, width: '100%', padding: 8 }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            Match context
            <input
              value={matchContext}
              onChange={e => setMatchContext(e.target.value)}
              style={{ display: 'block', marginTop: 4, width: '100%', padding: 8 }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            Player hint (optional)
            <input
              value={playerHint}
              onChange={e => setPlayerHint(e.target.value)}
              style={{ display: 'block', marginTop: 4, width: '100%', padding: 8 }}
            />
          </label>
          <button
            type="button"
            disabled={!file || step === 'uploading'}
            onClick={() => void handleStartUpload()}
            style={{
              padding: '10px 16px',
              background: brand.tealDarkHex,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: file && step !== 'uploading' ? 'pointer' : 'not-allowed',
            }}
          >
            {step === 'uploading' ? 'Uploading…' : 'Upload & continue'}
          </button>
        </div>
      )}

      {step === 'identify' && file && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            Upload complete. Tap yourself in the reference frame, then processing starts.
          </p>
          <PlayerIdentifier videoFile={file} onIdentified={handleIdentified} />
        </div>
      )}

      {(step === 'processing' || step === 'polling') && (
        <p style={{ marginTop: 16, fontSize: 14 }}>
          {step === 'processing'
            ? 'Chunking video and analyzing first segment… (this can take several minutes)'
            : 'Processing… polling status every 3s'}
        </p>
      )}

      {match && (
        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 16 }}>Match status</h2>
          <p style={{ fontSize: 13 }}>
            <strong>Status:</strong> {match.status}
            {match.status_error && (
              <span style={{ color: brand.red }}> — {match.status_error}</span>
            )}
          </p>
          {match.raw_video_duration_seconds != null && (
            <p style={{ fontSize: 13 }}>
              Duration: {Math.round(match.raw_video_duration_seconds / 60)} min
            </p>
          )}

          {match.match_chunks && match.match_chunks.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 14 }}>Chunks</h3>
              {match.match_chunks.map(chunk => (
                <div
                  key={chunk.id}
                  style={{
                    border: `1px solid ${brand.line}`,
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 10,
                    fontSize: 13,
                  }}
                >
                  <div>
                    <strong>#{chunk.sequence_number}</strong> {formatTime(chunk.start_seconds)}–
                    {formatTime(chunk.end_seconds)} · {chunk.analysis_status}
                  </div>
                  {chunk.analysis_error && (
                    <p style={{ color: brand.red, margin: '6px 0' }}>{chunk.analysis_error}</p>
                  )}
                  {chunk.analysis_status !== 'analyzed' && chunk.analysis_status !== 'analyzing' && (
                    <button
                      type="button"
                      disabled={analyzingChunkId === chunk.id}
                      onClick={() => void analyzeChunk(chunk.id)}
                      style={{
                        marginTop: 8,
                        padding: '6px 12px',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {analyzingChunkId === chunk.id ? 'Analyzing…' : 'Analyze chunk'}
                    </button>
                  )}
                  {chunk.analysis_result != null && (
                    <pre
                      style={{
                        marginTop: 10,
                        fontSize: 10,
                        maxHeight: 240,
                        overflow: 'auto',
                        background: '#1e1e1e',
                        color: '#eee',
                        padding: 10,
                        borderRadius: 6,
                      }}
                    >
                      {JSON.stringify(chunk.analysis_result, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            style={{ marginTop: 8, fontSize: 12 }}
            onClick={() => matchId && void fetchMatch(matchId)}
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
