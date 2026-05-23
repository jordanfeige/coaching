export type SynthesisTendencyValue =
  | 'Strong'
  | 'Inconsistent'
  | 'Avoided'
  | 'Steady'
  | 'not_enough_data'

export type SynthesisTendencyRating = {
  value: SynthesisTendencyValue
  strength: number
}

export type MatchSynthesisTendencies = {
  forehand: SynthesisTendencyRating
  backhand: SynthesisTendencyRating
  net_play: SynthesisTendencyRating
  court_coverage: SynthesisTendencyRating
  composure: SynthesisTendencyRating
}

export type MatchSynthesisV1 = {
  match_game_plan: {
    theme: string
    reasoning: string
    what_to_do: string
  }
  tendencies?: MatchSynthesisTendencies
  recurring_themes: Array<{
    type: 'strength' | 'weakness'
    title: string
    description: string
    appears_in_segments: number[]
  }>
  work_on_list: Array<{
    title: string
    frequency: number
    total_segments: number
    severity_summary: string
    /** One-line tactical hint for match-level work-on rows. */
    description?: string
  }>
  inconsistencies_noted: string[]
  synthesis_limitations: string
}
