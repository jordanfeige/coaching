export type ConfidenceLevel = 'high' | 'medium' | 'low'

export type PlayerVisualDescription = {
  clothing: string
  build: string
  hair: string
  racquet: string
  handedness: string
  other_distinguishing_features: string | null
}

export type PlayerIdentification = {
  described_player: PlayerVisualDescription
  confidence: ConfidenceLevel
  tracked_throughout: boolean
  notes: string | null
}

export type TacticalGamePlan = {
  theme: string
  reasoning: string
  what_to_do: string
}

export type TendencyRating =
  | 'strong'
  | 'inconsistent'
  | 'weak'
  | 'mixed'
  | 'shallow'
  | 'fast'
  | 'adequate'
  | 'slow'
  | 'not_enough_data'

export type MatchTendencies = {
  serve_consistency: 'strong' | 'inconsistent' | 'weak' | 'not_enough_data'
  forehand_quality: 'strong' | 'mixed' | 'weak' | 'not_enough_data'
  backhand_quality: 'strong' | 'mixed' | 'weak' | 'not_enough_data'
  baseline_depth: 'strong' | 'mixed' | 'shallow' | 'not_enough_data'
  movement_recovery: 'fast' | 'adequate' | 'slow' | 'not_enough_data'
  error_pattern: string | null
}

/** Flatten visual description for mismatch checks (supports legacy string responses). */
export function playerDescriptionToString(
  described: PlayerVisualDescription | string | undefined,
): string {
  if (!described) return ''
  if (typeof described === 'string') return described
  return [
    described.clothing,
    described.build,
    described.hair,
    described.racquet,
    described.handedness,
    described.other_distinguishing_features,
  ]
    .filter((v): v is string => Boolean(v?.trim()))
    .join('. ')
}

export type MatchAnalysisV2 = {
  player_identification: PlayerIdentification

  match_meta: {
    duration_seconds: number | null
    result: 'win' | 'loss' | 'unknown'
    final_score: string | null
    is_full_match_or_highlights: 'full_match' | 'highlights' | 'unknown'
  }

  match_context?: {
    early_game_pattern?: string
    late_game_pattern?: string
    when_ahead?: string
    when_behind?: string
    under_pressure?: string
    on_big_points?: string
  }

  narrative_summary: string

  tactical_game_plan: TacticalGamePlan

  what_worked: Array<{
    observation: string
    why_it_worked: string
    /** v2.3+ phase-based references; legacy chunks may only have timestamps */
    evidence?: string[]
    timestamps?: string[]
    confidence: ConfidenceLevel
  }>

  work_on_top_three: Array<{
    rank: 1 | 2 | 3
    title: string
    observation: string
    interpretation: string
    coaching_adjustment: string
    evidence?: string[]
    timestamps?: string[]
    impact: 'high' | 'medium' | 'low'
    confidence: ConfidenceLevel
  }>

  key_moments: Array<{
    /** When in the segment (phase-based); legacy chunks may use timestamp */
    phase?: string
    timestamp?: string
    moment_type:
      | 'turning_point'
      | 'break_point'
      | 'set_point'
      | 'pattern_shift'
      | 'mental_moment'
      | 'best_point'
      | 'worst_point'
    description: string
  }>

  playing_style?: {
    archetype?:
      | 'baseliner'
      | 'counterpuncher'
      | 'aggressive_baseliner'
      | 'all_court'
      | 'serve_and_volley'
      | 'pusher'
      | 'mixed'
      | null
    archetype_confidence?: ConfidenceLevel
    archetype_summary?: string
    mental_observations?: Array<{
      behavior_observed: string
      interpretation: string
      evidence: string[]
      timestamps?: string[]
      confidence: ConfidenceLevel
    }>
  }

  tendencies?: MatchTendencies

  honest_limitations: string
}

export type PlayerIdentificationInput = {
  referenceFrameDataUrl: string
  tapXPercent: number
  tapYPercent: number
  frameCapturedAtSeconds: number
  playerDescriptionHint?: string
}

export type GeminiUsageMetadata = {
  promptTokenCount?: number
  candidatesTokenCount?: number
  totalTokenCount?: number
}

/** Rough USD estimate — verify against Google Cloud billing. */
export function computeEstimatedCostUsd(
  usage: GeminiUsageMetadata | undefined,
): number {
  if (!usage) return 0

  const inputCostPer1M = 0.075
  const outputCostPer1M = 0.3

  const inputCost =
    ((usage.promptTokenCount ?? 0) / 1_000_000) * inputCostPer1M
  const outputCost =
    ((usage.candidatesTokenCount ?? 0) / 1_000_000) * outputCostPer1M

  return inputCost + outputCost
}

/** Non-blocking warning when user's hint doesn't match AI description. */
export function detectPlayerIdMismatch(
  hint: string | undefined,
  describedPlayer: string,
): string | null {
  const trimmed = hint?.trim()
  if (!trimmed) return null

  const hintWords = trimmed
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 3)
    .filter(w => !['player', 'wearing', 'shirt', 'shorts', 'with'].includes(w))

  if (hintWords.length < 2) return null

  const desc = describedPlayer.toLowerCase()
  const matches = hintWords.filter(w => desc.includes(w))

  if (matches.length === 0) {
    return `You described yourself as "${trimmed}" but the AI identified: "${describedPlayer}". Confirm this is the player you tapped.`
  }

  return null
}
