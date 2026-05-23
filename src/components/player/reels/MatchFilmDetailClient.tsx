'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Loader2 } from 'lucide-react'
import { brand, fonts } from '@/lib/brand'
import {
  formatDurationLong,
  formatMatchDate,
  formatSegmentTime,
} from '@/lib/film-room/format'
import {
  segmentHumanLabel,
  segmentPillTags,
  truncateNarrative,
} from '@/lib/film-room/segment-display'
import { synthesisTendencyRows } from '@/lib/film-room/tendency-display'
import type {
  ChunkAnalysisStatus,
  FilmRoomChunk,
  FilmRoomMatchDetail,
} from '@/lib/film-room/types'
import type { MatchSynthesisV1 } from '@/lib/match-analysis/synthesis-types'
import { MatchFilmVideoPlayer } from '@/components/player/reels/film-room/MatchFilmVideoPlayer'
import { TendencyBars } from '@/components/player/reels/film-room/TendencyBars'
import { MatchFilmDrawer } from '@/components/player/reels/film-room/MatchFilmDrawer'
import { MatchSegmentDrawerContent } from '@/components/player/reels/MatchSegmentDrawerContent'
import { AssignDrillModal } from '@/components/player/reels/AssignDrillModal'
import { useAskVia } from '@/components/player/ask-via/AskViaContext'

const PROCESSING = new Set([
  'uploading',
  'chunking',
  'chunks_ready',
  'analyzing_first',
])

const POLL_MS = 5000

function severityColor(summary: string, frequency: number): string {
  const s = summary.toLowerCase()
  if (s.includes('high') || s.includes('severe')) return '#993556'
  if (s.includes('med') || frequency >= 3) return '#854F0B'
  return '#444441'
}

function countAnalyzed(chunks: FilmRoomChunk[]): number {
  return chunks.filter(c => c.analysis_status === 'analyzed').length
}

function pendingChunks(chunks: FilmRoomChunk[]): FilmRoomChunk[] {
  return chunks.filter(
    c => c.analysis_status === 'not_analyzed' || c.analysis_status === 'failed',
  )
}

function chunkIsAnalyzing(
  chunk: FilmRoomChunk,
  activeIds: Set<string>,
): boolean {
  return activeIds.has(chunk.id) || chunk.analysis_status === 'analyzing'
}

