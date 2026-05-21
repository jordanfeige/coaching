import type { MatchBucket } from '@/lib/college-matching'

export const NON_RECRUITING_GOALS = new Set([
  'improve_have_fun',
  'help_my_child',
])

export const BUCKET_STYLES: Record<
  MatchBucket,
  { bg: string; border: string; text: string; bar: string; label: string }
> = {
  likely: {
    bg: '#E1F5EE',
    border: 'rgba(15,110,86,0.25)',
    text: '#0F6E56',
    bar: '#2D9B7F',
    label: 'Likely',
  },
  target: {
    bg: '#E6F1FB',
    border: 'rgba(24,95,165,0.22)',
    text: '#185FA5',
    bar: '#3B82C4',
    label: 'Target',
  },
  reach: {
    bg: '#FAEEDA',
    border: 'rgba(133,79,11,0.22)',
    text: '#854F0B',
    bar: '#D97706',
    label: 'Reach',
  },
  below: {
    bg: '#F3F4F6',
    border: '#E5E7EB',
    text: '#6B7280',
    bar: '#9CA3AF',
    label: 'Below',
  },
}

export function formatDivision(code: string | null | undefined): string {
  if (!code) return '—'
  const map: Record<string, string> = {
    d1_power: 'D1 Power',
    d1_mid_major: 'D1 Mid-major',
    d2: 'D2',
    d3: 'D3',
    naia: 'NAIA',
    juco: 'JUCO',
  }
  return map[code] ?? code.replace(/_/g, ' ')
}

export function factorFitLabel(score: number | null | undefined): string {
  const n = score ?? 0
  if (n >= 80) return 'Strong fit'
  if (n >= 60) return 'Good fit'
  if (n >= 40) return 'Stretch'
  return 'Below'
}

export type CollegeMatchDrawerTab = 'all' | MatchBucket | 'saved'

export const SAVED_FILTER_STYLE = {
  bg: '#EDE9FE',
  border: 'rgba(91,33,182,0.22)',
  text: '#5B21B6',
  label: 'Saved',
}

export function shouldShowCollegeMatches(prefs: {
  primary_goal?: string | null
  not_recruiting?: boolean | null
  wizard_completed_at?: string | null
} | null): boolean {
  if (!prefs?.wizard_completed_at) return false
  if (prefs.not_recruiting) return false
  if (!prefs.primary_goal || NON_RECRUITING_GOALS.has(prefs.primary_goal)) {
    return false
  }
  return true
}

export type CollegeMatchRow = {
  match_score: number
  bucket: MatchBucket
  tennis_fit: number | null
  academic_fit: number | null
  division_fit: number | null
  geo_fit: number | null
  player_utr_snapshot: number | null
  player_gpa_snapshot: number | null
  player_sat_snapshot: number | null
  school_roster_avg: number | null
  rationale: string | null
  saved?: boolean
  schools: {
    ipeds_id: string
    name: string
    city: string | null
    state: string | null
    region: string | null
    academic_tier: string | null
    admission_rate: number | null
    sat_25th: number | null
    sat_75th: number | null
    net_price: number | null
    url: string | null
    school_tennis_programs:
      | {
          division: string | null
          roster_avg_utr: number | null
          roster_min_utr: number | null
          roster_max_utr: number | null
        }
      | {
          division: string | null
          roster_avg_utr: number | null
          roster_min_utr: number | null
          roster_max_utr: number | null
        }[]
      | null
  }
}
