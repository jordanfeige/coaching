'use client'

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { ChevronDown } from 'lucide-react'
import { brand, fonts } from '@/lib/brand'
import { formatSegmentTime } from '@/lib/film-room/format'
import {
  chunkTendencyRows,
  inferNetPlayRow,
} from '@/lib/film-room/tendency-display'
import type { MatchAnalysisV2 } from '@/lib/match-analysis/types'
import { EvidencePills } from '@/components/match-analysis/EvidencePills'
import { itemEvidence, keyMomentPhase } from '@/lib/match-analysis/evidence'
import { AssignDrillModal } from '@/components/player/reels/AssignDrillModal'
import { TendencyBars } from '@/components/player/reels/film-room/TendencyBars'

type SegmentPayload = {
  matchId: string
  chunkId: string
  sequenceNumber: number
  startSeconds: number
  endSeconds: number
  analysis: MatchAnalysisV2
  archivedRanks: number[]
}

function rankPillStyle(rank: number) {
  if (rank === 1) return { bg: '#FBEAF0', color: '#993556' }
  if (rank === 2) return { bg: brand.warmTint, color: brand.warm }
  return { bg: '#F1EFE8', color: '#444441' }
}

function momentColor(momentType: string) {
  if (momentType === 'best_point') return brand.tealDarkHex
  if (momentType === 'worst_point') return brand.warm
  return brand.sub
}

