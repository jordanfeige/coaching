'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Plus } from 'lucide-react'
import { brand } from '@/lib/brand'
import {
  formatDurationLong,
  formatMatchDate,
  formatSegmentTime,
} from '@/lib/film-room/format'
import { isChunkAnalysisDisplayable } from '@/lib/film-room/analysis-complete'
import type { FilmRoomChunk, FilmRoomMatchDetail } from '@/lib/film-room/types'
import type { MatchAnalysisV2 } from '@/lib/match-analysis/types'
import { FilmRoomSideDrawer } from '@/components/player/reels/FilmRoomSideDrawer'
import { MatchSegmentClient } from '@/components/player/reels/MatchSegmentClient'
import { MatchSynthesisClient } from '@/components/player/reels/MatchSynthesisClient'

const PROCESSING_STATUSES = new Set([
  'uploading',
  'chunking',
  'chunks_ready',
  'analyzing_first',
])

function rankPillStyle(rank: number) {
  if (rank === 1) return { bg: '#FBEAF0', color: '#993556' }
  if (rank === 2) return { bg: brand.warmTint, color: brand.warm }
  return { bg: '#F1EFE8', color: '#444441' }
}

export function MatchDetailClient({ matchId }: { matchId: string }) {
  const router = useRouter()
  const [match, setMatch] = useState<FilmRoomMatchDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedSeq, setSelectedSeq] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [analyzingChunkId, setAnalyzingChunkId] = useState<string | null>(null)
  const [segmentDrawerSeq, setSegmentDrawerSeq] = useState<number | null>(null)
  const [synthesisDrawerOpen, setSynthesisDrawerOpen] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchMatch = useCallback(async () => {
    const res = await fetch(`/api/film-room/match/${matchId}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load match')
    setMatch(data as FilmRoomMatchDetail)
    return data as FilmRoomMatchDetail
  }, [matchId])

  useEffect(() => {
    fetchMatch().catch(e => {
      setError(e instanceof Error ? e.message : 'Failed to load')
    })
  }, [fetchMatch])

  useEffect(() => {
    if (!match || !PROCESSING_STATUSES.has(match.status)) {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }
    pollRef.current = setInterval(() => {
      fetchMatch().catch(() => {})
    }, 3000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [match?.status, fetchMatch])

  const selectedChunk =
    match?.match_chunks?.find(c => c.sequence_number === selectedSeq) ??
    match?.match_chunks?.[0]

  useEffect(() => {
    if (!selectedChunk?.id) {
      setVideoUrl(null)
      return
    }
    let cancelled = false
    fetch(`/api/film-room/chunk/${selectedChunk.id}/url`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.url) setVideoUrl(data.url)
      })
      .catch(() => {
        if (!cancelled) setVideoUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [selectedChunk?.id])

  async function deleteMatch() {
    const res = await fetch(`/api/film-room/match/${matchId}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Delete failed')
      return
    }
    router.push('/player/reels?tab=match-film')
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
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Analyze failed')
      }
      const poll = setInterval(async () => {
        const m = await fetchMatch()
        const ch = m.match_chunks.find(c => c.id === chunkId)
        if (ch?.analysis_status === 'analyzed' || ch?.analysis_status === 'failed') {
          clearInterval(poll)
          setAnalyzingChunkId(null)
        }
      }, 3000)
    } catch (e) {
      setAnalyzingChunkId(null)
      setError(e instanceof Error ? e.message : 'Analyze failed')
    }
  }

  if (error && !match) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: brand.red }}>{error}</p>
        <Link href="/player/reels?tab=match-film">← Match Film</Link>
      </div>
    )
  }

  if (!match) {
    return <div style={{ padding: 24, color: brand.muted }}>Loading match…</div>
  }

  const title = match.opponent_name ? `vs ${match.opponent_name}` : 'Untitled match'
  const dateLabel = formatMatchDate(match.match_date, match.created_at)

  return (
    <div style={{ padding: '14px 16px 48px', maxWidth: 720, margin: '0 auto' }}>
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
          margin: '12px 0 4px',
        }}
      >
        {title}
      </h1>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <p style={{ fontSize: 12, color: brand.muted, margin: 0 }}>
          {dateLabel}
          {match.chunk_count > 0 &&
            ` · ${match.analyzed_count} of ${match.chunk_count} segments analyzed`}
          {match.raw_video_duration_seconds != null &&
            ` · ${formatDurationLong(match.raw_video_duration_seconds)}`}
        </p>
        <button
          type="button"
          onClick={async () => {
            if (
              !window.confirm(
                'Delete this match from Match Film? This cannot be undone.',
              )
            ) {
              return
            }
            await deleteMatch()
          }}
          style={{
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 600,
            padding: '6px 10px',
            borderRadius: 8,
            border: `0.5px solid ${brand.line}`,
            background: brand.card,
            color: brand.sub,
            cursor: 'pointer',
          }}
        >
          Delete match
        </button>
      </div>

      {match.status === 'failed' && (
        <FailedCard
          message={match.status_error ?? 'Something went wrong'}
          onDelete={deleteMatch}
        />
      )}

      {PROCESSING_STATUSES.has(match.status) && (
        <ProcessingCard status={match.status} />
      )}

      {match.status === 'ready' && (
        <ReadyView
          match={match}
          selectedSeq={selectedSeq}
          onSelectSeq={setSelectedSeq}
          selectedChunk={selectedChunk}
          videoUrl={videoUrl}
          analyzingChunkId={analyzingChunkId}
          onAnalyze={analyzeChunk}
          matchId={matchId}
          onOpenSegment={setSegmentDrawerSeq}
          onOpenSynthesis={() => setSynthesisDrawerOpen(true)}
        />
      )}

      {error && (
        <p style={{ color: brand.red, fontSize: 13, marginTop: 12 }}>{error}</p>
      )}

      <FilmRoomSideDrawer
        open={segmentDrawerSeq !== null}
        onClose={() => setSegmentDrawerSeq(null)}
        title={
          segmentDrawerSeq != null
            ? `Segment ${segmentDrawerSeq + 1}`
            : 'Segment'
        }
        subtitle={
          segmentDrawerSeq != null
            ? (() => {
                const ch = match.match_chunks.find(
                  c => c.sequence_number === segmentDrawerSeq,
                )
                return ch
                  ? `${formatSegmentTime(ch.start_seconds)} — ${formatSegmentTime(ch.end_seconds)}`
                  : null
              })()
            : null
        }
      >
        {segmentDrawerSeq !== null && (
          <MatchSegmentClient
            matchId={matchId}
            sequenceNumber={segmentDrawerSeq}
            variant="drawer"
          />
        )}
      </FilmRoomSideDrawer>

      <FilmRoomSideDrawer
        open={synthesisDrawerOpen}
        onClose={() => setSynthesisDrawerOpen(false)}
        title="Match synthesis"
        subtitle={
          match.chunk_count > 0
            ? `${match.analyzed_count} of ${match.chunk_count} segments analyzed`
            : null
        }
      >
        {synthesisDrawerOpen && (
          <MatchSynthesisClient
            matchId={matchId}
            autoRun
            variant="drawer"
            onMatchRefresh={async () => {
              await fetchMatch()
            }}
          />
        )}
      </FilmRoomSideDrawer>
    </div>
  )
}

