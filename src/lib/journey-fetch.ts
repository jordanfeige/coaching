// Server-side fetcher that assembles everything the journey page needs.

import type { SupabaseClient } from '@supabase/supabase-js'
import { TIERS, WEIGHTS_VERSION, type JourneyBreakdown } from './journey-score'
import type { JourneyMilestone } from './journey-types'

export interface JourneyPageData {
  player: {
    id: string
    name: string
    sport: string
    classYear: string | null
    tier: string
    nextTier: string | null
    tierProgress: number
    journeyRating: number
    ratingDelta: number
    pointsToNextTier: number
  }
  categories: JourneyBreakdown['categories']
  milestones: JourneyMilestone[]
  events: {
    id: string
    event_type: string
    category: string | null
    label: string
    before_value: string | null
    after_value: string | null
    delta_score: number | null
    created_at: string
  }[]
  inputs: {
    category: string
    input_key: string
    value_numeric: number | null
    value_text: string | null
    unit: string | null
    source: string
    verified: boolean
    captured_at: string
  }[]
  weightsVersion: string
  isEmpty: boolean
  utrSingles: number | null
}

const MILESTONE_DETAILS: Record<
  (typeof TIERS)[number]['key'],
  { done: string; active: string; locked: string }
> = {
  developing: {
    done: 'Foundation established',
    active: 'Building your first verified signals',
    locked: 'Start adding UTR and academic data',
  },
  regional: {
    done: 'Regional Prospect tier reached',
    active: 'On track toward Verified Prospect',
    locked: 'Unlocks at Journey Rating 30',
  },
  verified: {
    done: 'Verified Prospect — coaches take notice',
    active: 'Close gaps in academics and exposure',
    locked: 'Unlocks at Journey Rating 50',
  },
  d2d3_ready: {
    done: 'D2/D3 Ready — roster-competitive profile',
    active: 'Push UTR and tournament schedule',
    locked: 'Unlocks at Journey Rating 65',
  },
  d1_prospect: {
    done: 'D1 Prospect — elite recruiting tier',
    active: 'Fine-tune vs D1 mid-major benchmarks',
    locked: 'Unlocks at Journey Rating 80',
  },
}

export async function fetchJourneyPageData(
  supabase: SupabaseClient,
  playerId: string,
): Promise<JourneyPageData | null> {
  const { data: player } = await supabase
    .from('players')
    .select('id, name, sport')
    .eq('id', playerId)
    .single()

  if (!player) return null

  const { data: recruiting } = await supabase
    .from('recruiting_profiles')
    .select('grad_year')
    .eq('player_id', playerId)
    .maybeSingle()

  const classYear = recruiting?.grad_year
    ? String(recruiting.grad_year)
    : null

  const { data: inputRows } = await supabase
    .from('journey_score_inputs')
    .select(
      'category, input_key, value_numeric, value_text, unit, source, verified, captured_at',
    )
    .eq('player_id', playerId)

  const utrRow = inputRows?.find(
    r => r.category === 'tennis' && r.input_key === 'utr_rating',
  )
  const utrSingles =
    utrRow?.value_numeric != null ? Number(utrRow.value_numeric) : null

  const { data: latestRating } = await supabase
    .from('journey_ratings')
    .select('*')
    .eq('player_id', playerId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestRating) {
    const firstTier = TIERS[0]
    const next = TIERS[1]
    return {
      player: {
        id: player.id,
        name: player.name ?? 'Player',
        sport: capitalizeSport(player.sport),
        classYear,
        tier: firstTier.label,
        nextTier: next?.label ?? null,
        tierProgress: 0,
        journeyRating: 0,
        ratingDelta: 0,
        pointsToNextTier: next ? next.minRating : 0,
      },
      categories: [],
      milestones: buildMilestones(0),
      events: [],
      inputs: inputRows ?? [],
      weightsVersion: WEIGHTS_VERSION,
      isEmpty: true,
      utrSingles,
    }
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: monthAgoRating } = await supabase
    .from('journey_ratings')
    .select('total')
    .eq('player_id', playerId)
    .lt('computed_at', thirtyDaysAgo.toISOString())
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: events } = await supabase
    .from('journey_score_events')
    .select(
      'id, event_type, category, label, before_value, after_value, delta_score, created_at',
    )
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(20)

  const breakdown = latestRating.breakdown as JourneyBreakdown
  const delta = monthAgoRating
    ? Number(latestRating.total) - Number(monthAgoRating.total)
    : 0

  return {
    player: {
      id: player.id,
      name: player.name ?? 'Player',
      sport: capitalizeSport(player.sport),
      classYear,
      tier: latestRating.tier,
      nextTier: nextTierAfter(latestRating.tier),
      tierProgress: Number(latestRating.tier_progress),
      journeyRating: Number(latestRating.total),
      ratingDelta: Number(delta.toFixed(1)),
      pointsToNextTier: pointsToNextTierFor(Number(latestRating.total)),
    },
    categories: breakdown.categories ?? [],
    milestones: buildMilestones(Number(latestRating.total)),
    events: events ?? [],
    inputs: inputRows ?? [],
    weightsVersion: latestRating.weights_version,
    isEmpty: false,
    utrSingles,
  }
}

export function buildMilestones(total: number): JourneyMilestone[] {
  return TIERS.map((tier, i) => {
    const next = TIERS[i + 1]
    const details = MILESTONE_DETAILS[tier.key]

    if (next && total >= next.minRating) {
      return {
        label: tier.label,
        status: 'done' as const,
        detail: details.done,
        completedAt: 'Reached',
      }
    }

    if (total >= tier.minRating && next) {
      const span = next.minRating - tier.minRating
      const progress =
        span > 0
          ? Math.min(1, (total - tier.minRating) / span)
          : 1
      return {
        label: tier.label,
        status: 'active' as const,
        detail: details.active,
        progress,
        pointsToUnlock: Math.max(0, Math.ceil(next.minRating - total)),
        viaPrompts: [
          `What do I need to reach ${next.label}?`,
          'Fastest path to unlock the next tier?',
        ],
      }
    }

    return {
      label: tier.label,
      status: 'locked' as const,
      detail: next
        ? details.locked
        : details.locked,
    }
  })
}

export function nextTierAfter(currentTier: string): string | null {
  const idx = TIERS.findIndex(t => t.label === currentTier)
  if (idx < 0 || idx >= TIERS.length - 1) return null
  return TIERS[idx + 1].label
}

export function pointsToNextTierFor(total: number): number {
  const current =
    [...TIERS].reverse().find(t => total >= t.minRating) ?? TIERS[0]
  const idx = TIERS.findIndex(t => t.key === current.key)
  const next = TIERS[idx + 1]
  if (!next) return 0
  return Math.max(0, Math.ceil(next.minRating - total))
}

function capitalizeSport(sport: string | null | undefined): string {
  if (!sport) return 'Tennis'
  return sport.charAt(0).toUpperCase() + sport.slice(1)
}
