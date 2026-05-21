// src/lib/journey-score.ts
//
// Pure calculation function. Takes inputs + benchmarks, returns a breakdown.
// Versioned so old ratings stay calculable even if formulas change later.

export const WEIGHTS_VERSION = 'v1.2'

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

/** Row shape from `match_results` used by Exposure scoring. */
export interface MatchResult {
  match_date: string
  event_id: string | null
  event_level: string | null
  opponent_utr_at_time: number | null
  result: 'W' | 'L'
}

const DIVISION_UTR_DEFAULTS: Record<string, number> = {
  d1_power: 13,
  d1_mid_major: 11,
  d2: 9,
  d3: 7,
  naia: 7,
  juco: 6,
}

function getDivisionBenchmarkUtr(
  benchmarks: JourneyBenchmark[],
  division: string,
): number {
  const b =
    benchmarks.find(
      x =>
        x.division === division &&
        x.category === 'utr' &&
        x.metric === 'avg',
    ) ??
    benchmarks.find(
      x =>
        x.division === division &&
        x.category === 'tennis' &&
        x.metric === 'avg',
    )
  return b?.value ?? DIVISION_UTR_DEFAULTS[division] ?? 8
}

function normalizeTargetDivision(
  raw: string | null | undefined,
): string {
  if (!raw || raw === 'not_sure') return 'd1_mid_major'
  return raw
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

function scoreExposureLegacy(
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

function scoreExposure(
  inputs: JourneyInput[],
  matches: MatchResult[],
  benchmarks: JourneyBenchmark[],
  context: ScoringContext,
): CategoryScore {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 12)
  const recentMatches = matches.filter(
    m => new Date(m.match_date) >= cutoff,
  )

  const tournamentInput = findInput(
    inputs,
    'exposure',
    'sanctioned_tournaments_12mo',
  )
  const tournamentCount = tournamentInput?.value_numeric ?? 0
  const reels = findInput(inputs, 'exposure', 'verified_reels_count')

  if (recentMatches.length === 0) {
    const legacy = scoreExposureLegacy(inputs, benchmarks)
    return {
      ...legacy,
      inputs_used: [
        ...legacy.inputs_used,
        `tournament_count_12mo:${tournamentCount}`,
        'match_count_12mo:0',
      ],
    }
  }

  const targetDivision = normalizeTargetDivision(context.targetDivision)
  const benchmarkUtr = getDivisionBenchmarkUtr(benchmarks, targetDivision)

  const totalMatches = recentMatches.length
  const wins = recentMatches.filter(m => m.result === 'W')
  const winPct = totalMatches > 0 ? wins.length / totalMatches : 0

  const qualityWins = wins.filter(
    m =>
      m.opponent_utr_at_time != null &&
      m.opponent_utr_at_time >= benchmarkUtr,
  ).length

  const nationalEvents = new Set(
    recentMatches
      .filter(m =>
        ['national', 'sectional', 'itf', 'college'].includes(
          m.event_level ?? '',
        ),
      )
      .map(m => m.event_id ?? m.match_date),
  ).size

  const volumeScore = Math.min(8, (totalMatches / 30) * 8)
  const qualityScore = Math.min(10, (qualityWins / 5) * 10)
  const eventScore = Math.min(4, (nationalEvents / 4) * 4)
  const winPctScore = Math.min(3, Math.max(0, ((winPct - 0.4) / 0.2) * 3))

  let matchPoints = volumeScore + qualityScore + eventScore + winPctScore

  // Secondary: sanctioned tournament count (up to 2 pts when matches exist)
  const tourBench = findBenchmark(benchmarks, 'd1_prospect', 'tournaments', 'avg')
  if (tournamentCount > 0 && tourBench) {
    matchPoints += Math.min(2, (tournamentCount / tourBench.value) * 2)
  }

  const total = Math.max(0, Math.min(25, matchPoints))
  const raw_pct = total / 25

  let gapStatement = ''
  if (qualityScore < 5) {
    const needed = Math.max(1, Math.ceil(5 - qualityWins))
    gapStatement = `+${needed} win${needed > 1 ? 's' : ''} vs UTR ${benchmarkUtr.toFixed(1)}+ to close Exposure gap`
  } else if (volumeScore < 6) {
    gapStatement = `Play ${Math.ceil(30 - totalMatches)} more matches in next 12mo`
  } else if (eventScore < 3) {
    gapStatement = 'Enter 1 more national/sectional event'
  } else {
    gapStatement = `Maintain win rate vs UTR ${benchmarkUtr.toFixed(1)}+ opponents`
  }

  if (reels?.value_numeric === 0) {
    gapStatement = 'Add verified match footage — +7 points'
  }

  const used = [
    `match_count_12mo:${totalMatches}`,
    `quality_wins_12mo:${qualityWins}`,
    `national_events_12mo:${nationalEvents}`,
    `win_pct_12mo:${Math.round(winPct * 100)}`,
    `tournament_count_12mo:${tournamentCount}`,
  ]
  if (tournamentCount > 0) used.push('sanctioned_tournaments_12mo')
  if (reels?.value_numeric != null) used.push('verified_reels_count')

  return {
    raw_pct,
    inputs_used: used,
    benchmarks_used: [`${targetDivision}:utr:avg`],
    gap_statement: gapStatement,
  }
}

/** M6: 4 signals — 5 + 4 + 3 + 3 = 15 pts max (category weight 15%). */
function scoreCoachability(inputs: JourneyInput[]): CategoryScore {
  const improvement = findInput(inputs, 'coachability', 'improvement_pts_90d')
  const drill = findInput(inputs, 'coachability', 'drill_pts_90d')
  const lesson = findInput(inputs, 'coachability', 'lesson_pts_90d')
  const reel = findInput(inputs, 'coachability', 'reel_pts_90d')

  const impPts = Math.min(5, Math.max(0, Number(improvement?.value_numeric ?? 0)))
  const drillPts = Math.min(4, Math.max(0, Number(drill?.value_numeric ?? 0)))
  const lessonPts = Math.min(3, Math.max(0, Number(lesson?.value_numeric ?? 0)))
  const reelPts = Math.min(3, Math.max(0, Number(reel?.value_numeric ?? 0)))

  const totalPts = Math.min(15, impPts + drillPts + lessonPts + reelPts)
  const raw_pct = totalPts / 15

  const used: string[] = []
  if (improvement) used.push('improvement_pts_90d')
  if (drill) used.push('drill_pts_90d')
  if (lesson) used.push('lesson_pts_90d')
  if (reel) used.push('reel_pts_90d')

  const gap =
    raw_pct >= 0.8
      ? 'Top of Playvia distribution — this is your edge'
      : raw_pct >= 0.5
        ? 'Solid engagement — keep stacking sessions and drills'
        : totalPts > 0
          ? 'Building coachability signal — more reels and drills help'
          : 'Run more sessions to build coachability signal'

  return {
    raw_pct,
    inputs_used: used,
    benchmarks_used: [],
    gap_statement: gap,
  }
}

export function calculateJourneyRating(
  inputs: JourneyInput[],
  benchmarks: JourneyBenchmark[],
  matches: MatchResult[] = [],
  context: ScoringContext = {},
  computedAt: Date = new Date(),
): JourneyBreakdown {
  const tennis = scoreTennis(inputs, benchmarks)
  const academics = scoreAcademics(inputs, benchmarks, context)
  const exposure = scoreExposure(inputs, matches, benchmarks, context)
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