function ProcessingCard({ status }: { status: string }) {
  const steps = [
    { key: 'upload', label: 'Uploaded', done: true },
    {
      key: 'chunk',
      label: 'Splitting into segments',
      active: status === 'chunking' || status === 'chunks_ready',
      done: status === 'chunks_ready' || status === 'analyzing_first',
    },
    {
      key: 'analyze',
      label: 'Analyzing first segment',
      active: status === 'analyzing_first',
      done: false,
    },
  ]

  return (
    <div
      style={{
        padding: 20,
        borderRadius: 12,
        border: `0.5px solid ${brand.line}`,
        background: brand.paper,
      }}
    >
      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
        Preparing your match film…
      </p>
      {steps.map(s => (
        <div
          key={s.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
            fontSize: 13,
            color: s.done ? brand.tealDarkHex : s.active ? brand.ink : brand.muted,
          }}
        >
          <span>{s.done ? '✅' : s.active ? '🔄' : '⏳'}</span>
          {s.label}
        </div>
      ))}
    </div>
  )
}

function FailedCard({
  message,
  onDelete,
}: {
  message: string
  onDelete: () => void
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        background: '#FBEAF0',
        border: `0.5px solid ${brand.red}`,
        marginBottom: 16,
      }}
    >
      <p style={{ fontSize: 13, color: '#993556', margin: '0 0 12px' }}>{message}</p>
      <button
        type="button"
        onClick={onDelete}
        style={{
          padding: '8px 14px',
          borderRadius: 8,
          border: 'none',
          background: brand.tealDarkHex,
          color: '#fff',
          fontWeight: 600,
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        Delete and try again
      </button>
    </div>
  )
}

