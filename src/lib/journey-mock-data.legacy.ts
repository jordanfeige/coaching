// Legacy reference only — live UI uses journey-fetch.ts + journey-view-model.ts.
// Types live in journey-types.ts.
// Weights version: v1.1 (Tennis 35 / Academics 25 / Exposure 25 / Coachability 15)

export type Severity = 'critical' | 'important' | 'minor' | 'done'
export type Difficulty = 1 | 2 | 3

export type CategoryKey = 'tennis' | 'academics' | 'exposure' | 'coachability'

export interface JourneyCategory {
  key: CategoryKey
  label: string
  shortLabel: string
  weight: number
  score: number
  pct: number
  icon: string
  tagline: string
  gap: string
  isStrength?: boolean
  viaPrompts: string[]
  inputs: {
    name: string
    value: string
    source: string
    verified: boolean
    date: string
  }[]
}

export interface JourneyQuest {
  id: string
  icon: string
  title: string
  severity: Severity
  reward: number
  earned?: number
  difficulty: Difficulty
  timeWindow: string
  desc: string
  affects: string
  affectsKey: CategoryKey
  progress: number
  probability: string
  viaPrompts: string[]
  completedAt?: string
}

export interface JourneyMilestone {
  label: string
  status: 'done' | 'active' | 'locked'
  detail: string
  completedAt?: string
  progress?: number
  pointsToUnlock?: number
  viaPrompts?: string[]
}

export interface JourneyEvent {
  date: string
  label: string
  change: string
  delta: string
  category: CategoryKey | 'tier'
}

