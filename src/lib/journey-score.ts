// src/lib/journey-score.ts
//
// Pure calculation function. Takes inputs + benchmarks, returns a breakdown.
// Versioned so old ratings stay calculable even if formulas change later.

export const WEIGHTS_VERSION = 'v1.1'

export const WEIGHTS = {
  tennis: 35,
  academics: 25,
  exposure: 25,
  coachability: 15,
} as const

// Bounded per-category — prevents future coach customization from gaming the score.
export const WEIGHT_BOUNDS = { min: 5, max: 60 }

export const TIERS = [
  { key: 'developing', label: 'Developing Player', minRating: 0 },
  { key: 'regional', label: 'Regional Prospect', minRating: 30 },
  { key: 'verified', label: 'Verified Prospect', minRating: 50 },
  { key: 'd2d3_ready', label: 'D2/D3 Ready', minRating: 65 },
  { key: 'd1_prospect', label: 'D1 Prospect', minRating: 80 },
] as const

export interface JourneyInput {
  category: 'tennis' | 'academics' | 'exposure' | 'coachability'
  input_key: string
  value_numeric: number | null
  value_text: string | null
  unit: string | null
  source: string
  verified: boolean
  captured_at: string
}

export interface JourneyBenchmark {
  sport: string
  division: string
  category: string
  metric: string
  value: number
  unit: string
}

export interface ScoringContext {
  targetAcademicTier?: string | null
  targetDivision?: string | null
}

const ACADEMIC_TIER_LABELS: Record<string, string> = {
  ivy: 'Ivy League',
  top_25_academic: 'Top-25 academic',
  top_100_academic: 'Top-100 academic',
  public_state: 'Public state',
  d1: 'D1',
}

export interface JourneyBreakdown {
  total: number
  tier: string
  tier_progress: number
  weights_version: string
  computed_at: string
  categories: {
    key: string
    label: string
    weight: number
    score: number
    raw_pct: number
    inputs_used: string[]
    benchmarks_used: string[]
    gap_statement: string
  }[]
}

const CATEGORY_LABELS = {
  tennis: 'Tennis Skill',
  academics: 'Academic Readiness',
  exposure: 'Exposure',
  coachability: 'Coachability',
} as const

function findBenchmark(
  benchmarks: JourneyBenchmark[],
  division: string,
  category: string,
  metric: string,
): JourneyBenchmark | null {
  return (
    benchmarks.find(
      b =>
        b.division === division &&
        b.category === category &&
        b.metric === metric,
    ) ?? null
  )
}

function findInput(
  inputs: JourneyInput[],
  category: string,
  key: string,
): JourneyInput | null {
  return inputs.find(i => i.category === category && i.input_key === key) ?? null
}

type CategoryScore = {
  raw_pct: number
  inputs_used: string[]
  benchmarks_used: string[]
  gap_statement: string
}

function scoreTennis(
  inputs: JourneyInput[],
  benchmarks: JourneyBenchmark[],
): CategoryScore {
  const utr = findInput(inputs, 'tennis', 'utr_rating')
  const bench = findBenchmark(benchmarks, 'd1_mid_major', 'utr', 'avg')
  if (!utr?.value_numeric || utr.value_numeric <= 0) {
    return {
      raw_pct: 0,
      inputs_used: [],
      benchmarks_used: [],
      gap_statement: 'No UTR rating on file',
    }
  }
  if (!bench) {
    return {
      raw_pct: 0,
      inputs_used: ['utr_rating'],
      benchmarks_used: [],
      gap_statement: 'UTR linked — benchmarks loading; refresh shortly',
    }
  }
  const pct = Math.min(1, utr.value_numeric / bench.value)
  const gap = bench.value - utr.value_numeric
  return {
    raw_pct: pct,
    inputs_used: ['utr_rating'],
    benchmarks_used: ['d1_mid_major:utr:avg'],
    gap_statement:
      gap > 0
        ? `+${gap.toFixed(2)} UTR to reach D1 mid-major roster avg`
        : 'Above D1 mid-major roster avg — your edge',
  }
}

function scoreAcademics(
  inputs: JourneyInput[],
  benchmarks: JourneyBenchmark[],
  context: ScoringContext,
): CategoryScore {
  const gpa = findInput(inputs, 'academics', 'gpa')
  const sat = findInput(inputs, 'academics', 'sat')

  const tierKey = context.targetAcademicTier ?? 'public_state'
  const tierLabel = ACADEMIC_TIER_LABELS[tierKey] ?? tierKey

  const gpaFloor =
    findBenchmark(benchmarks, tierKey, 'gpa', 'min') ??
    findBenchmark(benchmarks, 'd1', 'gpa', 'min')
  const satFloor =
    findBenchmark(benchmarks, tierKey, 'sat', 'min') ??
    findBenchmark(benchmarks, 'd1', 'sat', 'min')

  let pct = 0
  const used: string[] = []
  const benches: string[] = []
  let gap = 'Add academic data to score this category'

  if (gpa?.value_numeric && gpaFloor) {
    const gpaPct = Math.min(1, gpa.value_numeric / 4.0)
    pct += gpaPct * 0.5
    used.push('gpa')
    benches.push(`${tierKey}:gpa:min`)
    if (gpa.value_numeric >= gpaFloor.value) {
      gap = `Clears ${tierLabel} academic floor`
    } else {
      gap = `Need +${(gpaFloor.value - gpa.value_numeric).toFixed(2)} GPA to clear ${tierLabel} floor`
    }
  }

  if (sat?.value_numeric && satFloor) {
    const satPct = Math.min(1, sat.value_numeric / 1600)
    pct += satPct * 0.5
    used.push('sat')
    benches.push(`${tierKey}:sat:min`)
    if (sat.value_numeric < satFloor.value) {
      const need = Math.round(satFloor.value - sat.value_numeric)
      gap = `Need +${need} SAT to clear ${tierLabel} floor (${Math.round(satFloor.value)})`
    }
  }

  if (gpa && !gpa.verified) {
    pct *= 0.6
    gap = 'Upload transcript to unlock +6 points'
  }

  return {
    raw_pct: pct,
    inputs_used: used,
    benchmarks_used: benches,
    gap_statement: gap,
  }
}