function ReadyView({
  match,
  selectedSeq,
  onSelectSeq,
  selectedChunk,
  videoUrl,
  analyzingChunkId,
  onAnalyze,
  matchId,
  onOpenSegment,
  onOpenSynthesis,
}: {
  match: FilmRoomMatchDetail
  selectedSeq: number
  onSelectSeq: (n: number) => void
  selectedChunk: FilmRoomChunk | undefined
  videoUrl: string | null
  analyzingChunkId: string | null
  onAnalyze: (chunkId: string) => void
  matchId: string
  onOpenSegment: (sequenceNumber: number) => void
  onOpenSynthesis: () => void
}) {
  const analyzedCount = match.match_chunks.filter(
    c => c.analysis_status === 'analyzed',
  ).length

  return (
    <>
      {selectedChunk && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: brand.muted, marginBottom: 6 }}>
            Segment {selectedChunk.sequence_number + 1} ·{' '}
            {formatSegmentTime(selectedChunk.start_seconds)} —{' '}
            {formatSegmentTime(selectedChunk.end_seconds)}
          </p>
          {videoUrl ? (
            <video
              key={videoUrl}
              src={videoUrl}
              controls
              playsInline
              style={{
                width: '100%',
                borderRadius: 10,
                background: '#000',
                maxHeight: 360,
              }}
            />
          ) : (
            <div
              style={{
                height: 200,
                background: brand.tealDeep,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 13,
              }}
            >
              Loading video…
            </div>
          )}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 16,
        }}
      >
        {match.match_chunks.map(chunk => {
          const selected = chunk.sequence_number === selectedSeq
          const analyzed = chunk.analysis_status === 'analyzed'
          return (
            <button
              key={chunk.id}
              type="button"
              onClick={() => onSelectSeq(chunk.sequence_number)}
              style={{
                flexShrink: 0,
                width: 80,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 50,
                  borderRadius: 6,
                  overflow: 'hidden',
                  position: 'relative',
                  border: selected
                    ? `2px solid ${brand.teal}`
                    : `0.5px solid ${brand.line}`,
                  background: brand.tealDeep,
                }}
              >
                {chunk.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={chunk.thumbnail_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : null}
                {!analyzed && (
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.35)',
                      color: 'white',
                      fontSize: 18,
                    }}
                  >
                    <Plus size={16} aria-hidden />
                  </span>
                )}
                {analyzed && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      right: 4,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: brand.tealHex,
                    }}
                  />
                )}
              </div>
              <span style={{ fontSize: 10, color: brand.muted, marginTop: 4, display: 'block' }}>
                {formatSegmentTime(chunk.start_seconds)}
              </span>
            </button>
          )
        })}
      </div>

      {analyzedCount >= 2 && (
        <button
          type="button"
          onClick={onOpenSynthesis}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '14px 16px',
            borderRadius: 12,
            background: brand.tealGlaze,
            border: `0.5px solid ${brand.tealTint}`,
            marginBottom: 16,
            cursor: 'pointer',
            textAlign: 'left',
            font: 'inherit',
            color: 'inherit',
          }}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: brand.ink }}>
              Synthesize across {analyzedCount} analyzed segments
            </p>
            <p style={{ fontSize: 11, color: brand.sub, margin: '4px 0 0' }}>
              See the big-picture game plan for the match
            </p>
          </div>
          <ChevronRight size={18} color={brand.tealDarkHex} aria-hidden />
        </button>
      )}

      {selectedChunk && (
        <ChunkAnalysisPanel
          chunk={selectedChunk}
          analyzing={analyzingChunkId === selectedChunk.id}
          onAnalyze={() => onAnalyze(selectedChunk.id)}
          onOpenSegment={() => onOpenSegment(selectedChunk.sequence_number)}
        />
      )}
    </>
  )
}

