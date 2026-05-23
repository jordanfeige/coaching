'use client'

import { useState } from 'react'
import { brand } from '@/lib/brand'
import { EvidencePills } from '@/components/match-analysis/EvidencePills'
import { itemEvidence, keyMomentPhase } from '@/lib/match-analysis/evidence'
import {
  detectPlayerIdMismatch,
  playerDescriptionToString,
  type MatchAnalysisV2,
  type MatchTendencies,
  type ConfidenceLevel,
  type PlayerVisualDescription,
} from '@/lib/match-analysis/types'

const PLAYER_DESC_FIELDS: Array<{
  key: keyof PlayerVisualDescription
  label: string
}> = [
  { key: 'clothing', label: 'Clothing' },
  { key: 'build', label: 'Build' },
  { key: 'hair', label: 'Hair' },
  { key: 'racquet', label: 'Racquet' },
  { key: 'handedness', label: 'Handedness' },
  { key: 'other_distinguishing_features', label: 'Other features' },
]

function confidenceBadge(confidence: ConfidenceLevel) {
  const colors: Record<ConfidenceLevel, { bg: string; fg: string }> = {
    high: { bg: brand.tealTint, fg: brand.tealDarkHex },
    medium: { bg: brand.warmTint, fg: brand.warm },
    low: { bg: brand.redLight, fg: brand.red },
  }
  const c = colors[confidence]
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 99,
        background: c.bg,
        color: c.fg,
        textTransform: 'uppercase',
      }}
    >
      {confidence}
    </span>
  )
}

function Collapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          color: brand.ink,
          fontFamily: 'inherit',
        }}
      >
        {open ? '▼' : '▶'} {title}
      </button>
      {open && <div style={{ marginTop: 8 }}>{children}</div>}
    </div>
  )
}

interface MatchAnalysisResultsProps {
  analysis: MatchAnalysisV2
  playerDescriptionHint?: string
}

