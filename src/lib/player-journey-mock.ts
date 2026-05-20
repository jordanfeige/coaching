/**
 * M2 — static mock data for player Journey UI (no API / DB).
 */

export type MomentumTrend = 'up' | 'down' | 'flat'

export type JourneyMomentumItem = {
  id: string
  label: string
  value: string
  delta: string
  trend: MomentumTrend
}

export type RoadMilestoneStatus = 'done' | 'current' | 'upcoming'

export type JourneyRoadMilestone = {
  id: string
  label: string
  detail: string
  status: RoadMilestoneStatus
  timeframe: string
}

export type JourneyQuestStatus = 'complete' | 'active' | 'locked'

export type JourneyQuest = {
  id: string
  title: string
  description: string
  status: JourneyQuestStatus
  points: number
  viaPrompt?: string
  href?: string
}

export type BreakdownPillar = {
  key: string
  label: string
  score: number
  weight: string
  status: 'good' | 'improve' | 'missing'
  items: Array<{
    label: string
    value: string
    note?: string
  }>
}

export const playerJourneyMock = {
  player: {
    firstName: 'Jamie',
    fullName: 'Jamie Early',
    gradYear: 2027,
    sport: 'Tennis',
    target: 'NCAA D3 · Southeast',
  },

  playerCard: {
    readinessScore: 72,
    readinessLabel: 'Recruiting readiness',
    tier: 'On track',
    confidence: 'medium' as const,
    summary:
      'Strong tennis level for D3 targets. Academics and schedule proof are your next levers.',
    utr: 7.38,
    techniqueScore: 74,
    gpa: 3.6,
  },

  momentum: [
    {
      id: 'utr',
      label: 'UTR',
      value: '7.38',
      delta: '+0.12',
      trend: 'up',
    },
    {
      id: 'technique',
      label: 'Technique',
      value: '74',
      delta: '+4',
      trend: 'up',
    },
    {
      id: 'schedule',
      label: 'Schedule',
      value: '58',
      delta: '—',
      trend: 'flat',
    },
    {
      id: 'gpa',
      label: 'GPA',
      value: '3.6',
      delta: '—',
      trend: 'flat',
    },
  ] satisfies JourneyMomentumItem[],

  roadToOffer: [
    {
      id: 'profile',
      label: 'Recruiting profile',
      detail: 'Goals, academics, and UTR linked',
      status: 'done',
      timeframe: 'Done',
    },
    {
      id: 'proof',
      label: 'Schedule proof',
      detail: 'Quality wins vs higher-rated opponents',
      status: 'current',
      timeframe: 'This season',
    },
    {
      id: 'reels',
      label: 'Coach-verified reels',
      detail: 'Match-play footage colleges can trust',
      status: 'upcoming',
      timeframe: 'Next 60 days',
    },
    {
      id: 'outreach',
      label: 'Coach outreach',
      detail: 'Intro emails to target programs',
      status: 'upcoming',
      timeframe: 'Junior year',
    },
    {
      id: 'offer',
      label: 'Offer decision',
      detail: 'Compare fit, aid, and roster path',
      status: 'upcoming',
      timeframe: 'Senior year',
    },
  ] satisfies JourneyRoadMilestone[],

  quests: [
    {
      id: 'sync-utr',
      title: 'Sync UTR match history',
      description: 'Refresh schedule strength and quality wins from your last 12 months.',
      status: 'active',
      points: 15,
      viaPrompt: 'How do I improve my schedule strength for recruiting?',
    },
    {
      id: 'film-reel',
      title: 'Film a match-play reel',
      description: 'Upload side-view footage — colleges want real points, not drills only.',
      status: 'active',
      points: 20,
      href: '/player/reels',
      viaPrompt: 'What should I film for my next recruiting reel?',
    },
    {
      id: 'sat-prep',
      title: 'Raise SAT to 1250+',
      description: 'Unlock more academic-fit D3 programs in the Southeast.',
      status: 'active',
      points: 10,
      viaPrompt: 'Which schools fit my UTR and SAT if I hit 1250?',
    },
    {
      id: 'wizard-done',
      title: 'Complete recruiting wizard',
      description: 'Preferences saved — Via can personalize school targets.',
      status: 'complete',
      points: 10,
    },
    {
      id: 'coach-note',
      title: 'Get coach reel assessment',
      description: 'Ask your coach to verify your best reel before outreach.',
      status: 'locked',
      points: 15,
    },
  ] satisfies JourneyQuest[],

  breakdown: {
    headline: 'Score breakdown',
    subhead: 'How your 72 readiness score is built (mock weights).',
    pillars: [
      {
        key: 'tennis',
        label: 'Tennis level',
        score: 78,
        weight: '40%',
        status: 'good',
        items: [
          { label: 'UTR Singles', value: '7.38' },
          { label: 'Schedule strength', value: '58 / 100', note: 'Improve with more sanctioned matches' },
          { label: 'Quality wins', value: '3 vs higher rated' },
        ],
      },
      {
        key: 'academic',
        label: 'Academics',
        score: 65,
        weight: '25%',
        status: 'improve',
        items: [
          { label: 'GPA', value: '3.6' },
          { label: 'SAT', value: '1180', note: 'Target 1250+ for more options' },
          { label: 'Major', value: 'Business' },
        ],
      },
      {
        key: 'proof',
        label: 'Proof & reels',
        score: 62,
        weight: '20%',
        status: 'improve',
        items: [
          { label: 'Verified reels', value: '1 of 3 recommended' },
          { label: 'Technique score', value: '74' },
          { label: 'Coach assessment', value: 'Pending' },
        ],
      },
      {
        key: 'fit',
        label: 'Goals & fit',
        score: 80,
        weight: '15%',
        status: 'good',
        items: [
          { label: 'Target division', value: 'NCAA D3' },
          { label: 'Geography', value: 'Southeast' },
          { label: 'Scholarship need', value: 'Partial aid' },
        ],
      },
    ] satisfies BreakdownPillar[],
  },
} as const

export const playerTrainingMock = {
  nextSession: {
    date: 'Wed, Jun 4',
    time: '4:00 PM',
    focus: 'Serve + first ball patterns',
    coachName: 'Coach Martinez',
  },
  recentSessions: [
    { id: '1', date: 'May 28', focus: 'Forehand unit turn', rating: 'Strong session' },
    { id: '2', date: 'May 21', focus: 'Approach + volley', rating: 'Good progress' },
  ],
  assignedDrills: [
    { id: 'd1', name: 'Shadow coil — 3×10', due: 'Before next session' },
    { id: 'd2', name: 'Serve toss ladder', due: '2× this week' },
  ],
} as const

export const playerCoachMock = {
  coachName: 'Coach Martinez',
  academy: 'Via Tennis Academy',
  lastMessage: 'Great unit turn on Tuesday — film match points this weekend for your reel.',
  lastMessageAt: '2 days ago',
  quickPrompts: [
    'What should I work on before our next session?',
    'Can you review my latest reel?',
    'How do I prepare for a college showcase?',
  ],
} as const
