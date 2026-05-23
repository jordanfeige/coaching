'use client'

import { useState } from 'react'
import { PlayerIdentifier } from '@/components/match-analysis/PlayerIdentifier'
import type { PlayerIdentificationPayload } from '@/components/match-analysis/PlayerIdentifier'
import { MatchAnalysisResults } from '@/components/match-analysis/MatchAnalysisResults'
import type { MatchAnalysisV2 } from '@/lib/match-analysis/types'
import { brand } from '@/lib/brand'
import {
  MAX_MATCH_VIDEO_BYTES,
  MAX_MATCH_VIDEO_MB,
} from '@/lib/match-analysis/limits'

type Step = 'upload' | 'identify' | 'analyzing' | 'done'

type AnalysisResponse = {
  success?: boolean
  error?: string
  message?: string
  hint?: string
  raw_response_preview?: string
  analysis?: MatchAnalysisV2
  meta?: {
    analysis_version?: string
    elapsed_minutes?: number
    estimated_cost_usd?: number
    token_usage?: { totalTokenCount?: number }
    video_size_mb?: number
    model?: string
    upload_method?: string
  }
  _client_elapsed_ms?: number
}

export default function MatchAnalysisTestPage() {
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<Step>('upload')
  const [identification, setIdentification] =
    useState<PlayerIdentificationPayload | null>(null)
  const [opponentName, setOpponentName] = useState('')
  const [matchContext, setMatchContext] = useState(
    '12U Boys Singles, L4 Tournament',
  )
  const [playerHint, setPlayerHint] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResponse | null>(null)

  function handleFileSelect(f: File | null) {
    setFile(f)
    setIdentification(null)
    setResult(null)
    setStep(f ? 'identify' : 'upload')
  }

  function handleIdentified(data: PlayerIdentificationPayload) {
    setIdentification(data)
    void runAnalysis(data)
  }

  async function runAnalysis(id: PlayerIdentificationPayload) {
    if (!file) return

    if (file.size > MAX_MATCH_VIDEO_BYTES) {
      setResult({
        error: 'Video too large',
        message: `File is ${(file.size / 1024 / 1024).toFixed(0)}MB. Maximum is ${MAX_MATCH_VIDEO_MB}MB.`,
      })
      setStep('done')
      return
    }

    setLoading(true)
    setStep('analyzing')
    setResult(null)

    const startTime = Date.now()
    const formData = new FormData()
    formData.append('video', file)
    formData.append('opponent_name', opponentName || 'opponent')
    formData.append('match_context', matchContext)
    formData.append('reference_frame_data_url', id.frameDataUrl)
    formData.append('tap_x_percent', String(id.tapXPercent))
    formData.append('tap_y_percent', String(id.tapYPercent))
    formData.append('frame_captured_at_seconds', String(id.capturedAtSeconds))
    if (playerHint.trim()) {
      formData.append('player_description_hint', playerHint.trim())
    }

    try {
      const res = await fetch('/api/match-analysis/test', {
        method: 'POST',
        body: formData,
      })
      const data = (await res.json()) as AnalysisResponse
      data._client_elapsed_ms = Date.now() - startTime
      setResult(data)
      setStep('done')
    } catch (err: unknown) {
      setResult({
        error: err instanceof Error ? err.message : 'Request failed',
      })
      setStep('done')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 500 }}>
        Match Analysis v2 (Test)
      </h1>
      <p style={{ color: brand.textMuted, fontSize: 14, lineHeight: 1.5 }}>
        Tap-to-identify + evidence-grounded coaching. Feature-flagged (Jordan only).
        Videos up to 1GB supported. Large files take longer to upload and analyze — do not
        close this tab.
      </p>

      <div
        style={{
          marginTop: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <input
          type="file"
          accept="video/*"
          disabled={loading}
          onChange={e => handleFileSelect(e.target.files?.[0] ?? null)}
        />
        {file && (
          <p style={{ fontSize: 12, color: brand.textMuted, margin: 0 }}>
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
          </p>
        )}
        <input
          placeholder="Opponent name (e.g., M. Patel)"
          value={opponentName}
          onChange={e => setOpponentName(e.target.value)}
          disabled={loading}
          style={inputStyle}
        />
        <input
          placeholder="Match context (e.g., 12U Boys Singles, L4 Tournament May 18)"
          value={matchContext}
          onChange={e => setMatchContext(e.target.value)}
          disabled={loading}
          style={inputStyle}
        />
        <input
          placeholder="Optional: describe yourself (e.g., white shirt, blue headband)"
          value={playerHint}
          onChange={e => setPlayerHint(e.target.value)}
          disabled={loading}
          style={inputStyle}
        />
      </div>

      {file && step === 'identify' && !loading && (
        <div style={{ marginTop: 24 }}>
          <PlayerIdentifier videoFile={file} onIdentified={handleIdentified} />
        </div>
      )}

      {loading && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: brand.warmTint,
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          Analyzing the player you tapped… do not close this tab. Check the terminal
          for progress logs.
        </div>
      )}

      {result && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 500 }}>Result</h2>
          {result.error && (
            <div
              style={{
                background: brand.redLight,
                padding: 12,
                borderRadius: 8,
                marginBottom: 14,
                fontSize: 13,
              }}
            >
              <strong>{result.error}</strong>
              {result.message && <p style={{ margin: '6px 0' }}>{result.message}</p>}
              {result.hint && (
                <p style={{ margin: '6px 0', color: brand.textMuted }}>{result.hint}</p>
              )}
            </div>
          )}
          {result.raw_response_preview && (
            <div
              style={{
                background: brand.redLight,
                padding: 12,
                borderRadius: 8,
                marginBottom: 14,
                fontSize: 12,
              }}
            >
              <strong>JSON parse failed</strong>
              {result.message && <p style={{ margin: '6px 0' }}>{result.message}</p>}
              <pre
                style={{
                  marginTop: 8,
                  fontSize: 10,
                  overflow: 'auto',
                  maxHeight: 200,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {result.raw_response_preview}
              </pre>
            </div>
          )}
          {result.meta && (
            <div
              style={{
                background: brand.warmTint,
                padding: 12,
                borderRadius: 8,
                marginBottom: 14,
                fontSize: 13,
              }}
            >
              <strong>Run meta</strong>
              <ul style={{ margin: '6px 0 0 20px' }}>
                <li>Version: {result.meta.analysis_version ?? '—'}</li>
                <li>Server elapsed: {result.meta.elapsed_minutes} min</li>
                {result._client_elapsed_ms != null && (
                  <li>
                    Client elapsed:{' '}
                    {(result._client_elapsed_ms / 60000).toFixed(1)} min
                  </li>
                )}
                <li>
                  Tokens:{' '}
                  {result.meta.token_usage?.totalTokenCount?.toLocaleString() ??
                    '—'}
                </li>
                <li>Est. cost: ${result.meta.estimated_cost_usd}</li>
                <li>
                  Model: {result.meta.model} ({result.meta.upload_method})
                </li>
              </ul>
            </div>
          )}
          {result.analysis?.player_identification && (
            <MatchAnalysisResults
              analysis={result.analysis}
              playerDescriptionHint={playerHint.trim() || undefined}
            />
          )}
          {result.success && !result.analysis?.player_identification && (
            <pre
              style={{
                background: '#1e1e1e',
                color: '#eee',
                padding: 14,
                borderRadius: 8,
                overflow: 'auto',
                fontSize: 11,
              }}
            >
              {JSON.stringify(result.analysis, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: 8,
  border: `1px solid ${brand.line}`,
  borderRadius: 6,
  fontSize: 14,
}
