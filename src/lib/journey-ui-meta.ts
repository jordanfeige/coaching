import type { CategoryKey } from './journey-types'

export const CATEGORY_UI_META: Record<
  CategoryKey,
  {
    icon: string
    shortLabel: string
    tagline: string
    viaPrompts: string[]
  }
> = {
  tennis: {
    icon: '🎾',
    shortLabel: 'Tennis',
    tagline: 'Where your game stands vs target rosters.',
    viaPrompts: [
      'Why is my Tennis Skill score below target?',
      'How do I close my UTR gap fastest?',
    ],
  },
  academics: {
    icon: '🧠',
    shortLabel: 'Academics',
    tagline: "How many programs you're eligible for.",
    viaPrompts: [
      'Why does verifying my GPA matter?',
      'Which programs am I academically eligible for?',
    ],
  },
  exposure: {
    icon: '🚀',
    shortLabel: 'Exposure',
    tagline: 'How visible you are to college coaches.',
    viaPrompts: [
      "What's hurting my Exposure score?",
      'Which tournaments lift Exposure fastest?',
    ],
  },
  coachability: {
    icon: '🎯',
    shortLabel: 'Coachability',
    tagline: 'What only Playvia can prove — how fast you improve.',
    viaPrompts: [
      'Why is Coachability my biggest strength?',
      'How do I show this to college coaches?',
    ],
  },
}

const INPUT_LABELS: Record<string, string> = {
  utr_rating: 'UTR rating',
  gpa: 'GPA',
  sat: 'SAT',
  transcript_uploaded: 'Transcript on file',
  sanctioned_tournaments_12mo: 'Sanctioned tournaments (12mo)',
  verified_reels_count: 'Verified match reels',
  technique_velocity_90d: 'Technique velocity',
  issue_resolution_avg_sessions: 'Issue resolution speed',
  sessions_90d: 'Film responsiveness',
}

export function inputDisplayName(key: string): string {
  return INPUT_LABELS[key] ?? key.replace(/_/g, ' ')
}
