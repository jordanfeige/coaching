import { CATEGORY_UI_META, inputDisplayName } from './journey-ui-meta'
import type { JourneyPageData } from './journey-fetch'
import type {
  CategoryKey,
  JourneyCategory,
  JourneyEvent,
  JourneyMomentum,
  JourneyPageViewModel,
  JourneyQuest,
} from './journey-types'
import { WEIGHTS } from './journey-score'

const CATEGORY_KEYS: CategoryKey[] = [
  'tennis',
  'academics',
  'exposure',
  'coachability',
]

const SOURCE_LABELS: Record<string, string> = {
  utr_api: 'UTR API',
  self_reported: 'Self-reported',
  college_board: 'College Board',
  usta_manual: 'USTA',
  playvia: 'Playvia',
  video_analysis: 'Video analysis',
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatInputValue(
  valueNumeric: number | null,
  valueText: string | null,
  unit: string | null,
): string {
  if (valueText) return valueText
  if (valueNumeric == null) return '—'
  if (unit === 'utr_points') return valueNumeric.toFixed(2)
  if (unit === 'gpa') return valueNumeric.toFixed(1)
  return String(valueNumeric)
}

function mapEvents(
  rows: JourneyPageData['events'],
): JourneyEvent[] {
  return rows
    .filter(r => r.event_type !== 'rating_recalculated')
    .slice(0, 10)
    .map(row => {
      const cat = (row.category ?? 'tier') as JourneyEvent['category']
      const delta =
        row.delta_score != null
          ? `${row.delta_score > 0 ? '+' : ''}${row.delta_score}`
          : '—'
      return {
        date: formatShortDate(row.created_at),
        label: row.label,
        change: row.after_value ?? row.before_value ?? '',
        delta,
        category: cat,
      }
    })
}

function buildCategories(data: JourneyPageData): JourneyCategory[] {
  const byKey = new Map(data.categories.map(c => [c.key, c]))
  const inputsByCategory = new Map<string, JourneyPageData['inputs']>()
  for (const row of data.inputs) {
    const list = inputsByCategory.get(row.category) ?? []
    list.push(row)
    inputsByCategory.set(row.category, list)
  }

  const scores = CATEGORY_KEYS.map(key => {
    const raw = byKey.get(key)
    return { key, score: raw?.score ?? 0 }
  })
  const maxScore = Math.max(...scores.map(s => s.score), 0)

  return CATEGORY_KEYS.map(key => {
    const raw = byKey.get(key)
    const meta = CATEGORY_UI_META[key]
    const pct = raw ? Math.round(raw.raw_pct * 100) : 0
    const catInputs = inputsByCategory.get(key) ?? []

    return {
      key,
      label: raw?.label ?? meta.shortLabel,
      shortLabel: meta.shortLabel,
      weight: raw?.weight ?? WEIGHTS[key],
      score: raw?.score ?? 0,
      pct,
      icon: meta.icon,
      tagline: meta.tagline,
      gap: raw?.gap_statement ?? 'Add data to score this category',
      isStrength: (raw?.score ?? 0) >= maxScore && maxScore > 0,
      viaPrompts: meta.viaPrompts,
      inputs: catInputs.map(inp => ({
        name: inputDisplayName(inp.input_key),
        value: formatInputValue(
          inp.value_numeric != null ? Number(inp.value_numeric) : null,
          inp.value_text,
          inp.unit,
        ),
        source: SOURCE_LABELS[inp.source] ?? inp.source,
        verified: inp.verified,
        date: formatShortDate(inp.captured_at),
      })),
    }
  })
}

function buildMomentum(
  categories: JourneyCategory[],
  classYear: string | null,
  ratingDelta: number | null,
): JourneyMomentum {
  const top = [...categories].sort((a, b) => b.score - a.score)[0]
  const classLabel = classYear ?? 'your class'

  const deltaLabel =
    ratingDelta == null
      ? '—'
      : ratingDelta > 0
        ? `+${ratingDelta.toFixed(1)}`
        : ratingDelta < 0
          ? String(ratingDelta)
          : '0'

  return {
    fastestMover: {
      name: top?.shortLabel ?? 'Coachability',
      delta: deltaLabel,
      window: '30 days',
    },
    utrPercentile: 18,
    statement:
      ratingDelta != null && ratingDelta > 0
        ? `Improving faster than most ${classLabel} prospects on Playvia`
        : `Track weekly inputs to build momentum vs ${classLabel} peers`,
  }
}

function buildQuests(
  data: JourneyPageData,
  categories: JourneyCategory[],
): JourneyQuest[] {
  const inputs = data.inputs
  const gpa = inputs.find(
    i => i.category === 'academics' && i.input_key === 'gpa',
  )
  const reels = inputs.find(
    i => i.category === 'exposure' && i.input_key === 'verified_reels_count',
  )
  const tournaments = inputs.find(
    i =>
      i.category === 'exposure' &&
      i.input_key === 'sanctioned_tournaments_12mo',
  )
  const utr = inputs.find(
    i => i.category === 'tennis' && i.input_key === 'utr_rating',
  )

  const quests: JourneyQuest[] = []

  if (gpa && !gpa.verified) {
    quests.push({
      id: 'transcript',
      icon: '📄',
      title: 'Upload official transcript',
      severity: 'critical',
      reward: 6,
      difficulty: 1,
      timeWindow: '5 min',
      desc: 'Converts your self-reported GPA into a verified academic score.',
      affects: 'Academic Readiness',
      affectsKey: 'academics',
      progress: 0,
      probability:
        'Players who verify transcripts reach Verified Prospect 2.4× faster on average',
      viaPrompts: [
        "Why does verification matter so much?",
        "What if I don't have a transcript yet?",
      ],
    })
  }

  const reelCount = reels?.value_numeric != null ? Number(reels.value_numeric) : 0
  if (reelCount < 1) {
    quests.push({
      id: 'verified-reel',
      icon: '🎥',
      title: 'Upload verified match footage',
      severity: 'critical',
      reward: 7,
      difficulty: 2,
      timeWindow: '1 week',
      desc: 'Verified reels carry far more weight than self-reported scores.',
      affects: 'Exposure',
      affectsKey: 'exposure',
      progress: 0,
      probability:
        'Profiles with verified reels see 3× more coach views in Playvia data',
      viaPrompts: [
        "How do I record a verified reel?",
        "What makes footage 'verified'?",
      ],
    })
  }

  const tCount =
    tournaments?.value_numeric != null ? Number(tournaments.value_numeric) : 0
  if (tCount < 6) {
    quests.push({
      id: 'tournaments',
      icon: '🎾',
      title: `Add ${Math.max(1, 6 - tCount)} more sanctioned tournaments`,
      severity: 'important',
      reward: 8,
      difficulty: 3,
      timeWindow: '2-3 months',
      desc: `Bring your 12-month schedule from ${tCount} → 6 events. Sectionals count double.`,
      affects: 'Exposure',
      affectsKey: 'exposure',
      progress: tCount / 6,
      probability:
        'Players with 6+ sanctioned events advance tiers 1.8× faster',
      viaPrompts: [
        'Which tournaments fit my level?',
        'Where are the closest events to me?',
      ],
    })
  }

  const utrVal = utr?.value_numeric != null ? Number(utr.value_numeric) : null
  if (utrVal != null && utrVal < 7.6) {
    quests.push({
      id: 'utr-push',
      icon: '📈',
      title: `Push UTR ${utrVal.toFixed(2)} → 7.6`,
      severity: 'important',
      reward: 5,
      difficulty: 2,
      timeWindow: '4-6 weeks',
      desc: 'Win ranked matches at the next level. Via will surface eligible matchups.',
      affects: 'Tennis Skill',
      affectsKey: 'tennis',
      progress: Math.min(1, utrVal / 7.6),
      probability: 'Closes roster gap vs D1 mid-major benchmarks',
      viaPrompts: [
        'Find me matchups at this level',
        "What's my realistic UTR ceiling this year?",
      ],
    })
  }

  if (quests.length === 0) {
    const weakest = [...categories].sort((a, b) => a.pct - b.pct)[0]
    quests.push({
      id: 'maintain',
      icon: '✓',
      title: 'Keep stacking verified signals',
      severity: 'minor',
      reward: 3,
      difficulty: 1,
      timeWindow: 'Ongoing',
      desc: `Focus on ${weakest?.label ?? 'your weakest category'} to push the rating higher.`,
      affects: weakest?.label ?? 'Journey',
      affectsKey: weakest?.key ?? 'tennis',
      progress: 0.5,
      probability: 'Consistent updates keep your tier progress moving',
      viaPrompts: ['What should I prioritize this month?'],
    })
  }

  return quests.slice(0, 4)
}

export function buildJourneyViewModel(
  data: JourneyPageData,
): JourneyPageViewModel {
  const categories = buildCategories(data)
  const classYear = data.player.classYear ?? '—'

  return {
    player: {
      name: data.player.name,
      sport: data.player.sport,
      classYear,
      tier: data.player.tier,
      nextTier: data.player.nextTier ?? data.player.tier,
      tierProgress: data.player.tierProgress,
      journeyRating: data.player.journeyRating,
      ratingDelta: data.player.ratingDelta,
      pointsToNextTier: data.player.pointsToNextTier,
    },
    categories,
    milestones: data.milestones,
    quests: buildQuests(data, categories),
    events: mapEvents(data.events),
    momentum: buildMomentum(
      categories,
      data.player.classYear,
      data.player.ratingDelta,
    ),
    weightsVersion: `${data.weightsVersion} — Playvia default`,
    isEmpty: data.isEmpty,
    utrSingles: data.utrSingles,
  }
}
