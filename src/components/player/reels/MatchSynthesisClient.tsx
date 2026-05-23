'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { brand } from '@/lib/brand'
import type { MatchSynthesisV1 } from '@/lib/match-analysis/synthesis-types'
import type { FilmRoomMatchDetail } from '@/lib/film-room/types'
import { useAskVia } from '@/components/player/ask-via/AskViaContext'

type SynthesisResponse = {
  synthesis: MatchSynthesisV1 | null
  cacheHit: boolean
  analyzedCount: number
  totalChunks: number
  chunksIncluded: number[]
  error?: string
}

function severityPillStyle(summary: string) {
  const s = summary.toLowerCase()
  if (s.includes('high')) return { bg: '#FBEAF0', color: '#993556' }
  if (s.includes('medium') || s.includes('med')) return { bg: brand.warmTint, color: brand.warm }
  return { bg: '#F1EFE8', color: '#444441' }
}

export function MatchSynthesisClient({
  matchId,
  autoRun,
  variant = 'page',
  onMatchRefresh,
}: {
  matchId: string
  autoRun?: boolean
  variant?: 'page' | 'drawer'
  onMatchRefresh?: () => void | Promise<void>
}) {
  const router = useRouter()
  const { askVia } = useAskVia()
  const [match, setMatch] = useState<FilmRoomMatchDetail | null>(null)
  const [synthesis, setSynthesis] = useState<MatchSynthesisV1 | null>(null)
  const [meta, setMeta] = useState<{
    analyzedCount: number
    totalChunks: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analyzingProgress, setAnalyzingProgress] = useState<string | null>(null)

  const fetchMatch = useCallback(async () => {
    const res = await fetch(`/api/film-room/match/${matchId}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load match')
    setMatch(data as FilmRoomMatchDetail)
    return data as FilmRoomMatchDetail
  }, [matchId])

  const runSynthesis = useCallback(async () => {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch(`/api/film-room/synthesize/${matchId}`, {
        method: 'POST',
      })
      const data = (await res.json()) as SynthesisResponse
      if (!res.ok) throw new Error(data.error || 'Synthesis failed')
      setSynthesis(data.synthesis)
      setMeta({
        analyzedCount: data.analyzedCount,
        totalChunks: data.totalChunks,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Synthesis failed')
    } finally {
      setRunning(false)
      setLoading(false)
    }
  }, [matchId])

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        await fetchMatch()
        const getRes = await fetch(`/api/film-room/synthesize/${matchId}`)
        const getData = (await getRes.json()) as SynthesisResponse
        if (cancelled) return

        setMeta({
          analyzedCount: getData.analyzedCount,
          totalChunks: getData.totalChunks,
        })

        if (getData.cacheHit && getData.synthesis) {
          setSynthesis(getData.synthesis)
          setLoading(false)
          return
        }

        if (autoRun && getData.analyzedCount >= 2) {
          const res = await fetch(`/api/film-room/synthesize/${matchId}`, {
            method: 'POST',
          })
          const data = (await res.json()) as SynthesisResponse
          if (cancelled) return
          if (!res.ok) throw new Error(data.error || 'Synthesis failed')
          setSynthesis(data.synthesis)
        }
        if (!cancelled) setLoading(false)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load')
          setLoading(false)
        }
      }
    }

    init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only load
  }, [matchId, autoRun])

  const unanalyzed =
    match?.match_chunks.filter(c => c.analysis_status === 'not_analyzed') ?? []
  const opponentLabel = match?.opponent_name ? `vs ${match.opponent_name}` : 'Match'

  async function analyzeRemaining() {
    if (!match || unanalyzed.length === 0) return
    setAnalyzingProgress(`Analyzing segment 1 of ${unanalyzed.length}…`)
    setError(null)

    for (let i = 0; i < unanalyzed.length; i++) {
      const chunk = unanalyzed[i]
      setAnalyzingProgress(
        `Analyzing segment ${i + 1} of ${unanalyzed.length}… ~2 min each`,
      )
      const res = await fetch('/api/film-room/analyze-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunkId: chunk.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Analysis failed')
        setAnalyzingProgress(null)
        return
      }

      await new Promise<void>(resolve => {
        const poll = setInterval(async () => {
          const m = await fetchMatch()
          const ch = m.match_chunks.find(c => c.id === chunk.id)
          if (ch?.analysis_status === 'analyzed' || ch?.analysis_status === 'failed') {
            clearInterval(poll)
            resolve()
          }
        }, 3000)
      })
    }

    setAnalyzingProgress(null)
    await runSynthesis()
    await onMatchRefresh?.()
  }

  const pad = variant === 'drawer' ? '16px 20px 32px' : '12px 16px 80px'
  const wrapStyle =
    variant === 'drawer'
      ? { padding: pad }
      : { padding: pad, maxWidth: 720, margin: '0 auto' as const }

  if (loading || running) {
    return (
      <div style={{ ...wrapStyle, textAlign: 'center' }}>
        {variant === 'page' && (
          <Link
            href={`/player/reels/match/${matchId}`}
            style={{ fontSize: 13, color: brand.tealDarkHex, textDecoration: 'none' }}
          >
            ← {opponentLabel}
          </Link>
        )}
        <p style={{ marginTop: variant === 'page' ? 32 : 16, fontSize: 14, color: brand.ink }}>
          Synthesizing across {meta?.analyzedCount ?? '…'} segments…
        </p>
        <p style={{ fontSize: 12, color: brand.muted }}>~30 seconds</p>
        <div
          style={{
            width: 32,
            height: 32,
            border: `3px solid ${brand.tealTint}`,
            borderTopColor: brand.tealDarkHex,
            borderRadius: '50%',
            margin: '20px auto',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error && !synthesis) {
    return (
      <div style={wrapStyle}>
        {variant === 'page' && (
          <Link href={`/player/reels/match/${matchId}`}>← Back</Link>
        )}
        <p style={{ color: brand.red, marginTop: 16 }}>{error}</p>
        <button type="button" onClick={() => runSynthesis()} style={btnPrimary()}>
          Retry synthesis
        </button>
      </div>
    )
  }

  if (!synthesis) {
    return (
      <div style={wrapStyle}>
        {variant === 'page' && (
          <Link href={`/player/reels/match/${matchId}`}>← {opponentLabel}</Link>
        )}
        <p style={{ marginTop: 16, fontSize: 14 }}>
          {meta && meta.analyzedCount < 2
            ? 'Analyze at least 2 segments before synthesis.'
            : 'No synthesis yet for this match.'}
        </p>
        {meta && meta.analyzedCount >= 2 && (
          <button type="button" onClick={() => runSynthesis()} style={btnPrimary()}>
            Synthesize match
          </button>
        )}
        {error && <p style={{ color: brand.red, fontSize: 12 }}>{error}</p>}
      </div>
    )
  }

  const plan = synthesis.match_game_plan
  const total = meta?.totalChunks ?? match?.chunk_count ?? 0
  const analyzed = meta?.analyzedCount ?? match?.analyzed_count ?? 0

  return (
    <div style={wrapStyle}>
      {variant === 'page' && (
        <>
          <Link
            href={`/player/reels/match/${matchId}`}
            style={{ fontSize: 13, color: brand.tealDarkHex, textDecoration: 'none' }}
          >
            ← {opponentLabel}
          </Link>

          <h1
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 22,
              fontWeight: 500,
              margin: '10px 0 4px',
            }}
          >
            Match synthesis
          </h1>
          <p style={{ fontSize: 12, color: brand.muted, margin: '0 0 24px' }}>
            {analyzed} of {total} segments analyzed
          </p>
        </>
      )}

      <div
        style={{
          padding: 18,
          borderRadius: 12,
          background: brand.tealGlaze,
          border: `0.5px solid ${brand.tealTint}`,
          marginBottom: 24,
        }}
      >
        <p
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: brand.tealDarkHex,
            margin: '0 0 8px',
          }}
        >
          The match in one sentence
        </p>
        <h2
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 22,
            fontWeight: 500,
            margin: '0 0 12px',
            lineHeight: 1.25,
          }}
        >
          {plan.theme}
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.55, margin: '0 0 10px' }}>{plan.reasoning}</p>
        <p style={{ fontSize: 14, lineHeight: 1.55, margin: 0 }}>
          <strong>What to do:</strong> {plan.what_to_do}
        </p>
      </div>

      {synthesis.recurring_themes.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <SectionLabel text="Recurring themes" />
          {synthesis.recurring_themes.map((t, i) => (
            <div
              key={i}
              style={{
                padding: 12,
                marginBottom: 8,
                borderRadius: 8,
                border: `0.5px solid ${brand.line}`,
                borderLeft: `3px solid ${t.type === 'strength' ? brand.tealHex : brand.red}`,
                background: brand.card,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{t.title}</p>
                <span style={{ fontSize: 11, color: brand.muted, flexShrink: 0 }}>
                  {t.appears_in_segments.length} of {analyzed} segments
                </span>
              </div>
              <p style={{ fontSize: 13, margin: '8px 0 0', lineHeight: 1.45 }}>{t.description}</p>
            </div>
          ))}
        </section>
      )}

      {synthesis.work_on_list.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <SectionLabel text="Work-on list across the match" />
          {synthesis.work_on_list.map((item, i) => {
            const pill = severityPillStyle(item.severity_summary)
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 0',
                  borderBottom: `0.5px solid ${brand.lineSoft}`,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: pill.bg,
                    color: pill.color,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{item.title}</span>
                <span style={{ fontSize: 12, color: brand.muted }}>
                  ×{item.frequency}
                </span>
              </div>
            )
          })}
        </section>
      )}

      {synthesis.inconsistencies_noted.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <SectionLabel text="Inconsistencies across the match" />
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: brand.sub }}>
            {synthesis.inconsistencies_noted.map((line, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div
        style={{
          padding: 12,
          borderRadius: 10,
          background: brand.lineSoft,
          marginBottom: 24,
        }}
      >
        <p style={{ fontSize: 12, lineHeight: 1.5, margin: 0, color: brand.sub }}>
          {synthesis.synthesis_limitations}
        </p>
      </div>

      {analyzingProgress && (
        <p style={{ fontSize: 13, color: brand.tealDarkHex, marginBottom: 12 }}>
          {analyzingProgress}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {unanalyzed.length > 0 && (
          <button
            type="button"
            disabled={Boolean(analyzingProgress)}
            onClick={analyzeRemaining}
            style={{ ...btnPrimary(), width: '100%', borderRadius: 99 }}
          >
            Analyze remaining {unanalyzed.length} segment
            {unanalyzed.length === 1 ? '' : 's'}
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            askVia({
              prompt: 'Help me understand my match synthesis and what to work on next.',
              context: `match:${matchId}:synthesis`,
            })
          }
          style={{ ...btnSecondary(), width: '100%', borderRadius: 99 }}
        >
          Ask Via about the match
        </button>
        {variant === 'page' && (
          <button
            type="button"
            onClick={() => router.push(`/player/reels/match/${matchId}`)}
            style={{ ...btnSecondary(), width: '100%' }}
          >
            Back to match detail
          </button>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 12, color: brand.red, marginTop: 12 }}>{error}</p>
      )}
    </div>
  )
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: brand.muted,
        margin: '0 0 10px',
      }}
    >
      {text}
    </p>
  )
}

function btnPrimary(): React.CSSProperties {
  return {
    padding: '12px 18px',
    border: 'none',
    background: brand.tealDarkHex,
    color: '#fff',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  }
}

function btnSecondary(): React.CSSProperties {
  return {
    padding: '12px 18px',
    border: `0.5px solid ${brand.line}`,
    background: brand.card,
    color: brand.ink,
    fontWeight: 500,
    fontSize: 14,
    cursor: 'pointer',
  }
}