export function MatchAnalysisResults({
  analysis,
  playerDescriptionHint,
}: MatchAnalysisResultsProps) {
  const describedPlayer = analysis.player_identification?.described_player
  const mismatch = detectPlayerIdMismatch(
    playerDescriptionHint,
    playerDescriptionToString(describedPlayer),
  )

  const meta = analysis.match_meta
  const tendencies = analysis.tendencies
  const tactical = analysis.tactical_game_plan

  const matchContextEntries = analysis.match_context
    ? Object.entries(analysis.match_context).filter(([, v]) => v?.trim())
    : []

  const mental = analysis.playing_style?.mental_observations ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {mismatch && (
        <div
          style={{
            padding: 12,
            background: brand.warmTint,
            borderRadius: 8,
            fontSize: 13,
            color: brand.warm,
            border: `1px solid ${brand.amber}`,
          }}
        >
          <strong>Player identification check</strong>
          <p style={{ margin: '6px 0 0' }}>{mismatch}</p>
        </div>
      )}

      <section
        style={{
          padding: 14,
          borderRadius: 10,
          border: `1px solid ${brand.line}`,
          background: brand.paper,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Player identification</h3>
          {analysis.player_identification?.confidence &&
            confidenceBadge(analysis.player_identification.confidence)}
        </div>
        <p style={{ margin: '8px 0 6px', fontSize: 14, fontWeight: 600 }}>
          AI analyzed
        </p>
        {(() => {
          const raw = describedPlayer
          const visual: Partial<PlayerVisualDescription> =
            typeof raw === 'string'
              ? { other_distinguishing_features: raw }
              : (raw ?? {})
          const entries = PLAYER_DESC_FIELDS.map(({ key, label }) => {
            const value = visual[key]
            if (!value || typeof value !== 'string' || !value.trim()) return null
            return (
              <div key={key} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: brand.textMuted,
                    marginBottom: 2,
                  }}
                >
                  {label}
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45 }}>{value}</p>
              </div>
            )
          }).filter(Boolean)
          if (entries.length === 0) {
            return (
              <p style={{ margin: 0, fontSize: 13, color: brand.textMuted }}>—</p>
            )
          }
          return <>{entries}</>
        })()}
        <p style={{ margin: 0, fontSize: 12, color: brand.textMuted }}>
          Tracked throughout:{' '}
          {analysis.player_identification?.tracked_throughout ? 'yes' : 'no'}
        </p>
        {analysis.player_identification?.notes?.trim() && (
          <p style={{ margin: '8px 0 0', fontSize: 12, fontStyle: 'italic' }}>
            {analysis.player_identification.notes}
          </p>
        )}
      </section>

      {meta && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 12,
            color: brand.textSecondary,
            padding: '8px 12px',
            background: brand.lineSoft,
            borderRadius: 8,
          }}
        >
          {meta.duration_seconds != null && (
            <span>Duration: {Math.round(meta.duration_seconds / 60)} min</span>
          )}
          {meta.result && <span>Result: {meta.result}</span>}
          {meta.final_score && <span>Score: {meta.final_score}</span>}
          {meta.is_full_match_or_highlights && (
            <span>Format: {meta.is_full_match_or_highlights}</span>
          )}
        </div>
      )}

      <section>
        <p
          style={{
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            fontSize: 16,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {analysis.narrative_summary}
        </p>
      </section>

      {tactical && (
        <section
          style={{
            padding: 16,
            borderRadius: 10,
            border: `2px solid ${brand.tealDarkHex}`,
            background: brand.tealGlaze,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              color: brand.tealDarkHex,
              marginBottom: 8,
            }}
          >
            Tactical game plan
          </div>
          <h3
            style={{
              margin: '0 0 10px',
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1.35,
              color: brand.ink,
            }}
          >
            {tactical.theme}
          </h3>
          <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.55 }}>
            {tactical.reasoning}
          </p>
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: brand.card,
              border: `1px solid ${brand.line}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: brand.textMuted,
                marginBottom: 4,
              }}
            >
              What to do
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, fontWeight: 500 }}>
              {tactical.what_to_do}
            </p>
          </div>
        </section>
      )}

      {analysis.what_worked?.length > 0 && (
        <section>
          <h3 style={{ fontSize: 14, margin: '0 0 10px' }}>What worked</h3>
          {analysis.what_worked.map((item, i) => (
            <div
              key={i}
              style={{
                padding: 12,
                marginBottom: 8,
                borderRadius: 8,
                border: `1px solid ${brand.line}`,
                background: brand.tealGlaze,
              }}
            >
              <div style={{ marginBottom: 6 }}>{confidenceBadge(item.confidence)}</div>
              <p style={{ margin: '0 0 6px', fontSize: 13 }}>{item.observation}</p>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: brand.textSecondary }}>
                {item.why_it_worked}
              </p>
              <EvidencePills item={item} style={{ marginTop: 6 }} />
            </div>
          ))}
        </section>
      )}

      {analysis.work_on_top_three?.length > 0 && (
        <section>
          <h3 style={{ fontSize: 14, margin: '0 0 10px' }}>Top priorities to work on</h3>
          {analysis.work_on_top_three.map((item, i) => (
            <div
              key={i}
              style={{
                padding: 14,
                marginBottom: 10,
                borderRadius: 8,
                border: `1px solid ${brand.line}`,
                background: brand.card,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <h4 style={{ margin: 0, fontSize: 14 }}>
                  #{item.rank} {item.title}
                </h4>
                {confidenceBadge(item.confidence)}
              </div>
              <p style={{ fontSize: 11, color: brand.textMuted, margin: '4px 0 6px' }}>
                Impact: {item.impact}
              </p>
              <EvidencePills item={item} style={{ marginTop: 0, marginBottom: 10 }} />
              <LabelBlock label="Observation" text={item.observation} />
              <LabelBlock label="Interpretation" text={item.interpretation} />
              <LabelBlock label="Coaching adjustment" text={item.coaching_adjustment} />
            </div>
          ))}
        </section>
      )}

      {analysis.key_moments?.length > 0 && (
        <section>
          <h3 style={{ fontSize: 14, margin: '0 0 10px' }}>Key moments</h3>
          {analysis.key_moments.map((m, i) => {
            const phase = keyMomentPhase(m)
            return (
              <div
                key={i}
                style={{
                  fontSize: 13,
                  marginBottom: 10,
                  paddingBottom: 10,
                  borderBottom: `1px solid ${brand.lineSoft}`,
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
                        color: brand.tealDarkHex,
                      }}
                    >
                      {phase}
                    </span>
                  ) : null}
                  <span style={{ fontSize: 11, color: brand.textMuted }}>
                    {m.moment_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <span>{m.description}</span>
              </div>
            )
          })}
        </section>
      )}

      {matchContextEntries.length > 0 && (
        <Collapsible title="Match context">
          <dl style={{ margin: 0, fontSize: 13 }}>
            {matchContextEntries.map(([key, value]) => (
              <div key={key} style={{ marginBottom: 8 }}>
                <dt style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                  {key.replace(/_/g, ' ')}
                </dt>
                <dd style={{ margin: '4px 0 0', color: brand.textSecondary }}>{value}</dd>
              </div>
            ))}
          </dl>
        </Collapsible>
      )}

      {analysis.playing_style &&
        (analysis.playing_style.archetype_summary ||
          analysis.playing_style.archetype) && (
          <section
            style={{
              padding: 12,
              borderRadius: 8,
              border: `1px solid ${brand.line}`,
            }}
          >
            <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Playing style (this match)</h3>
            {analysis.playing_style.archetype && (
              <p style={{ margin: '0 0 6px', fontSize: 13 }}>
                Archetype: {analysis.playing_style.archetype.replace(/_/g, ' ')}
                {analysis.playing_style.archetype_confidence &&
                  ` (${analysis.playing_style.archetype_confidence} confidence)`}
              </p>
            )}
            {analysis.playing_style.archetype_summary && (
              <p style={{ margin: 0, fontSize: 13 }}>{analysis.playing_style.archetype_summary}</p>
            )}
          </section>
        )}

      {mental.length > 0 && (
        <Collapsible title="Mental observations">
          {mental.map((m, i) => (
            <div key={i} style={{ marginBottom: 10, fontSize: 13 }}>
              <p style={{ margin: '0 0 4px' }}>
                <strong>Behavior:</strong> {m.behavior_observed}
              </p>
              <p style={{ margin: '0 0 4px', color: brand.textSecondary }}>
                {m.interpretation}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: brand.textMuted }}>
                {itemEvidence(m).join(' · ') || '—'} · {m.confidence}
              </p>
            </div>
          ))}
        </Collapsible>
      )}

      {tendencies && <TendenciesSection tendencies={tendencies} />}

      {analysis.honest_limitations && (
        <p style={{ fontSize: 11, color: brand.textMuted, margin: 0, lineHeight: 1.5 }}>
          <strong>Limitations:</strong> {analysis.honest_limitations}
        </p>
      )}

      <Collapsible title="Raw JSON (debug)">
        <pre
          style={{
            background: '#1e1e1e',
            color: '#eee',
            padding: 12,
            borderRadius: 8,
            overflow: 'auto',
            fontSize: 10,
            maxHeight: 400,
          }}
        >
          {JSON.stringify(analysis, null, 2)}
        </pre>
      </Collapsible>
    </div>
  )
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

function tendencyChipStyle(value: string): { bg: string; fg: string } {
  if (value === 'not_enough_data') {
    return { bg: brand.lineSoft, fg: brand.textMuted }
  }
  if (
    value === 'strong' ||
    value === 'fast'
  ) {
    return { bg: brand.tealTint, fg: brand.tealDarkHex }
  }
  if (
    value === 'mixed' ||
    value === 'adequate' ||
    value === 'inconsistent'
  ) {
    return { bg: brand.warmTint, fg: brand.warm }
  }
  return { bg: brand.redLight, fg: brand.red }
}

function TendenciesSection({ tendencies }: { tendencies: MatchTendencies }) {
  const chips = TENDENCY_ROWS.map(({ key, label }) => {
    const value = tendencies[key]
    if (!value || value === 'not_enough_data') return null
    const style = tendencyChipStyle(value)
    return (
      <div
        key={key}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          minWidth: 88,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 600, color: brand.textMuted }}>
          {label}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 99,
            background: style.bg,
            color: style.fg,
            textTransform: 'capitalize',
            width: 'fit-content',
          }}
        >
          {value.replace(/_/g, ' ')}
        </span>
      </div>
    )
  }).filter(Boolean)

  if (chips.length === 0 && !tendencies.error_pattern?.trim()) return null

  return (
    <section>
      <h3 style={{ fontSize: 14, margin: '0 0 10px' }}>Tendencies</h3>
      {chips.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${brand.line}`,
            background: brand.paper,
          }}
        >
          {chips}
        </div>
      )}
      {tendencies.error_pattern?.trim() && (
        <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.5, color: brand.textSecondary }}>
          {tendencies.error_pattern}
        </p>
      )}
    </section>
  )
}

function LabelBlock({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: brand.textMuted,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45 }}>{text}</p>
    </div>
  )
}
