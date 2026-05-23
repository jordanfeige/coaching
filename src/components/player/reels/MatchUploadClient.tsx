'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PlayerIdentifier } from '@/components/match-analysis/PlayerIdentifier'
import type { PlayerIdentificationPayload } from '@/components/match-analysis/PlayerIdentifier'
import { brand } from '@/lib/brand'
import { uploadMatchVideoFile } from '@/lib/film-room/upload-match-video'
import { createClient } from '@/lib/supabase'
import {
  MAX_MATCH_VIDEO_BYTES,
  MAX_MATCH_VIDEO_LABEL,
} from '@/lib/match-analysis/limits'

type Step = 'metadata' | 'identify' | 'uploading'

export function MatchUploadClient() {
  const router = useRouter()
  const abortRef = useRef<AbortController | null>(null)
  const [step, setStep] = useState<Step>('metadata')
  const [file, setFile] = useState<File | null>(null)
  const [opponentName, setOpponentName] = useState('')
  const [matchContext, setMatchContext] = useState('')
  const [matchDate, setMatchDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  )
  const [playerHint, setPlayerHint] = useState('')
  const [uploadPct, setUploadPct] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function cancel() {
    abortRef.current?.abort()
    router.push('/player/reels?tab=match-film')
  }

  async function handleIdentified(id: PlayerIdentificationPayload) {
    if (!file) return

    setBusy(true)
    setError(null)
    setStep('uploading')
    setUploadPct(0)
    abortRef.current = new AbortController()

    try {
      const supabase = createClient()
      const { matchId } = await uploadMatchVideoFile(
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

      const processRes = await fetch('/api/film-room/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
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

      router.push(`/player/reels/match/${matchId}`)
    } catch (e) {
      if (e instanceof Error && e.message === 'Upload cancelled') {
        setStep('metadata')
        return
      }
      setError(e instanceof Error ? e.message : 'Upload failed')
      setStep('identify')
    } finally {
      setBusy(false)
      setUploadPct(null)
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
        Upload match
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

      {step === 'metadata' && (
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
            onClick={() => setStep('identify')}
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
            onClick={cancel}
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

      {step === 'identify' && file && (
        <div>
          <p style={{ fontSize: 13, marginBottom: 12 }}>
            Tap yourself in the reference frame.
          </p>
          <PlayerIdentifier videoFile={file} onIdentified={handleIdentified} />
          {!busy && (
            <button
              type="button"
              onClick={() => setStep('metadata')}
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

      {step === 'uploading' && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 600 }}>
            Uploading your match…
            {uploadPct != null ? ` ${uploadPct}%` : ''}
          </p>
          <p style={{ fontSize: 12, color: brand.muted, marginTop: 8 }}>
            Then we&apos;ll split it into segments and analyze the first one.
          </p>
          <button
            type="button"
            onClick={cancel}
            style={{
              marginTop: 16,
              background: 'none',
              border: 'none',
              color: brand.muted,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