export function MatchSegmentDrawerContent({
  matchId,
  sequenceNumber,
  onToast,
}: {
  matchId: string
  sequenceNumber: number
  onToast: (message: string) => void
}) {
  const [data, setData] = useState<SegmentPayload | null>(null)
  const [archivedRanks, setArchivedRanks] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expandedRank, setExpandedRank] = useState<number | null>(1)
  const [assignRank, setAssignRank] = useState<1 | 2 | 3 | null>(null)
  const [limitsOpen, setLimitsOpen] = useState(false)

  const toggleWorkOn = useCallback((rank: number) => {
    setExpandedRank(prev => (prev === rank ? null : rank))
  }, [])

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/film-room/match/${matchId}/segment/${sequenceNumber}`,
    )
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to load segment')
    setData(json as SegmentPayload)
    setArchivedRanks(json.archivedRanks ?? [])
    setExpandedRank(1)
  }, [matchId, sequenceNumber])

  useEffect(() => {
    setData(null)
    load().catch(e => {
      setError(e instanceof Error ? e.message : 'Failed to load')
    })
  }, [load])

  const analysis = data?.analysis
  const tendencyRows = useMemo(() => {
    if (!analysis) return []
    const rows = chunkTendencyRows(analysis.tendencies)
    const net = inferNetPlayRow(analysis)
    if (net && !rows.some(r => r.key === 'net_play')) rows.push(net)
    const mental = analysis.playing_style?.mental_observations?.length ?? 0
    if (mental > 0 && !rows.some(r => r.key === 'composure')) {
      rows.push({
        key: 'composure',
        label: 'Composure',
        value: mental >= 2 ? 'Inconsistent' : 'Steady',
        strength: mental >= 2 ? 48 : 68,
        color: mental >= 2 ? brand.warm : '#888780',
      })
    }
    return rows.filter(r => r.label !== 'Serve')
  }, [analysis])

  async function archive(rank: 1 | 2 | 3) {
    if (!data) return
    const res = await fetch('/api/film-room/work-on/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchChunkId: data.chunkId, workOnRank: rank }),
    })
    if (!res.ok) {
      const j = await res.json()
      setError(j.error || 'Archive failed')
      return
    }
    setArchivedRanks(prev => (prev.includes(rank) ? prev : [...prev, rank]))
  }

  async function restore(rank: 1 | 2 | 3) {
    if (!data) return
    const res = await fetch('/api/film-room/work-on/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchChunkId: data.chunkId, workOnRank: rank }),
    })
    if (!res.ok) {
      const j = await res.json()
      setError(j.error || 'Restore failed')
      return
    }
    setArchivedRanks(prev => prev.filter(r => r !== rank))
  }

  if (error && !data) {
    return <p style={{ padding: 20, color: brand.red, fontSize: 13 }}>{error}</p>
  }

  if (!data || !analysis) {
    return <p style={{ padding: 20, color: brand.muted, fontSize: 13 }}>Loading segment…</p>
  }

  const plan = analysis.tactical_game_plan

  const unifiedMoments: Array<
    | { kind: 'work_on'; rank: number; item: (typeof analysis.work_on_top_three)[0] }
    | { kind: 'worked'; item: (typeof analysis.what_worked)[0]; index: number }
    | { kind: 'key'; item: (typeof analysis.key_moments)[0]; index: number }
  > = []

  for (const item of [...(analysis.work_on_top_three ?? [])].sort(
    (a, b) => a.rank - b.rank,
  )) {
    unifiedMoments.push({ kind: 'work_on', rank: item.rank, item })
  }
  analysis.what_worked?.forEach((item, index) => {
    unifiedMoments.push({ kind: 'worked', item, index })
  })
  analysis.key_moments?.forEach((item, index) => {
    unifiedMoments.push({ kind: 'key', item, index })
  })

  return (
    <div style={{ padding: '12px 18px 24px' }}>
      {plan && (
        <div
          style={{
            padding: '14px 14px',
            borderRadius: 12,
            background: 'linear-gradient(180deg, #E1F5EE 0%, #ffffff 100%)',
            marginBottom: 20,
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
            Segment plan
          </p>
          <h3
            style={{
              fontFamily: fonts.serif,
              fontSize: 16,
              fontWeight: 500,
              lineHeight: 1.35,
              margin: '0 0 8px',
            }}
          >
            {plan.theme}
          </h3>
          <p style={{ fontSize: 12, lineHeight: 1.55, color: brand.sub, margin: 0 }}>
            {plan.reasoning}
          </p>
        </div>
      )}

      <TendencyBars sectionTitle="How this segment played" rows={tendencyRows} />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: brand.muted,
            margin: 0,
          }}
        >
          Moments in this segment
        </p>
        <div style={{ display: 'flex', gap: 10, fontSize: 10, color: brand.sub }}>
          <span>
            <span style={{ color: '#FAC775' }}>●</span> Work on
          </span>
          <span>
            <span style={{ color: '#1D9E75' }}>●</span> Worked
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {unifiedMoments.map(entry => {
          if (entry.kind === 'work_on') {
            const item = entry.item
            const isArchived = archivedRanks.includes(item.rank)
            const isExpanded = expandedRank === item.rank
            const bar = '#FAC775'
            const pill = rankPillStyle(item.rank)
            return (
              <div
                key={`wo-${item.rank}`}
                role="button"
                tabIndex={0}
                style={{
                  display: 'flex',
                  opacity: isArchived ? 0.5 : 1,
                  cursor: 'pointer',
                }}
                onClick={() => toggleWorkOn(item.rank)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleWorkOn(item.rank)
                  }
                }}
              >
                <div style={{ width: 3, flexShrink: 0, background: bar, borderRadius: 2 }} />
                <div style={{ flex: 1, paddingLeft: 10, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        padding: '2px 6px',
                        borderRadius: 6,
                        background: pill.bg,
                        color: pill.color,
                      }}
                    >
                      {item.rank}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{item.title}</span>
                    <ChevronDown
                      size={16}
                      color={brand.muted}
                      style={{
                        flexShrink: 0,
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                      aria-hidden
                    />
                  </div>
                  {isExpanded && (
                    <>
                      <p style={{ fontSize: 12, lineHeight: 1.5, color: brand.sub, margin: '8px 0' }}>
                        {item.observation}
                      </p>
                      <div
                        style={{
                          padding: '8px 10px',
                          borderRadius: 8,
                          background: brand.lineSoft,
                          fontSize: 12,
                          lineHeight: 1.5,
                          marginBottom: 8,
                        }}
                      >
                        <strong>Do:</strong> {item.coaching_adjustment}
                      </div>
                      <EvidencePills item={item} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        {isArchived ? (
                          <button type="button" onClick={() => restore(item.rank)} style={ghostBtn}>
                            Restore
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation()
                                setAssignRank(item.rank)
                              }}
                              style={tealBtn}
                            >
                              Add drill
                            </button>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation()
                                archive(item.rank)
                              }}
                              style={ghostBtn}
                            >
                              Archive
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                  {!isExpanded && (
                    <p
                      style={{
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: brand.sub,
                        margin: '6px 0 0',
                      }}
                    >
                      {item.observation.slice(0, 120)}
                      {item.observation.length > 120 ? '…' : ''}
                    </p>
                  )}
                </div>
              </div>
            )
          }

          if (entry.kind === 'worked') {
            const item = entry.item
            return (
              <div key={`ww-${entry.index}`} style={{ display: 'flex' }}>
                <div
                  style={{ width: 3, flexShrink: 0, background: '#1D9E75', borderRadius: 2 }}
                />
                <div style={{ flex: 1, paddingLeft: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>
                    {item.observation.slice(0, 48)}
                    {item.observation.length > 48 ? '…' : ''}
                  </p>
                  <p style={{ fontSize: 12, color: brand.sub, margin: '6px 0 0', lineHeight: 1.5 }}>
                    {item.why_it_worked}
                  </p>
                </div>
              </div>
            )
          }

          const m = entry.item
          const color = momentColor(m.moment_type)
          return (
            <div key={`km-${entry.index}`} style={{ display: 'flex' }}>
              <div style={{ width: 3, flexShrink: 0, background: color, borderRadius: 2 }} />
              <div style={{ flex: 1, paddingLeft: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{m.description}</p>
                {keyMomentPhase(m) ? (
                  <span style={{ fontSize: 10, color: brand.muted }}>{keyMomentPhase(m)}</span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <p style={{ fontSize: 12, color: brand.red, marginTop: 12 }}>{error}</p>
      )}

      <button
        type="button"
        onClick={() => setLimitsOpen(o => !o)}
        style={{
          marginTop: 24,
          background: 'none',
          border: 'none',
          fontSize: 11,
          color: brand.sub,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        {limitsOpen ? '▼' : '▶'} Honest limits
      </button>
      {limitsOpen && analysis.honest_limitations && (
        <p style={{ fontSize: 12, lineHeight: 1.5, color: brand.sub, marginTop: 10 }}>
          {analysis.honest_limitations}
        </p>
      )}

      <AssignDrillModal
        open={assignRank != null}
        matchChunkId={data.chunkId}
        workOnRank={assignRank ?? 1}
        workOnTitle={
          analysis.work_on_top_three?.find(w => w.rank === assignRank)?.title ?? ''
        }
        onClose={() => setAssignRank(null)}
        onAssigned={() => {
          onToast('Drill added to Training. Find it under Training.')
          setAssignRank(null)
        }}
      />
    </div>
  )
}

const tealBtn: CSSProperties = {
  padding: '5px 10px',
  borderRadius: 8,
  border: 'none',
  background: brand.tealDarkHex,
  color: '#fff',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
}

const ghostBtn: CSSProperties = {
  padding: '5px 10px',
  borderRadius: 8,
  border: `0.5px solid ${brand.line}`,
  background: 'transparent',
  fontSize: 11,
  cursor: 'pointer',
}