function ChunkAnalysisPanel({
  chunk,
  analyzing,
  onAnalyze,
  onOpenSegment,
}: {
  chunk: FilmRoomChunk
  analyzing: boolean
  onAnalyze: () => void
  onOpenSegment: () => void
}) {
  const header = (
    <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: brand.sub }}>
      Segment {chunk.sequence_number + 1} · {formatSegmentTime(chunk.start_seconds)}—
      {formatSegmentTime(chunk.end_seconds)}
      {chunk.analysis_status === 'analyzed' && (
        <span style={{ color: brand.tealDarkHex }}> · ● analyzed</span>
      )}
    </p>
  )

  if (chunk.analysis_status !== 'analyzed') {
    return (
      <div>
        {header}
        <div
          style={{
            textAlign: 'center',
            padding: 24,
            borderRadius: 12,
            border: `0.5px solid ${brand.line}`,
            background: brand.paper,
          }}
        >
          <p style={{ fontSize: 13, margin: '0 0 12px' }}>
            This segment hasn&apos;t been analyzed yet
          </p>
          <button
            type="button"
            disabled={analyzing || chunk.analysis_status === 'analyzing'}
            onClick={onAnalyze}
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
            {analyzing || chunk.analysis_status === 'analyzing'
              ? 'Analyzing… ~2 minutes'
              : 'Analyze this segment'}
          </button>
          {chunk.analysis_error && (
            <p style={{ fontSize: 12, color: brand.red, marginTop: 10 }}>
              {chunk.analysis_error}
            </p>
          )}
        </div>
      </div>
    )
  }

  const analysis = chunk.analysis_result as MatchAnalysisV2 | null
  const plan = analysis?.tactical_game_plan
  const workOn = analysis?.work_on_top_three ?? []
  const displayable = isChunkAnalysisDisplayable(analysis)

  return (
    <div>
      {header}
      {!displayable && (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            border: `0.5px solid ${brand.line}`,
            background: brand.warmTint,
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 13, margin: '0 0 10px', lineHeight: 1.5, color: brand.ink }}>
            This segment is marked analyzed but the summary didn&apos;t save completely
            (missing game plan or priorities). Open the full segment view or re-analyze.
          </p>
          <button
            type="button"
            disabled={analyzing}
            onClick={onAnalyze}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: brand.tealDarkHex,
              color: '#fff',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              marginRight: 8,
            }}
          >
            {analyzing ? 'Re-analyzing…' : 'Re-analyze segment'}
          </button>
        </div>
      )}
      {plan && (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            background: brand.tealGlaze,
            border: `0.5px solid ${brand.tealTint}`,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: brand.tealDarkHex,
              marginBottom: 6,
            }}
          >
            Game plan
          </div>
          <h3
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 17,
              fontWeight: 500,
              margin: '0 0 8px',
              lineHeight: 1.3,
            }}
          >
            {plan.theme}
          </h3>
          <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0, color: brand.ink }}>
            {plan.reasoning}
          </p>
        </div>
      )}

      {workOn.length > 0 && (
        <>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: brand.muted,
              marginBottom: 8,
            }}
          >
            Top priorities
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {workOn.map(item => {
              const pill = rankPillStyle(item.rank)
              return (
                <button
                  key={item.rank}
                  type="button"
                  onClick={onOpenSegment}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `0.5px solid ${brand.line}`,
                    background: brand.card,
                    cursor: 'pointer',
                    textAlign: 'left',
                    font: 'inherit',
                    color: 'inherit',
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
                    #{item.rank}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{item.title}</span>
                  <ChevronRight size={16} color={brand.muted} aria-hidden />
                </button>
              )
            })}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={onOpenSegment}
        style={{
          display: 'inline-block',
          fontSize: 12,
          fontWeight: 600,
          color: brand.tealDarkHex,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        See full analysis →
      </button>
    </div>
  )
}