function scoreExposure(
  inputs: JourneyInput[],
  benchmarks: JourneyBenchmark[],
): CategoryScore {
  const tournaments = findInput(inputs, 'exposure', 'sanctioned_tournaments_12mo')
  const reels = findInput(inputs, 'exposure', 'verified_reels_count')
  const bench = findBenchmark(benchmarks, 'd1_prospect', 'tournaments', 'avg')

  let pct = 0
  const used: string[] = []
  const benches: string[] = []

  if (tournaments?.value_numeric != null && bench) {
    pct += Math.min(1, tournaments.value_numeric / bench.value) * 0.7
    used.push('sanctioned_tournaments_12mo')
    benches.push('d1_prospect:tournaments:avg')
  }
  if (reels?.value_numeric != null) {
    pct += Math.min(1, reels.value_numeric / 3) * 0.3
    used.push('verified_reels_count')
  }

  let gap = 'Add tournaments and verified reels to lift Exposure'
  if (reels?.value_numeric === 0) {
    gap = 'Add verified match footage — +7 points'
  } else if (tournaments?.value_numeric != null && bench) {
    const need = Math.max(0, bench.value - tournaments.value_numeric)
    if (need > 0) gap = `${need} more tournaments to hit D1 prospect avg`
    else gap = 'Hitting D1 prospect schedule strength'
  }

  return {
    raw_pct: pct,
    inputs_used: used,
    benchmarks_used: benches,
    gap_statement: gap,
  }
}

function scoreCoachability(inputs: JourneyInput[]): CategoryScore {
  const velocity = findInput(inputs, 'coachability', 'technique_velocity_90d')
  const resolutionSpeed = findInput(
    inputs,
    'coachability',
    'issue_resolution_avg_sessions',
  )
  const sessions = findInput(inputs, 'coachability', 'sessions_90d')

  let pct = 0
  const used: string[] = []

  if (velocity?.value_numeric != null) {
    pct += Math.min(1, Math.max(0, velocity.value_numeric) / 20) * 0.5
    used.push('technique_velocity_90d')
  }
  if (resolutionSpeed?.value_numeric != null) {
    pct += Math.max(0, Math.min(1, (6 - resolutionSpeed.value_numeric) / 5)) * 0.3
    used.push('issue_resolution_avg_sessions')
  }
  if (sessions?.value_numeric != null) {
    pct += Math.min(1, sessions.value_numeric / 8) * 0.2
    used.push('sessions_90d')
  }

  const gap =
    pct > 0.8
      ? 'Top of Playvia distribution — this is your edge'
      : pct > 0.5
        ? 'Solid improvement velocity — keep stacking sessions'
        : 'Run more sessions to build coachability signal'

  return {
    raw_pct: pct,
    inputs_used: used,
    benchmarks_used: [],
    gap_statement: gap,
  }
}

export function calculateJourneyRating(
  inputs: JourneyInput[],
  benchmarks: JourneyBenchmark[],
  context: ScoringContext = {},
  computedAt: Date = new Date(),
): JourneyBreakdown {
  const tennis = scoreTennis(inputs, benchmarks)
  const academics = scoreAcademics(inputs, benchmarks, context)
  const exposure = scoreExposure(inputs, benchmarks)
  const coachability = scoreCoachability(inputs)

  const categories = [
    {
      key: 'tennis',
      label: CATEGORY_LABELS.tennis,
      weight: WEIGHTS.tennis,
      ...tennis,
    },
    {
      key: 'academics',
      label: CATEGORY_LABELS.academics,
      weight: WEIGHTS.academics,
      ...academics,
    },
    {
      key: 'exposure',
      label: CATEGORY_LABELS.exposure,
      weight: WEIGHTS.exposure,
      ...exposure,
    },
    {
      key: 'coachability',
      label: CATEGORY_LABELS.coachability,
      weight: WEIGHTS.coachability,
      ...coachability,
    },
  ].map(c => ({
    ...c,
    score: Number((c.raw_pct * c.weight).toFixed(2)),
  }))

  const total = Number(
    categories.reduce((sum, c) => sum + c.score, 0).toFixed(2),
  )

  const tier = [...TIERS].reverse().find(t => total >= t.minRating) ?? TIERS[0]
  const nextTierIdx = TIERS.findIndex(t => t.key === tier.key) + 1
  const nextTier = TIERS[nextTierIdx] ?? null
  const tier_progress = nextTier
    ? Math.min(
        1,
        (total - tier.minRating) / (nextTier.minRating - tier.minRating),
      )
    : 1

  return {
    total,
    tier: tier.label,
    tier_progress: Number(tier_progress.toFixed(3)),
    weights_version: WEIGHTS_VERSION,
    computed_at: computedAt.toISOString(),
    categories,
  }
}
