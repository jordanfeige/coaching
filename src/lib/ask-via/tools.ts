import type Anthropic from '@anthropic-ai/sdk'

export const VIA_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'get_rating_breakdown',
    description:
      "Get the player's Journey rating (overall + sub-scores). Optional category returns deep detail for one sub-score. Use when asked about rating, score, tier, or a sub-score (tennis, academics, coachability, exposure).",
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['tennis', 'academics', 'coachability', 'exposure'],
          description: 'Optional: detailed breakdown for one sub-score. Omit for overview.',
        },
      },
    },
  },
  {
    name: 'get_trajectory',
    description:
      "Get UTR trajectory: current UTR, history, forecast to graduation, peer cohort. Use for projection, climbing rate, peer comparison.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_reels',
    description:
      'Get recent reels with player-chosen titles (title/displayName), scores, and top issues. Reference reels by displayName when answering. Filter by reelName for a partial title match.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Default 10, max 30' },
        shotType: { type: 'string', description: 'Optional: forehand, backhand, serve, etc.' },
        reelName: {
          type: 'string',
          description: 'Optional partial match on the reel title the player set',
        },
      },
    },
  },
  {
    name: 'get_reel_detail',
    description:
      'Full AI analysis for one reel by id or by player-chosen title (reelName). Returns title/displayName plus issues, drills, strengths.',
    input_schema: {
      type: 'object',
      properties: {
        reelId: { type: 'string', description: 'analysis_session id from get_reels' },
        reelName: {
          type: 'string',
          description: 'Player-chosen reel name (partial match) if id unknown',
        },
      },
    },
  },
  {
    name: 'get_match_history',
    description:
      'Tournament match results: wins, losses, opponents, UTRs, events.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Default 20, max 100' },
        result: { type: 'string', enum: ['W', 'L', 'all'] },
      },
    },
  },
  {
    name: 'get_quality_wins_summary',
    description:
      'Quality wins summary (opponent UTR at/above peer bar). Use for quality wins or exposure components.',
    input_schema: {
      type: 'object',
      properties: {
        timeframe: { type: 'string', enum: ['3_months', '6_months', '12_months'] },
      },
    },
  },
  {
    name: 'get_drills',
    description: 'Drills assigned, completed, or in progress.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['assigned', 'completed', 'all'] },
        limit: { type: 'number', description: 'Default 20' },
      },
    },
  },
  {
    name: 'get_lessons',
    description: 'Past and upcoming lessons with coach notes.',
    input_schema: {
      type: 'object',
      properties: {
        timeframe: { type: 'string', enum: ['past', 'upcoming', 'all'] },
        limit: { type: 'number', description: 'Default 10' },
      },
    },
  },
  {
    name: 'get_coach_info',
    description: "Player's coach name and contact, or null if none.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_college_matches',
    description:
      'College matches in reach/target/safety buckets with school and roster UTR context.',
    input_schema: {
      type: 'object',
      properties: {
        bucket: { type: 'string', enum: ['reach', 'target', 'likely', 'all'] },
        limit: { type: 'number', description: 'Default 20' },
      },
    },
  },
  {
    name: 'get_road_to_offer',
    description:
      'Gap analysis vs recruiting goal: UTR, GPA, quality wins.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_practice_streak',
    description: 'Practice streak weeks and recent drill completions.',
    input_schema: { type: 'object', properties: {} },
  },
]

export type ViaToolName = (typeof VIA_TOOLS)[number]['name']
