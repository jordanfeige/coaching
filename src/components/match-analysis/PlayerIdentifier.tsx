'use client'

import { useState, useRef, useEffect } from 'react'
import { extractFrameFromVideo } from '@/lib/match-analysis/extract-frame'
import { brand } from '@/lib/brand'

export type PlayerIdentificationPayload = {
  frameDataUrl: string
  frameWidth: number
  frameHeight: number
  capturedAtSeconds: number
  tapXPercent: number
  tapYPercent: number
}

interface PlayerIdentifierProps {
  videoFile: File
  onIdentified: (data: PlayerIdentificationPayload) => void
}

export function PlayerIdentifier({ videoFile, onIdentified }: PlayerIdentifierProps) {
  const [frame, setFrame] = useState<{
    dataUrl: string
    width: number
    height: number
    capturedAtSeconds: number
  } | null>(null)
  const [tapMarker, setTapMarker] = useState<{ xPct: number; yPct: number } | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    let cancelled = false
    extractFrameFromVideo(videoFile, 30)
      .then(f => {
        if (!cancelled) setFrame(f)
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not extract frame')
        }
      })
    return () => {
      cancelled = true
    }
  }, [videoFile])

  const handleClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    const xPct = ((e.clientX - rect.left) / rect.width) * 100
    const yPct = ((e.clientY - rect.top) / rect.height) * 100
    setTapMarker({ xPct, yPct })
  }

  const handleConfirm = () => {
    if (!frame || !tapMarker) return
    onIdentified({
      frameDataUrl: frame.dataUrl,
      frameWidth: frame.width,
      frameHeight: frame.height,
      capturedAtSeconds: frame.capturedAtSeconds,
      tapXPercent: tapMarker.xPct,
      tapYPercent: tapMarker.yPct,
    })
  }

  if (error) {
    return (
      <div
        style={{
          padding: 16,
          background: brand.redLight,
          borderRadius: 10,
          color: brand.red,
        }}
      >
        Couldn&apos;t extract a frame from your video. {error}
      </div>
    )
  }

  if (!frame) {
    return (
      <div style={{ padding: 16, color: brand.textMuted }}>
        Extracting a frame from your video...
      </div>
    )
  }

  return (
    <div>
      <h3
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 16,
          fontWeight: 500,
          margin: '0 0 4px',
        }}
      >
        Tap on yourself in the video
      </h3>
      <p
        style={{
          fontSize: 12,
          color: brand.textMuted,
          margin: '0 0 12px',
          fontStyle: 'italic',
          fontFamily: 'Georgia, serif',
        }}
      >
        Frame captured at {Math.round(frame.capturedAtSeconds)}s — tap precisely on
        the player who is you. The AI will track this person throughout the entire
        match.
      </p>

      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          maxWidth: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          border: `1px solid ${brand.line}`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={frame.dataUrl}
          alt="Match frame — tap on yourself"
          onClick={handleClick}
          style={{
            display: 'block',
            maxWidth: '100%',
            cursor: 'crosshair',
            userSelect: 'none',
          }}
          draggable={false}
        />
        {tapMarker && (
          <div
            className="match-analysis-tap-marker"
            style={{
              position: 'absolute',
              left: `${tapMarker.xPct}%`,
              top: `${tapMarker.yPct}%`,
              transform: 'translate(-50%, -50%)',
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: `3px solid ${brand.tealDarkHex}`,
              background: 'rgba(15, 110, 86, 0.18)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!tapMarker}
          style={{
            padding: '9px 18px',
            borderRadius: 99,
            background: tapMarker ? brand.tealDarkHex : brand.line,
            color: 'white',
            border: 'none',
            fontSize: 13,
            fontWeight: 500,
            cursor: tapMarker ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}
        >
          {tapMarker ? 'Analyze this player →' : 'Tap on yourself first'}
        </button>
        {tapMarker && (
          <button
            type="button"
            onClick={() => setTapMarker(null)}
            style={{
              padding: '9px 14px',
              borderRadius: 99,
              background: 'transparent',
              color: brand.textMuted,
              border: `0.5px solid ${brand.line}`,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Re-tap
          </button>
        )}
      </div>
    </div>
  )
}
