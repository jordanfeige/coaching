import { brand } from '@/lib/brand'
import type { MatchTendencies } from '@/lib/match-analysis/types'
import type { SynthesisTendencyRating } from '@/lib/match-analysis/synthesis-types'

export type TendencyBarRow = {
  key: string
  label: string
  value: string
  strength: number
  color: string
}

const SYNTH_LABELS: Record<string, string> = {
  forehand: 'Forehand',
  backhand: 'Backhand',
  net_play: 'Net play',
  court_coverage: 'Court coverage',
  composure: 'Composure',
}

export function synthesisTendencyColor(value: string): string {
  const v = value.toLowerCase()
  if (v === 'strong') return brand.tealDarkHex
  if (v === 'inconsistent' || v === 'avoided') return brand.warm
  if (v === 'steady') return '#888780'
  return brand.sub
}

export function qualitativeToStrength(value: string): number {
  const v = value.toLowerCase()
  if (v === 'strong') return 85
  if (v === 'steady') return 68
  if (v === 'inconsistent') return 48
  if (v === 'avoided') return 15
  return 50
}

export function synthesisTendencyRows(
  tendencies: Record<string, SynthesisTendencyRating> | undefined | null,
): TendencyBarRow[] {
  if (!tendencies) return []
  return Object.entries(tendencies)
    .filter(([, t]) => t.value !== 'not_enough_data')
    .map(([key, t]) => ({
      key,
      label: SYNTH_LABELS[key] ?? key,
      value: t.value,
      strength: t.strength ?? qualitativeToStrength(t.value),
      color: synthesisTendencyColor(t.value),
    }))
}

const CHUNK_KEY_MAP: Array<{
  key: keyof MatchTendencies
  label: string
  synthKey?: keyof typeof SYNTH_LABELS
}> = [
  { key: 'forehand_quality', label: 'Forehand' },
  { key: 'backhand_quality', label: 'Backhand' },
  { key: 'movement_recovery', label: 'Court coverage' },
  { key: 'serve_consistency', label: 'Serve' },
]

export function chunkTendencyRows(
  tendencies: MatchTendencies | undefined | null,
): TendencyBarRow[] {
  if (!tendencies) return []
  const rows: TendencyBarRow[] = []
  for (const { key, label } of CHUNK_KEY_MAP) {
    const raw = tendencies[key]
    if (!raw || raw === 'not_enough_data') continue
    const display =
      raw === 'strong'
        ? 'Strong'
        : raw === 'fast'
          ? 'Strong'
          : raw === 'mixed' || raw === 'adequate' || raw === 'inconsistent'
            ? 'Inconsistent'
            : raw === 'shallow' || raw === 'slow' || raw === 'weak'
              ? 'Avoided'
              : String(raw)
    rows.push({
      key,
      label,
      value: display,
      strength: qualitativeToStrength(display.toLowerCase()),
      color: synthesisTendencyColor(display.toLowerCase()),
    })
  }
  return rows
}

/** Net play proxy from work-on / what-worked titles when no net field on chunk. */
export function inferNetPlayRow(analysis: {
  work_on_top_three?: Array<{ title: string }>
  what_worked?: Array<{ observation: string }>
} | null): TendencyBarRow | null {
  if (!analysis) return null
  const text = [
    ...(analysis.work_on_top_three?.map(w => w.title) ?? []),
    ...(analysis.what_worked?.map(w => w.observation) ?? []),
  ]
    .join(' ')
    .toLowerCase()
  if (!/net|volley|approach/.test(text)) return null
  const weak = /missed|reset|stay|back/.test(text)
  return {
    key: 'net_play',
    label: 'Net play',
    value: weak ? 'Inconsistent' : 'Strong',
    strength: weak ? 45 : 80,
    color: synthesisTendencyColor(weak ? 'inconsistent' : 'strong'),
  }
}