export function MatchFilmDetailClient({ matchId }: { matchId: string }) {
  const [match, setMatch] = useState<FilmRoomMatchDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [synthesis, setSynthesis] = useState<MatchSynthesisV1 | null>(null)
  const [synthesisLoading, setSynthesisLoading] = useState(false)
  const [drawerSeq, setDrawerSeq] = useState<number | null>(null)
  const [seekTo, setSeekTo] = useState<number | null>(null)
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(() => new Set())
  const [batchProgress, setBatchProgress] = useState<{
    current: number
    total: number
    sequenceNumber: number
  } | null>(null)
  const [matchAssignTitle, setMatchAssignTitle] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const drawerPushed = useRef(false)
  const [batchBusy, setBatchBusy] = useState(false)

  const fetchMatch = useCallback(async () => {
    const res = await fetch(`/api/film-room/match/${matchId}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load match')
    const detail = data as FilmRoomMatchDetail
    setMatch(detail)
    return detail
  }, [matchId])

  const loadSynthesis = useCallback(async () => {
    const getRes = await fetch(`/api/film-room/synthesize/${matchId}`)
    const getData = await getRes.json()
    if (!getRes.ok) throw new Error(getData.error || 'Synthesis failed')
    if ((getData.analyzedCount ?? 0) < 2) {
      setSynthesis(null)
      return
    }
    if (getData.synthesis) {
      setSynthesis(getData.synthesis as MatchSynthesisV1)
      return
    }
    setSynthesisLoading(true)
    const postRes = await fetch(`/api/film-room/synthesize/${matchId}`, { method: 'POST' })
    const postData = await postRes.json()
    setSynthesisLoading(false)
    if (!postRes.ok) throw new Error(postData.error || 'Synthesis failed')
    setSynthesis(postData.synthesis as MatchSynthesisV1)
  }, [matchId])

  const patchChunkStatus = useCallback(
    (chunkId: string, status: ChunkAnalysisStatus) => {
      setMatch(prev => {
        if (!prev) return prev
        const match_chunks = prev.match_chunks.map(c =>
          c.id === chunkId ? { ...c, analysis_status: status } : c,
        )
        return {
          ...prev,
          match_chunks,
          analyzed_count: countAnalyzed(match_chunks),
        }
      })
    },
    [],
  )

  const startPolling = useCallback(() => {
    const tick = () => {
      fetchMatch()
        .then(m => {
          const analyzed = countAnalyzed(m.match_chunks)
          if (analyzed >= 2) {
            loadSynthesis().catch(() => {})
          }
          const anyServerAnalyzing = m.match_chunks.some(
            c => c.analysis_status === 'analyzing',
          )
          if (!anyServerAnalyzing && !batchBusy) {
            setAnalyzingIds(prev => {
              const next = new Set(prev)
              for (const c of m.match_chunks) {
                if (
                  c.analysis_status === 'analyzed' ||
                  c.analysis_status === 'failed'
                ) {
                  next.delete(c.id)
                }
              }
              return next
            })
          }
          const anyPendingActive = m.match_chunks.some(
            c => c.analysis_status === 'analyzing',
          )
          if (!anyPendingActive && analyzingIds.size === 0 && !batchBusy) {
            if (pollRef.current) {
              clearInterval(pollRef.current)
              pollRef.current = null
            }
          }
        })
        .catch(() => {})
    }

    if (pollRef.current) return
    tick()
    pollRef.current = setInterval(tick, POLL_MS)
  }, [fetchMatch, loadSynthesis, analyzingIds.size, batchBusy])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => {
    fetchMatch()
      .then(m => {
        if (m.status === 'ready' && countAnalyzed(m.match_chunks) >= 2) {
          loadSynthesis().catch(() => {})
        }
        if (m.match_chunks.some(c => c.analysis_status === 'analyzing')) {
          startPolling()
        }
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
    return () => stopPolling()
  }, [fetchMatch, loadSynthesis, startPolling, stopPolling])

  useEffect(() => {
    if (!match || !PROCESSING.has(match.status)) return
    startPolling()
    return () => {
      if (!batchBusy && analyzingIds.size === 0) stopPolling()
    }
  }, [match?.status, startPolling, stopPolling, analyzingIds.size, batchBusy])

  const openDrawer = useCallback((seq: number) => {
    setDrawerSeq(seq)
    if (!drawerPushed.current) {
      window.history.pushState({ filmDrawer: true }, '')
      drawerPushed.current = true
    }
  }, [])

  const closeDrawer = useCallback(() => {
    setDrawerSeq(null)
    if (drawerPushed.current) {
      drawerPushed.current = false
      window.history.back()
    }
  }, [])

  useEffect(() => {
    const onPop = () => {
      if (drawerPushed.current) {
        drawerPushed.current = false
        setDrawerSeq(null)
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const runAnalyzeChunk = useCallback(
    async (chunkId: string): Promise<boolean> => {
      setError(null)
      setAnalyzingIds(prev => new Set(prev).add(chunkId))
      patchChunkStatus(chunkId, 'analyzing')
      startPolling()

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
        const m = await fetchMatch()
        const ch = m.match_chunks.find(c => c.id === chunkId)
        if (ch?.analysis_status === 'analyzed') {
          if (countAnalyzed(m.match_chunks) >= 2) {
            await loadSynthesis()
          }
        }
        return ch?.analysis_status === 'analyzed'
      } catch (e) {
        patchChunkStatus(chunkId, 'failed')
        setError(e instanceof Error ? e.message : 'Analyze failed')
        return false
      } finally {
        setAnalyzingIds(prev => {
          const next = new Set(prev)
          next.delete(chunkId)
          return next
        })
      }
    },
    [fetchMatch, loadSynthesis, patchChunkStatus, startPolling],
  )

  const analyzeAllRemaining = useCallback(async () => {
    if (!match || batchBusy) return
    const queue = pendingChunks(match.match_chunks)
    if (queue.length === 0) return

    setBatchBusy(true)
    setError(null)

    for (let i = 0; i < queue.length; i++) {
      const chunk = queue[i]!
      setBatchProgress({
        current: i + 1,
        total: queue.length,
        sequenceNumber: chunk.sequence_number,
      })
      await runAnalyzeChunk(chunk.id)
    }

    setBatchProgress(null)
    setBatchBusy(false)
    const m = await fetchMatch()
    if (countAnalyzed(m.match_chunks) >= 2) {
      await loadSynthesis().catch(() => {})
    }
  }, [match, batchBusy, runAnalyzeChunk, fetchMatch, loadSynthesis])

  const chunks = match?.match_chunks ?? []
  const totalChunks = chunks.length
  const analyzedCount = match ? countAnalyzed(chunks) : 0
  const unanalyzedCount = chunks.length - analyzedCount
  const pending = pendingChunks(chunks)

  const tendencyRows = useMemo(
    () => synthesisTendencyRows(synthesis?.tendencies ?? null),
    [synthesis],
  )

  const drawerChunk =
    drawerSeq != null ? chunks.find(c => c.sequence_number === drawerSeq) : null

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
  const duration =
    match.raw_video_duration_seconds ??
    Math.max(0, ...chunks.map(c => c.end_seconds)) ??
    0
  const showMatchPlanContent =
    analyzedCount >= 2 && synthesis?.match_game_plan && !synthesisLoading

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
          fontFamily: fonts.serif,
          fontSize: 22,
          fontWeight: 500,
          margin: '12px 0 4px',
        }}
      >
        {title}
      </h1>
      <p style={{ fontSize: 12, color: brand.muted, margin: '0 0 12px' }}>
        {dateLabel}
        {duration > 0 && ` · ${formatDurationLong(duration)}`}
        {totalChunks > 0 &&
          ` · ${analyzedCount} of ${totalChunks} segments analyzed`}
      </p>

      {batchProgress && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            marginBottom: 16,
            borderRadius: 10,
            background: brand.tealTint,
            fontSize: 13,
            color: brand.tealDarkHex,
          }}
        >
          <Loader2 size={16} className="animate-spin" style={{ flexShrink: 0 }} />
          Analyzing segment {batchProgress.sequenceNumber + 1} of {totalChunks}…
          {' '}
          ({batchProgress.current}/{batchProgress.total} remaining)
        </div>
      )}

      {match.status === 'failed' && (
        <p style={{ color: brand.red, fontSize: 13 }}>{match.status_error}</p>
      )}

      {PROCESSING.has(match.status) && (
        <p style={{ fontSize: 13, color: brand.muted }}>Processing match…</p>
      )}

      {match.status === 'ready' && (
        <>
          <MatchFilmVideoPlayer
            chunks={chunks}
            rawVideoUrl={match.raw_video_url}
            seekToSeconds={seekTo}
          />

          {analyzedCount < 2 ? (
            <MatchPlanUnlockCard
              analyzedCount={analyzedCount}
              totalChunks={totalChunks}
              pending={pending}
              batchBusy={batchProgress != null || batchBusy}
              onAnalyzeAll={analyzeAllRemaining}
              onAnalyzeOne={id => void runAnalyzeChunk(id)}
            />
          ) : synthesisLoading ? (
            <div style={{ padding: 16, marginBottom: 24, fontSize: 13, color: brand.muted }}>
              Building your match plan…
            </div>
          ) : showMatchPlanContent ? (
            <div
              style={{
                padding: '18px 16px',
                borderRadius: 12,
                background: 'linear-gradient(180deg, #E1F5EE 0%, #ffffff 100%)',
                marginBottom: 24,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: brand.tealDarkHex,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  margin: '0 0 10px',
                }}
              >
                The match in one sentence
              </p>
              <h2
                style={{
                  fontFamily: fonts.serif,
                  fontSize: 20,
                  fontWeight: 500,
                  lineHeight: 1.35,
                  margin: '0 0 10px',
                }}
              >
                {synthesis!.match_game_plan.theme}
              </h2>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: brand.sub, margin: 0 }}>
                {synthesis!.match_game_plan.reasoning}
              </p>
            </div>
          ) : null}

          {showMatchPlanContent && (
            <>
              <TendencyBars sectionTitle="How the match played" rows={tendencyRows} />

              {synthesis!.work_on_list?.length > 0 && (
                <section style={{ marginBottom: 28 }}>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: brand.muted,
                      margin: '0 0 12px',
                    }}
                  >
                    Work on across the match
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {synthesis!.work_on_list.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: 12,
                          borderRadius: 10,
                          background: 'var(--color-background-secondary, #F3F4F6)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 500,
                                color: severityColor(
                                  item.severity_summary,
                                  item.frequency,
                                ),
                              }}
                            >
                              ×{item.frequency}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>
                              {item.title}
                            </span>
                          </div>
                          <p
                            style={{
                              fontSize: 11,
                              color: brand.sub,
                              margin: '4px 0 0',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.description ?? item.severity_summary}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMatchAssignTitle(item.title)}
                          style={{
                            flexShrink: 0,
                            padding: '5px 10px',
                            borderRadius: 8,
                            border: 'none',
                            background: brand.tealDarkHex,
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Add drill
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          <section style={{ marginBottom: 24 }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: brand.muted,
                margin: '0 0 16px',
              }}
            >
              Walk through the match
            </p>
            {chunks.map((chunk, idx) => (
              <SegmentTimelineNode
                key={chunk.id}
                chunk={chunk}
                isLast={idx === chunks.length - 1}
                totalChunks={totalChunks}
                isAnalyzing={chunkIsAnalyzing(chunk, analyzingIds)}
                batchBusy={batchProgress != null || batchBusy}
                onAnalyze={() => void runAnalyzeChunk(chunk.id)}
                onOpenDrawer={() => openDrawer(chunk.sequence_number)}
              />
            ))}
          </section>

          <p style={{ fontSize: 11, color: brand.sub, margin: 0 }}>
            {analyzedCount > 0
              ? 'Tap analyzed segments to dig in'
              : 'Analyze segments below to unlock your match plan'}
          </p>
        </>
      )}

      {error && <p style={{ color: brand.red, fontSize: 13, marginTop: 12 }}>{error}</p>}

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 16px',
            borderRadius: 10,
            background: brand.ink,
            color: '#fff',
            fontSize: 13,
            zIndex: 300,
            maxWidth: '90vw',
          }}
        >
          {toast}
        </div>
      )}

      <MatchFilmDrawer
        open={drawerSeq !== null}
        onClose={closeDrawer}
        title={`Segment ${(drawerSeq ?? 0) + 1}`}
        subtitle={
          drawerChunk
            ? `${formatSegmentTime(drawerChunk.start_seconds)} – ${formatSegmentTime(drawerChunk.end_seconds)}`
            : undefined
        }
        segmentIndex={drawerSeq ?? 0}
        segmentTotal={totalChunks}
        canPrev={(drawerSeq ?? 0) > 0}
        canNext={(drawerSeq ?? 0) < totalChunks - 1}
        onPrev={() => setDrawerSeq(s => Math.max(0, (s ?? 0) - 1))}
        onNext={() => setDrawerSeq(s => Math.min(totalChunks - 1, (s ?? 0) + 1))}
      >
        {drawerSeq !== null &&
          (chunks.find(c => c.sequence_number === drawerSeq)?.analysis_status ===
          'analyzed' ? (
            <MatchSegmentDrawerContent
              matchId={matchId}
              sequenceNumber={drawerSeq}
              onJumpTo={t => setSeekTo(t)}
              onToast={msg => {
                setToast(msg)
                setTimeout(() => setToast(null), 4000)
              }}
            />
          ) : (
            <div style={{ padding: 20, fontSize: 13, color: brand.sub }}>
              This segment isn&apos;t analyzed yet. Close the drawer and tap
              &ldquo;Analyze segment&rdquo; on the timeline.
            </div>
          ))}
      </MatchFilmDrawer>

      {matchAssignTitle && (
        <AssignDrillModal
          open
          matchId={matchId}
          workOnTitle={matchAssignTitle}
          onClose={() => setMatchAssignTitle(null)}
          onAssigned={() => {
            setMatchAssignTitle(null)
            setToast('Drill added to Training. Find it under Training.')
            setTimeout(() => setToast(null), 4000)
          }}
        />
      )}
    </div>
  )
}

function MatchPlanUnlockCard({
  analyzedCount,
  totalChunks,
  pending,
  batchBusy,
  onAnalyzeAll,
  onAnalyzeOne,
}: {
  analyzedCount: number
  totalChunks: number
  pending: FilmRoomChunk[]
  batchBusy: boolean
  onAnalyzeAll: () => void
  onAnalyzeOne: (chunkId: string) => void
}) {
  const firstPending = pending[0]
  const remaining = pending.length

  return (
    <div
      style={{
        padding: '18px 16px',
        borderRadius: 12,
        background: 'linear-gradient(180deg, #E1F5EE 0%, #ffffff 100%)',
        marginBottom: 24,
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: brand.tealDarkHex,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          margin: '0 0 8px',
        }}
      >
        Match plan
      </p>
      {analyzedCount === 0 ? (
        <p style={{ fontSize: 13, lineHeight: 1.55, color: brand.sub, margin: '0 0 14px' }}>
          Analyze 2+ segments to see your match plan.
        </p>
      ) : (
        <p style={{ fontSize: 13, lineHeight: 1.55, color: brand.sub, margin: '0 0 14px' }}>
          Analyze 1 more segment to unlock your match plan.
        </p>
      )}

      {remaining > 0 && (
        <button
          type="button"
          disabled={batchBusy}
          onClick={() => onAnalyzeAll()}
          style={primaryAnalyzeBtn(batchBusy)}
        >
          {analyzedCount === 0
            ? `Analyze all ${totalChunks} segments`
            : `Analyze remaining ${remaining} segment${remaining === 1 ? '' : 's'}`}
        </button>
      )}

      {analyzedCount === 0 && firstPending && (
        <button
          type="button"
          disabled={batchBusy}
          onClick={() => onAnalyzeOne(firstPending.id)}
          style={{
            display: 'block',
            marginTop: 10,
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: 12,
            color: brand.tealDarkHex,
            cursor: batchBusy ? 'default' : 'pointer',
            opacity: batchBusy ? 0.5 : 1,
          }}
        >
          Or analyze segment 1 first
        </button>
      )}

      {analyzedCount === 1 && (
        <p style={{ fontSize: 11, color: brand.muted, margin: '12px 0 0' }}>
          Or scroll down and tap any segment individually
        </p>
      )}
    </div>
  )
}

function primaryAnalyzeBtn(disabled: boolean) {
  return {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    background: disabled ? brand.muted : brand.tealDarkHex,
    color: '#fff',
    fontSize: 13,
    fontWeight: 500,
    cursor: disabled ? 'default' : 'pointer',
  } as const
}

const analyzeSegmentBtnStyle = {
  padding: '6px 12px',
  background: '#0F6E56',
  color: 'white',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 500,
  border: 'none',
  cursor: 'pointer',
} as const

function SegmentTimelineNode({
  chunk,
  isLast,
  totalChunks,
  isAnalyzing,
  batchBusy,
  onAnalyze,
  onOpenDrawer,
}: {
  chunk: FilmRoomChunk
  isLast: boolean
  totalChunks: number
  isAnalyzing: boolean
  batchBusy: boolean
  onAnalyze: () => void
  onOpenDrawer: () => void
}) {
  const analyzed = chunk.analysis_status === 'analyzed'
  const failed = chunk.analysis_status === 'failed'
  const analysis = chunk.analysis_result
  const label = segmentHumanLabel(chunk, totalChunks)
  const pills = segmentPillTags(analysis)

  const handleRowClick = () => {
    if (analyzed) {
      onOpenDrawer()
      return
    }
    if (!isAnalyzing && !batchBusy && !analyzed) {
      onAnalyze()
    }
  }

  return (
    <div
      role={analyzed ? 'button' : undefined}
      tabIndex={analyzed ? 0 : undefined}
      onClick={handleRowClick}
      onKeyDown={e => {
        if (analyzed && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onOpenDrawer()
        }
      }}
      style={{
        display: 'flex',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        marginBottom: isLast ? 0 : 4,
        cursor: analyzed || (!isAnalyzing && !analyzed) ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: `0.5px solid var(--color-border-tertiary, ${brand.line})`,
            background: 'var(--color-background-secondary, #F3F4F6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 500,
            opacity: analyzed ? 1 : 0.55,
          }}
        >
          {isAnalyzing ? (
            <Loader2
              size={14}
              className="animate-spin"
              color={brand.tealDarkHex}
              aria-hidden
            />
          ) : analyzed ? (
            chunk.sequence_number + 1
          ) : (
            '+'
          )}
        </div>
        {!isLast && (
          <div
            style={{
              width: 2,
              flex: 1,
              minHeight: 24,
              background: 'var(--color-border-tertiary, #E5E7EB)',
              marginTop: 4,
            }}
          />
        )}
      </div>

      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
            {analyzed
              ? label
              : isAnalyzing
                ? `Segment ${chunk.sequence_number + 1} · ${formatSegmentTime(chunk.start_seconds)} – ${formatSegmentTime(chunk.end_seconds)} · analyzing… ~2 minutes`
                : `Segment ${chunk.sequence_number + 1} · ${formatSegmentTime(chunk.start_seconds)} – ${formatSegmentTime(chunk.end_seconds)} · not analyzed`}
          </span>
          {analyzed && <ChevronRight size={16} color={brand.muted} />}
        </div>

        {analyzed ? (
          <>
            <p style={{ fontSize: 12, lineHeight: 1.55, color: brand.sub, margin: '6px 0 8px' }}>
              {truncateNarrative(analysis?.narrative_summary ?? 'Segment analyzed.')}
            </p>
            {(pills.workOn || pills.worked) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {pills.workOn && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 7px',
                      borderRadius: 999,
                      background: '#FAEEDA',
                      color: '#854F0B',
                    }}
                  >
                    {pills.workOn.label}
                  </span>
                )}
                {pills.worked && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 7px',
                      borderRadius: 999,
                      background: '#E1F5EE',
                      color: '#0F6E56',
                    }}
                  >
                    {pills.worked.label}
                  </span>
                )}
              </div>
            )}
          </>
        ) : isAnalyzing ? (
          <p style={{ fontSize: 12, lineHeight: 1.55, color: brand.muted, margin: '6px 0 0' }}>
            Via is reviewing this segment…
          </p>
        ) : (
          <div style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
            {failed && (
              <p style={{ fontSize: 12, color: brand.red, margin: '0 0 8px' }}>
                Last analysis failed. Try again.
              </p>
            )}
            <button
              type="button"
              disabled={batchBusy}
              onClick={onAnalyze}
              style={{
                ...analyzeSegmentBtnStyle,
                opacity: batchBusy ? 0.5 : 1,
                cursor: batchBusy ? 'default' : 'pointer',
              }}
            >
              Analyze segment
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
