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
import { UploadProgress } from '@/components/player/reels/film-room/UploadProgress'
import { MatchFilmDrawer } from '@/components/player/reels/film-room/MatchFilmDrawer'
import { MatchSegmentDrawerContent } from '@/components/player/reels/MatchSegmentDrawerContent'
import { AssignDrillModal } from '@/components/player/reels/AssignDrillModal'
import {
  deriveUploadPipelineStep,
  isMatchStillProcessing,
} from '@/lib/film-room/upload-progress'

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

function pickDefaultActiveChunk(chunks: FilmRoomChunk[]): FilmRoomChunk | null {
  if (chunks.length === 0) return null
  const sorted = [...chunks].sort((a, b) => a.sequence_number - b.sequence_number)
  return sorted.find(c => c.analysis_status === 'analyzed') ?? sorted[0]!
}

export function MatchFilmDetailClient({ matchId }: { matchId: string }) {
  const [match, setMatch] = useState<FilmRoomMatchDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [synthesis, setSynthesis] = useState<MatchSynthesisV1 | null>(null)
  const [synthesisLoading, setSynthesisLoading] = useState(false)
  const [drawerSeq, setDrawerSeq] = useState<number | null>(null)
  const [activeChunk, setActiveChunk] = useState<FilmRoomChunk | null>(null)
  const [chunkVideoUrl, setChunkVideoUrl] = useState<string | null>(null)
  const [chunkVideoLoading, setChunkVideoLoading] = useState(false)
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(() => new Set())
  const [batchProgress, setBatchProgress] = useState<{
    current: number
    total: number
    sequenceNumber: number
  } | null>(null)
  const [matchAssignTitle, setMatchAssignTitle] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showAllWorkOns, setShowAllWorkOns] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const drawerPushed = useRef(false)
  const [batchBusy, setBatchBusy] = useState(false)
  const analyzingIdsRef = useRef(analyzingIds)
  const batchBusyRef = useRef(batchBusy)

  analyzingIdsRef.current = analyzingIds
  batchBusyRef.current = batchBusy

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
          if (!anyServerAnalyzing && !batchBusyRef.current) {
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
          if (
            !anyPendingActive &&
            analyzingIdsRef.current.size === 0 &&
            !batchBusyRef.current
          ) {
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
  }, [fetchMatch, loadSynthesis])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchMatch()
      .then(m => {
        if (cancelled) return
        if (m.status === 'ready' && countAnalyzed(m.match_chunks) >= 2) {
          loadSynthesis().catch(() => {})
        }
        if (m.match_chunks.some(c => c.analysis_status === 'analyzing')) {
          startPolling()
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load')
        }
      })
    return () => {
      cancelled = true
      stopPolling()
    }
    // Initial load only — avoid refetch storm when polling callbacks are recreated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId])

  useEffect(() => {
    if (!match || !PROCESSING.has(match.status)) {
      stopPolling()
      return
    }
    startPolling()
    return stopPolling
    // startPolling/stopPolling are stable; only react to pipeline status changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status, matchId])

  const openDrawer = useCallback((seq: number) => {
    setDrawerSeq(seq)
    if (!drawerPushed.current) {
      window.history.pushState({ filmDrawer: true }, '')
      drawerPushed.current = true
    }
  }, [])

  const goToSegment = useCallback(
    (seq: number, chunksList: FilmRoomChunk[]) => {
      const ch = chunksList.find(c => c.sequence_number === seq)
      if (ch) setActiveChunk(ch)
      setDrawerSeq(seq)
    },
    [],
  )

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

  const handleSegmentTap = useCallback(
    (chunk: FilmRoomChunk) => {
      setActiveChunk(chunk)
      if (chunk.analysis_status === 'analyzed') {
        openDrawer(chunk.sequence_number)
      } else if (
        chunk.analysis_status !== 'analyzing' &&
        !analyzingIds.has(chunk.id) &&
        !batchBusy
      ) {
        void runAnalyzeChunk(chunk.id)
      }
    },
    [openDrawer, analyzingIds, batchBusy, runAnalyzeChunk],
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
  const pending = pendingChunks(chunks)

  useEffect(() => {
    if (!match) return
    const list = match.match_chunks
    if (list.length === 0) {
      setActiveChunk(null)
      return
    }
    setActiveChunk(prev => {
      if (prev) {
        const updated = list.find(c => c.id === prev.id)
        if (updated) return updated
      }
      return pickDefaultActiveChunk(list)
    })
  }, [match])

  useEffect(() => {
    if (!activeChunk?.id) {
      setChunkVideoUrl(null)
      setChunkVideoLoading(false)
      return
    }
    let cancelled = false
    setChunkVideoUrl(null)
    setChunkVideoLoading(true)
    fetch(`/api/film-room/chunk/${activeChunk.id}/url`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.url) setChunkVideoUrl(data.url as string)
      })
      .catch(() => {
        if (!cancelled) setChunkVideoUrl(null)
      })
      .finally(() => {
        if (!cancelled) setChunkVideoLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeChunk?.id])

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
  const primaryWorkOn = synthesis?.work_on_list?.[0] ?? null
  const extraWorkOns = synthesis?.work_on_list?.slice(1) ?? []
  const pipelineStep = deriveUploadPipelineStep(match.status, {
    uploadComplete: true,
    firstChunkStatus:
      chunks.find(c => c.sequence_number === 0)?.analysis_status ?? null,
  })
  const stillProcessing = isMatchStillProcessing(match.status)

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
      <p style={{ fontSize: 12, color: brand.muted, margin: '0 0 16px' }}>
        {dateLabel}
        {duration > 0 && ` · ${formatDurationLong(duration)}`}
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
        <div style={{ marginBottom: 16 }}>
          <UploadProgress
            currentStep="failed"
            uploadPercent={null}
            statusError={match.status_error}
          />
          <Link
            href="/player/reels/match/new"
            style={{
              display: 'inline-block',
              marginTop: 12,
              fontSize: 13,
              fontWeight: 600,
              color: brand.tealDarkHex,
            }}
          >
            Try uploading again →
          </Link>
        </div>
      )}

      {stillProcessing && (
        <div style={{ marginBottom: 8 }}>
          <UploadProgress
            currentStep={pipelineStep === 'ready' ? 'analyzing' : pipelineStep}
            uploadPercent={null}
            statusError={null}
          />
          <p
            style={{
              fontSize: 12,
              color: brand.muted,
              lineHeight: 1.55,
              margin: '14px 0 0',
              padding: '12px 14px',
              background: brand.tealTint,
              borderRadius: 10,
            }}
          >
            You can leave this page — we&apos;ll notify you when your match is ready.
          </p>
          <Link
            href="/player/reels?tab=match-film"
            style={{
              display: 'inline-block',
              marginTop: 14,
              padding: '10px 18px',
              borderRadius: 99,
              background: brand.tealDarkHex,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Go to Match Film
          </Link>
        </div>
      )}

      {match.status === 'ready' && (
        <>
          {/* 1. Watch */}
          <MatchFilmVideoPlayer
            activeChunk={activeChunk}
            videoUrl={chunkVideoUrl}
            loading={chunkVideoLoading}
          />

          {/* 2. Coach take */}
          {analyzedCount < 2 ? (
            <MatchPlanUnlockCard
              analyzedCount={analyzedCount}
              pending={pending}
              batchBusy={batchProgress != null || batchBusy}
              onAnalyzeAll={analyzeAllRemaining}
              onAnalyzeOne={id => void runAnalyzeChunk(id)}
            />
          ) : synthesisLoading ? (
            <div style={{ padding: 16, marginBottom: 24, fontSize: 13, color: brand.muted }}>
              Building your coach take…
            </div>
          ) : showMatchPlanContent ? (
            <section style={{ marginBottom: 28 }}>
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
                Coach take
              </p>
              <h2
                style={{
                  fontFamily: fonts.serif,
                  fontSize: 22,
                  fontWeight: 500,
                  lineHeight: 1.3,
                  margin: '0 0 8px',
                  color: brand.ink,
                }}
              >
                {synthesis!.match_game_plan.theme}
              </h2>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: brand.sub,
                  margin: '0 0 16px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {synthesis!.match_game_plan.reasoning}
              </p>

              {primaryWorkOn && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    border: `0.5px solid ${brand.border}`,
                    background: brand.card,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: severityColor(
                          primaryWorkOn.severity_summary,
                          primaryWorkOn.frequency,
                        ),
                      }}
                    >
                      ×{primaryWorkOn.frequency}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: brand.ink }}>
                      {primaryWorkOn.title}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: brand.sub,
                      margin: '0 0 12px',
                      lineHeight: 1.5,
                    }}
                  >
                    {primaryWorkOn.description ?? primaryWorkOn.severity_summary}
                  </p>
                  <button
                    type="button"
                    onClick={() => setMatchAssignTitle(primaryWorkOn.title)}
                    style={{
                      width: '100%',
                      padding: '11px 16px',
                      borderRadius: 99,
                      border: 'none',
                      background: brand.tealDarkHex,
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Practice this — add drill
                  </button>
                </div>
              )}

              <p style={{ fontSize: 11, color: brand.muted, margin: 0 }}>
                From {analyzedCount} of {totalChunks} segments · AI coaching
              </p>
            </section>
          ) : null}

          {/* 3. Evidence */}
          {showMatchPlanContent && (
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
                Evidence
              </p>
              <TendencyBars sectionTitle="How the match played" rows={tendencyRows} />

              {extraWorkOns.length > 0 && (
                <div style={{ marginTop: 8, marginBottom: 8 }}>
                  {!showAllWorkOns ? (
                    <button
                      type="button"
                      onClick={() => setShowAllWorkOns(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        fontSize: 12,
                        fontWeight: 600,
                        color: brand.tealDarkHex,
                        cursor: 'pointer',
                      }}
                    >
                      See all {synthesis!.work_on_list.length} work-ons →
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {extraWorkOns.map((item, i) => (
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
                  )}
                </div>
              )}
            </section>
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
                isActive={activeChunk?.id === chunk.id}
                isAnalyzing={chunkIsAnalyzing(chunk, analyzingIds)}
                batchBusy={batchProgress != null || batchBusy}
                onTap={() => handleSegmentTap(chunk)}
              />
            ))}
          </section>

          <p style={{ fontSize: 11, color: brand.sub, margin: 0 }}>
            {analyzedCount > 0
              ? 'Tap analyzed segments to dig in'
              : 'Analyze a segment to unlock your coach take'}
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
        onPrev={() => goToSegment(Math.max(0, (drawerSeq ?? 0) - 1), chunks)}
        onNext={() =>
          goToSegment(Math.min(totalChunks - 1, (drawerSeq ?? 0) + 1), chunks)
        }
      >
        {drawerSeq !== null &&
          (chunks.find(c => c.sequence_number === drawerSeq)?.analysis_status ===
          'analyzed' ? (
            <MatchSegmentDrawerContent
              matchId={matchId}
              sequenceNumber={drawerSeq}
              onToast={msg => {
                setToast(msg)
                setTimeout(() => setToast(null), 4000)
              }}
            />
          ) : (
            <div style={{ padding: 20, fontSize: 13, color: brand.sub }}>
              This segment isn&apos;t analyzed yet. The clip is playing above — tap
              &ldquo;Analyze segment&rdquo; on the timeline when you&apos;re ready.
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
  pending,
  batchBusy,
  onAnalyzeAll,
  onAnalyzeOne,
}: {
  analyzedCount: number
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
        border: `0.5px solid ${brand.border}`,
        background: brand.card,
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
        Next step
      </p>
      <h2
        style={{
          fontFamily: fonts.serif,
          fontSize: 18,
          fontWeight: 500,
          margin: '0 0 8px',
          color: brand.ink,
        }}
      >
        {analyzedCount === 0
          ? 'Analyze your first segment'
          : 'One more segment unlocks your coach take'}
      </h2>
      <p style={{ fontSize: 13, lineHeight: 1.55, color: brand.sub, margin: '0 0 14px' }}>
        {analyzedCount === 0
          ? 'Start with segment 1. We’ll build your match plan after two segments are analyzed.'
          : 'Analyze one more segment to see your theme and primary work-on.'}
      </p>

      {firstPending && (
        <button
          type="button"
          disabled={batchBusy}
          onClick={() => onAnalyzeOne(firstPending.id)}
          style={primaryAnalyzeBtn(batchBusy)}
        >
          {analyzedCount === 0
            ? `Analyze segment ${firstPending.sequence_number + 1}`
            : `Analyze segment ${firstPending.sequence_number + 1}`}
        </button>
      )}

      {remaining > 1 && (
        <button
          type="button"
          disabled={batchBusy}
          onClick={() => onAnalyzeAll()}
          style={{
            display: 'block',
            marginTop: 10,
            width: '100%',
            background: 'none',
            border: 'none',
            padding: '8px 0',
            fontSize: 12,
            fontWeight: 600,
            color: brand.tealDarkHex,
            cursor: batchBusy ? 'default' : 'pointer',
            opacity: batchBusy ? 0.5 : 1,
          }}
        >
          Or analyze all {remaining} remaining
        </button>
      )}
    </div>
  )
}

function primaryAnalyzeBtn(disabled: boolean) {
  return {
    display: 'block',
    width: '100%',
    padding: '11px 16px',
    borderRadius: 99,
    border: 'none',
    background: disabled ? brand.muted : brand.tealDarkHex,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
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
  isActive,
  isAnalyzing,
  batchBusy,
  onTap,
}: {
  chunk: FilmRoomChunk
  isLast: boolean
  totalChunks: number
  isActive: boolean
  isAnalyzing: boolean
  batchBusy: boolean
  onTap: () => void
}) {
  const analyzed = chunk.analysis_status === 'analyzed'
  const failed = chunk.analysis_status === 'failed'
  const analysis = chunk.analysis_result
  const label = segmentHumanLabel(chunk, totalChunks)
  const pills = segmentPillTags(analysis)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!isAnalyzing && !batchBusy) onTap()
      }}
      onKeyDown={e => {
        if ((e.key === 'Enter' || e.key === ' ') && !isAnalyzing && !batchBusy) {
          e.preventDefault()
          onTap()
        }
      }}
      style={{
        display: 'flex',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        marginBottom: isLast ? 0 : 4,
        cursor: isAnalyzing || batchBusy ? 'default' : 'pointer',
        borderRadius: 8,
        padding: isActive ? '6px 6px 6px 0' : '0',
        marginLeft: isActive ? -6 : 0,
        background: isActive ? brand.tealTint : 'transparent',
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
              onClick={e => {
                e.stopPropagation()
                onTap()
              }}
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
