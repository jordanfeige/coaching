'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { brand } from '@/lib/brand'
import { formatSegmentTime } from '@/lib/film-room/format'
import type {
  ConfidenceLevel,
  MatchAnalysisV2,
  MatchTendencies,
} from '@/lib/match-analysis/types'
import { AssignDrillModal } from '@/components/player/reels/AssignDrillModal'
import { useAskVia } from '@/components/player/ask-via/AskViaContext'
import { EvidencePills } from '@/components/match-analysis/EvidencePills'
import { itemEvidence, keyMomentPhase } from '@/lib/match-analysis/evidence'

type SegmentPayload = {
  matchId: string
  chunkId: string
  sequenceNumber: number
  startSeconds: number
  endSeconds: number
  opponentName: string | null
  dateLabel: string
  analysis: MatchAnalysisV2
  archivedRanks: number[]
}

function rankPillStyle(rank: number) {
  if (rank === 1) return { bg: '#FBEAF0', color: '#993556' }
  if (rank === 2) return { bg: brand.warmTint, color: brand.warm }
  return { bg: '#F1EFE8', color: '#444441' }
}

function sectionLabel(text: string) {
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

function momentTimestampColor(momentType: string) {
  if (momentType === 'best_point') return brand.tealDarkHex
  if (momentType === 'worst_point') return brand.red
  return brand.sub
}

function tendencyColor(value: string) {
  if (value === 'not_enough_data') return brand.muted
  if (value === 'strong' || value === 'fast') return brand.tealDarkHex
  if (['mixed', 'adequate', 'inconsistent'].includes(value)) return brand.warm
  return brand.red
}

const TENDENCY_ROWS: Array<{
  key: keyof Omit<MatchTendencies, 'error_pattern'>
  label: string
}> = [
  { key: 'serve_consistency', label: 'Serve' },
  { key: 'forehand_quality', label: 'Forehand' },
  { key: 'backhand_quality', label: 'Backhand' },
  { key: 'baseline_depth', label: 'Depth' },
  { key: 'movement_recovery', label: 'Recovery' },
]

export function MatchSegmentClient({
  matchId,
  sequenceNumber,
  variant = 'page',
}: {
  matchId: string
  sequenceNumber: number
  /** `drawer` = embedded in FilmRoomSideDrawer on match detail (no page chrome). */
  variant?: 'page' | 'drawer'
}) {
  const { askVia } = useAskVia()
  const [data, setData] = useState<SegmentPayload | null>(null)
  const [archivedRanks, setArchivedRanks] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [assignRank, setAssignRank] = useState<1 | 2 | 3 | null>(null)
  const [mentalOpen, setMentalOpen] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/film-room/match/${matchId}/segment/${sequenceNumber}`,
    )
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to load segment')
    setData(json as SegmentPayload)
    setArchivedRanks(json.archivedRanks ?? [])
  }, [matchId, sequenceNumber])

  useEffect(() => {
    load().catch(e => {
      setError(e instanceof Error ? e.message : 'Failed to load')
    })
  }, [load])

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

  const workOnSorted = useMemo(() => {
    if (!data?.analysis.work_on_top_three) return []
    const items = [...data.analysis.work_on_top_three].sort((a, b) => a.rank - b.rank)
    const active = items.filter(i => !archivedRanks.includes(i.rank))
    const archived = items.filter(i => archivedRanks.includes(i.rank))
    return [...active, ...archived]
  }, [data, archivedRanks])

  const archivedCount = archivedRanks.length

  const pad = variant === 'drawer' ? '16px 20px 32px' : '12px 16px 80px'

  if (error && !data) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: brand.red }}>{error}</p>
        {variant === 'page' && (
          <Link href={`/player/reels/match/${matchId}`}>← Back to match</Link>
        )}
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: 24, color: brand.muted }}>Loading segment…</div>
    )
  }

  const analysis = data.analysis
  const plan = analysis.tactical_game_plan
  const opponent = data.opponentName ? `vs ${data.opponentName}` : 'Match'
  const mental = analysis.playing_style?.mental_observations ?? []
  const tendencies = analysis.tendencies

  const visibleWorkOn = showArchived
    ? workOnSorted
    : workOnSorted.filter(i => !archivedRanks.includes(i.rank))

  return (
    <div
      style={{
        padding: pad,
        maxWidth: variant === 'page' ? 720 : undefined,
        margin: variant === 'page' ? '0 auto' : undefined,
      }}
    >
      {variant === 'page' && (
        <>
          <Link
            href={`/player/reels/match/${matchId}`}
            style={{ fontSize: 13, color: brand.tealDarkHex, textDecoration: 'none' }}
          >
            ← {opponent}
          </Link>

          <h1
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 20,
              fontWeight: 500,
              margin: '10px 0 2px',
            }}
          >
            Segment {data.sequenceNumber + 1} · {formatSegmentTime(data.startSeconds)}—
            {formatSegmentTime(data.endSeconds)}
          </h1>
          {data.dateLabel && (
            <p style={{ fontSize: 12, color: brand.muted, margin: '0 0 20px' }}>
              {data.dateLabel}
            </p>
          )}
        </>
      )}
      {variant === 'drawer' && data.dateLabel && (
        <p style={{ fontSize: 12, color: brand.muted, margin: '0 0 16px' }}>{data.dateLabel}</p>
      )}

      {plan && (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            background: brand.tealGlaze,
            border: `0.5px solid ${brand.tealTint}`,
            marginBottom: 20,
          }}
        >
          {sectionLabel('Game plan')}
          <h2
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 18,
              fontWeight: 500,
              margin: '0 0 10px',
              lineHeight: 1.3,
            }}
          >
            {plan.theme}
          </h2>
          <p style={{ fontSize: 13, lineHeight: 1.55, margin: '0 0 10px' }}>{plan.reasoning}</p>
          <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0 }}>
            <strong>What to do:</strong> {plan.what_to_do}
          </p>
        </div>
      )}

      {analysis.narrative_summary && (
        <blockquote
          style={{
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            fontSize: 15,
            lineHeight: 1.6,
            margin: '0 0 24px',
            paddingLeft: 14,
            borderLeft: `3px solid ${brand.teal}`,
            color: brand.ink,
          }}
        >
          {analysis.narrative_summary}
        </blockquote>
      )}

      {visibleWorkOn.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          {sectionLabel('Top priorities')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleWorkOn.map(item => {
              const isArchived = archivedRanks.includes(item.rank)
              const pill = rankPillStyle(item.rank)
              return (
                <div
                  key={item.rank}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    border: `0.5px solid ${brand.line}`,
                    background: brand.card,
                    opacity: isArchived ? 0.55 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
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
                    <span style={{ fontSize: 10, fontWeight: 600, color: brand.muted, textTransform: 'uppercase' }}>
                      {item.impact}
                    </span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{item.title}</span>
                  </div>
                  <OicBlock label="OBS" text={item.observation} />
                  <OicBlock label="WHY" text={item.interpretation} />
                  <OicBlock label="DO" text={item.coaching_adjustment} />
                  <EvidencePills item={item} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    {isArchived ? (
                      <button
                        type="button"
                        onClick={() => restore(item.rank)}
                        style={ghostButtonStyle()}
                      >
                        Restore
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setAssignRank(item.rank)}
                          style={primaryButtonStyle()}
                        >
                          Assign drill
                        </button>
                        <button
                          type="button"
                          onClick={() => archive(item.rank)}
                          style={ghostButtonStyle()}
                        >
                          Archive
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {archivedCount > 0 && !showArchived && (
            <button
              type="button"
              onClick={() => setShowArchived(true)}
              style={{
                marginTop: 10,
                background: 'none',
                border: 'none',
                fontSize: 12,
                color: brand.tealDarkHex,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {archivedCount} archived — show
            </button>
          )}
        </section>
      )}

      {analysis.what_worked?.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          {sectionLabel('What worked')}
          {analysis.what_worked.map((item, i) => (
            <div
              key={i}
              style={{
                padding: 12,
                marginBottom: 8,
                borderRadius: 8,
                borderLeft: `3px solid ${brand.tealHex}`,
                background: brand.tealGlaze,
              }}
            >
              <span
                style={{
                  float: 'right',
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: brand.muted,
                }}
              >
                {item.confidence}
              </span>
              <p style={{ fontSize: 13, margin: '0 0 6px', clear: 'right' }}>{item.observation}</p>
              <p style={{ fontSize: 12, color: brand.sub, margin: '0 0 6px' }}>
                {item.why_it_worked}
              </p>
              <EvidencePills item={item} style={{ marginTop: 6 }} />
            </div>
          ))}
        </section>
      )}

      {analysis.key_moments?.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          {sectionLabel('Key moments')}
          {analysis.key_moments.map((m, i) => {
            const phase = keyMomentPhase(m)
            return (
              <div
                key={i}
                style={{
                  fontSize: 13,
                  marginBottom: 12,
                  lineHeight: 1.45,
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                  {phase ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: brand.lineSoft,
                        color: momentTimestampColor(m.moment_type),
                      }}
                    >
                      {phase}
                    </span>
                  ) : null}
                  <span style={{ fontSize: 11, color: brand.muted }}>
                    {m.moment_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <span>{m.description}</span>
              </div>
            )
          })}
        </section>
      )}

      {tendencies && (
        <section style={{ marginBottom: 24 }}>
          {sectionLabel('Tendencies')}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8,
            }}
          >
            {TENDENCY_ROWS.map(({ key, label }) => {
              const value = tendencies[key]
              if (value === 'not_enough_data') return null
              return (
                <div
                  key={key}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: `0.5px solid ${brand.line}`,
                    background: brand.card,
                  }}
                >
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: brand.muted }}>
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginTop: 4,
                      color: tendencyColor(value),
                      textTransform: 'capitalize',
                    }}
                  >
                    {value.replace(/_/g, ' ')}
                  </div>
                </div>
              )
            })}
          </div>
          {tendencies.error_pattern && (
            <p style={{ fontSize: 12, marginTop: 10, color: brand.sub }}>
              <strong>Error pattern:</strong> {tendencies.error_pattern}
            </p>
          )}
        </section>
      )}

      {mental.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => setMentalOpen(o => !o)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: brand.muted,
              cursor: 'pointer',
            }}
          >
            {mentalOpen ? '▼' : '▶'} Mental observations
          </button>
          {mentalOpen &&
            mental.map((m, i) => (
              <div key={i} style={{ marginTop: 10, fontSize: 13 }}>
                <p style={{ margin: '0 0 4px' }}>{m.behavior_observed}</p>
                <p style={{ margin: '0 0 4px', color: brand.sub }}>{m.interpretation}</p>
                <p style={{ margin: 0, fontSize: 11, color: brand.muted }}>
                  {itemEvidence(m).join(' · ') || '—'} · {m.confidence as ConfidenceLevel}
                </p>
              </div>
            ))}
        </section>
      )}

      {analysis.honest_limitations && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: brand.lineSoft,
            marginBottom: 24,
          }}
        >
          {sectionLabel("What this view can and can't see")}
          <p style={{ fontSize: 12, lineHeight: 1.5, margin: 0, color: brand.sub }}>
            {analysis.honest_limitations}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          askVia({
            prompt: `Help me understand segment ${data.sequenceNumber + 1} of my match analysis.`,
            context: `match:${matchId}:segment:${sequenceNumber}`,
          })
        }
        style={{
          ...primaryButtonStyle(),
          width: '100%',
          borderRadius: 99,
        }}
      >
        Ask Via about this segment
      </button>

      <AssignDrillModal
        open={assignRank != null}
        matchChunkId={data.chunkId}
        workOnRank={assignRank ?? 1}
        workOnTitle={
          analysis.work_on_top_three?.find(w => w.rank === assignRank)?.title ?? ''
        }
        onClose={() => setAssignRank(null)}
        onAssigned={() => setAssignRank(null)}
      />

      {error && (
        <p style={{ fontSize: 12, color: brand.red, marginTop: 12 }}>{error}</p>
      )}
    </div>
  )
}

function OicBlock({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.05em',
          color: brand.muted,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.45, margin: 0 }}>{text}</p>
    </div>
  )
}

function primaryButtonStyle(): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    background: brand.tealDarkHex,
    color: '#fff',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  }
}

function ghostButtonStyle(): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 8,
    border: `0.5px solid ${brand.line}`,
    background: 'transparent',
    color: brand.sub,
    fontWeight: 500,
    fontSize: 13,
    cursor: 'pointer',
  }
}
