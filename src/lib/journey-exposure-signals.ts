/** Parsed 12-month schedule signals from Exposure `inputs_used` (UTR match sync). */

export type JourneyExposureSignal = {
  key: string
  label: string
  value: string
  verified: boolean
  sourceLabel: string
}

const SIGNAL_ORDER = [
  'match_count_12mo',
  'quality_wins_12mo',
  'win_pct_12mo',
  'national_events_12mo',
  'tournament_count_12mo',
] as const

const SIGNAL_META: Record<
  (typeof SIGNAL_ORDER)[number],
  { label: string; verified: boolean; sourceLabel: string; format?: (v: string) => string }
> = {
  match_count_12mo: {
    label: 'Matches played',
    verified: true,
    sourceLabel: 'UTR API',
  },
  quality_wins_12mo: {
    label: 'Quality wins',
    verified: true,
    sourceLabel: 'UTR API',
  },
  win_pct_12mo: {
    label: 'Win rate',
    verified: true,
    sourceLabel: 'UTR API',
    format: v => `${v}%`,
  },
  national_events_12mo: {
    label: 'National / sectional events',
    verified: true,
    sourceLabel: 'UTR API',
  },
  tournament_count_12mo: {
    label: 'Sanctioned tournaments',
    verified: false,
    sourceLabel: 'Self-reported',
  },
}

export function hasMatchBasedExposureSignals(
  inputsUsed: string[] | undefined,
): boolean {
  const entry = inputsUsed?.find(s => s.startsWith('match_count_12mo:'))
  if (!entry) return false
  const count = Number(entry.split(':')[1])
  return Number.isFinite(count) && count > 0
}

export function parseExposureSignals(
  inputsUsed: string[] | undefined,
): JourneyExposureSignal[] {
  if (!inputsUsed?.length) return []

  const byKey = new Map<string, string>()
  for (const entry of inputsUsed) {
    const colon = entry.indexOf(':')
    if (colon === -1) continue
    byKey.set(entry.slice(0, colon), entry.slice(colon + 1))
  }

  const signals: JourneyExposureSignal[] = []

  for (const key of SIGNAL_ORDER) {
    const raw = byKey.get(key)
    if (raw === undefined) continue

    const meta = SIGNAL_META[key]
    const value = meta.format ? meta.format(raw) : raw

    signals.push({
      key,
      label: meta.label,
      value,
      verified: meta.verified,
      sourceLabel: meta.sourceLabel,
    })
  }

  return signals
}
