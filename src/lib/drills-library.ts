export type LibraryDrillSource =
  | 'curated_playvia_v1'
  | 'player'
  | 'coach'
  | 'ai_generated'

export type LibraryDrillRow = {
  id: string
  slug: string | null
  name: string
  primary_category: string
  drill_type: string | null
  checkpoints: string[] | null
  skill_level: string
  bracket_recommendation: string | null
  utr_recommendation: string | null
  duration_minutes: number
  mode: string
  requires: string[] | null
  description: string
  steps: string[] | null
  success_criteria: string | null
  coaching_cue: string | null
  source: string
  source_attribution: string | null
  created_by_player_id: string | null
  created_by_coach_id: string | null
  is_public: boolean
}

export type CustomDrillPayload = {
  name: string
  primary_category: string
  drill_type?: string | null
  checkpoints?: string[]
  skill_level: string
  duration_minutes: number
  mode: string
  requires?: string[]
  description: string
  steps: string[]
  success_criteria?: string | null
  coaching_cue?: string | null
}

export const DRILL_CATEGORIES = [
  'Forehand',
  'Backhand',
  'Serve',
  'Volley',
  'Footwork',
  'Match Play',
  'Mental',
] as const

export const DRILL_SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const

export const DRILL_MODES = ['solo', 'partner', 'coach_feed'] as const

export function mapCheckpointToCategory(checkpoint: string): string {
  const map: Record<string, string> = {
    grip: 'Forehand',
    ready_position: 'Footwork',
    unit_turn: 'Forehand',
    takeback: 'Forehand',
    swing_path: 'Forehand',
    contact_point: 'Forehand',
    follow_through: 'Forehand',
    footwork: 'Footwork',
    head_position: 'Mental',
    recovery: 'Footwork',
    toss: 'Serve',
    pronation: 'Serve',
    split_step: 'Footwork',
    volley_contact: 'Volley',
  }
  return map[checkpoint] ?? 'Forehand'
}

export function formatDrillAssignmentDescription(
  lib: Pick<
    LibraryDrillRow,
    'description' | 'duration_minutes' | 'primary_category' | 'coaching_cue' | 'steps'
  >,
): string {
  const cue = lib.coaching_cue ? ` Cue: ${lib.coaching_cue}` : ''
  const steps =
    lib.steps && lib.steps.length > 0
      ? ` Steps: ${lib.steps.slice(0, 3).join(' · ')}`
      : ''
  return `${lib.description} · ${lib.duration_minutes} min · ${lib.primary_category}.${cue}${steps}`.trim()
}

export function slugifyDrillName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 50) +
    '-' +
    Date.now()
  )
}

export function sanitizeSearchQuery(query: string): string {
  return query.replace(/[%_,]/g, ' ').trim().slice(0, 80)
}