export const journeyMock = {
  player: {
    name: 'Taylor M.',
    sport: 'Tennis',
    classYear: '2027',
    tier: 'Regional Prospect',
    nextTier: 'Verified Prospect',
    tierProgress: 0.62,
    journeyRating: 47,
    ratingDelta: 5,
    pointsToNextTier: 18,
  },
  momentum: {
    fastestMover: { name: 'Exposure', delta: '+12', window: '30 days' },
    utrPercentile: 18,
    statement: 'Improving faster than 82% of 2027 prospects',
  },
  weightsVersion: 'v1.1 — Playvia default',
  categories: [
    {
      key: 'tennis',
      label: 'Tennis Skill',
      shortLabel: 'Tennis',
      weight: 35,
      score: 16.1,
      pct: 46,
      icon: '🎾',
      tagline: 'Where your game stands vs target rosters.',
      gap: '+1.82 UTR to reach D1 mid-major roster avg',
      viaPrompts: [
        'Why is my Tennis Skill score 46%?',
        'How do I close my UTR gap fastest?',
      ],
      inputs: [
        { name: 'UTR rating', value: '7.38', source: 'UTR API', verified: true, date: 'May 18' },
        { name: 'USTA ranking', value: 'Section #284', source: 'Self-reported', verified: false, date: 'May 02' },
        { name: 'Quality wins (90d)', value: '3', source: 'UTR API', verified: true, date: 'May 18' },
        { name: 'D1 mid-major benchmark', value: '9.20 UTR', source: 'NCAA roster data', verified: true, date: 'Q2 2026' },
      ],
    },
    {
      key: 'academics',
      label: 'Academic Readiness',
      shortLabel: 'Academics',
      weight: 25,
      score: 10.5,
      pct: 42,
      icon: '🧠',
      tagline: "How many programs you're eligible for.",
      gap: 'Upload transcript to unlock +6 points',
      viaPrompts: [
        'Why does verifying my GPA matter?',
        "Which programs am I academically eligible for?",
      ],
      inputs: [
        { name: 'GPA', value: '3.4', source: 'Self-reported', verified: false, date: 'May 02' },
        { name: 'SAT', value: '1180', source: 'College Board', verified: true, date: 'Apr 14' },
        { name: 'Programs eligible', value: '68%', source: 'Calculated', verified: true, date: 'Live' },
        { name: 'Transcript on file', value: 'Not yet', source: 'Pending upload', verified: false, date: '—' },
      ],
    },
    {
      key: 'exposure',
      label: 'Exposure',
      shortLabel: 'Exposure',
      weight: 25,
      score: 11.2,
      pct: 45,
      icon: '🚀',
      tagline: 'How visible you are to college coaches.',
      gap: 'Add verified match footage — +7 points',
      viaPrompts: [
        "What's hurting my Exposure score?",
        'Which tournaments lift Exposure fastest?',
      ],
      inputs: [
        { name: 'Sanctioned tournaments (12mo)', value: '4', source: 'USTA + manual', verified: false, date: 'May 14' },
        { name: 'Sectionals reached', value: '1', source: 'USTA', verified: true, date: 'May 14' },
        { name: 'Verified match reels', value: '0', source: 'Playvia', verified: true, date: '—' },
        { name: 'Activity freshness', value: '6 days ago', source: 'Playvia', verified: true, date: 'Live' },
        { name: 'D1 prospect avg', value: '8 tournaments', source: 'Playvia benchmark', verified: true, date: 'Q2 2026' },
      ],
    },
    {
      key: 'coachability',
      label: 'Coachability',
      shortLabel: 'Coachability',
      weight: 15,
      score: 13.5,
      pct: 90,
      icon: '🎯',
      tagline: 'What only Playvia can prove — how fast you improve.',
      gap: 'Top 9% of 2027 players. This is your edge.',
      isStrength: true,
      viaPrompts: [
        'Why is Coachability my biggest strength?',
        'How do I show this to college coaches?',
      ],
      inputs: [
        { name: 'Technique velocity', value: '+12 in 90 days', source: 'Video analysis', verified: true, date: 'Live' },
        { name: 'Issue resolution speed', value: '3.2 sessions avg', source: 'Playvia', verified: true, date: 'Live' },
        { name: 'Film responsiveness', value: '6 sessions in 90d', source: 'Playvia', verified: true, date: 'Live' },
        { name: 'Active issues', value: '1 (footwork)', source: 'Latest analysis', verified: true, date: 'Apr 28' },
        { name: 'Coach assessments', value: '2 on file', source: 'Coach Pat', verified: true, date: 'May 09' },
      ],
    },
  ] as JourneyCategory[],
  milestones: [
    { label: 'UTR Verified', status: 'done', completedAt: 'Apr 28', detail: 'UTR API connected · 7.38 verified' },
    { label: 'Academic Floor', status: 'done', completedAt: 'May 10', detail: 'SAT 1180 cleared D1 academic floor' },
    {
      label: 'Verified Prospect',
      status: 'active',
      progress: 0.62,
      detail: 'Need verified transcript + 2 more tournaments',
      pointsToUnlock: 14,
      viaPrompts: ["What's the fastest path to Verified Prospect?", 'Realistic timeline to unlock this?'],
    },
    { label: 'D2/D3 Ready', status: 'locked', detail: 'Unlocks at Journey Rating 65 — 18 points away' },
    { label: 'D1 Prospect', status: 'locked', detail: 'Unlocks at UTR 9.0+ and 8+ sanctioned tournaments' },
  ] as JourneyMilestone[],
  quests: [
    {
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
      probability: 'Players who verify transcripts reach Verified Prospect 2.4× faster on average',
      viaPrompts: ["Why does verification matter so much?", "What if I don't have a transcript yet?"],
    },
    {
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
      probability: 'Profiles with verified reels see 3× more coach views in Playvia data',
      viaPrompts: ["How do I record a verified reel?", "What makes footage 'verified'?"],
    },
    {
      id: 'tournaments',
      icon: '🎾',
      title: 'Add 2 more sanctioned tournaments',
      severity: 'important',
      reward: 8,
      difficulty: 3,
      timeWindow: '2-3 months',
      desc: 'Bring your 12-month schedule from 4 → 6 events. Sectionals count double.',
      affects: 'Exposure',
      affectsKey: 'exposure',
      progress: 0,
      probability: 'Players with 6+ sanctioned events advance tiers 1.8× faster',
      viaPrompts: ['Which tournaments fit my level?', 'Where are the closest events to me?'],
    },
    {
      id: 'utr-push',
      icon: '📈',
      title: 'Push UTR 7.38 → 7.6',
      severity: 'important',
      reward: 5,
      difficulty: 2,
      timeWindow: '4-6 weeks',
      desc: 'Win 2 of next 3 ranked matches at UTR 7.5+. Via will surface eligible matchups.',
      affects: 'Tennis Skill',
      affectsKey: 'tennis',
      progress: 0.33,
      probability: 'Closes 12% of the D1 mid-major roster gap',
      viaPrompts: ['Find me matchups at this level', "What's my realistic UTR ceiling this year?"],
    },
  ] as JourneyQuest[],
  events: [
    { date: 'May 18', label: 'UTR rating updated', change: '7.31 → 7.38', delta: '+0.7', category: 'tennis' },
    { date: 'May 14', label: 'Sanctioned tournament added', change: 'Sectionals (R32)', delta: '+2.3', category: 'exposure' },
    { date: 'May 10', label: 'SAT score verified', change: '1180', delta: '+4.0', category: 'academics' },
    { date: 'May 02', label: 'Technique session #6', change: 'Score 72 → 78', delta: '+0.8', category: 'coachability' },
    { date: 'Apr 28', label: 'Footwork drill assigned', change: 'By Coach Pat', delta: '—', category: 'coachability' },
  ] as JourneyEvent[],
}
