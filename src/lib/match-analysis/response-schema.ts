import { SchemaType, type Schema } from '@google/generative-ai'

const confidenceEnum: Schema = {
  type: SchemaType.STRING,
  format: 'enum',
  enum: ['high', 'medium', 'low'],
}

function str(description?: string, nullable = false): Schema {
  return {
    type: SchemaType.STRING,
    description,
    ...(nullable ? { nullable: true } : {}),
  }
}

function enumStr(values: string[], description?: string, nullable = false): Schema {
  return {
    type: SchemaType.STRING,
    format: 'enum',
    enum: values,
    description,
    ...(nullable ? { nullable: true } : {}),
  }
}

const describedPlayerSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    clothing: str('Shirt/shorts colors, hat, wristbands'),
    build: str('Height/build relative to opponent'),
    hair: str('Hair color, length, headband, ponytail'),
    racquet: str('Racquet color if visible'),
    handedness: str('Right or left if visible'),
    other_distinguishing_features: str('Other visible features', true),
  },
  required: [
    'clothing',
    'build',
    'hair',
    'racquet',
    'handedness',
    'other_distinguishing_features',
  ],
}

const playerIdentificationSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    described_player: describedPlayerSchema,
    confidence: confidenceEnum,
    tracked_throughout: { type: SchemaType.BOOLEAN },
    notes: str('If tracking was lost, explain here', true),
  },
  required: ['described_player', 'confidence', 'tracked_throughout', 'notes'],
}

const matchMetaSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    duration_seconds: { type: SchemaType.NUMBER, nullable: true },
    result: enumStr(['win', 'loss', 'unknown']),
    final_score: str('Final score e.g. 6-3, 4-6, 7-5', true),
    is_full_match_or_highlights: enumStr([
      'full_match',
      'highlights',
      'unknown',
    ]),
  },
  required: [
    'duration_seconds',
    'result',
    'final_score',
    'is_full_match_or_highlights',
  ],
}

const matchContextSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    early_game_pattern: str(),
    late_game_pattern: str(),
    when_ahead: str(),
    when_behind: str(),
    under_pressure: str(),
    on_big_points: str(),
  },
}

const tacticalGamePlanSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    theme: str('One-sentence meta-tactic headline'),
    reasoning: str('2-3 sentences with IF-THEN tactical chains'),
    what_to_do: str('1-2 sentences of concrete tactical adjustments'),
  },
  required: ['theme', 'reasoning', 'what_to_do'],
}

const whatWorkedItemSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    observation: str('What you saw — no interpretation'),
    why_it_worked: str('Why it was effective in this match'),
    evidence: {
      type: SchemaType.ARRAY,
      items: str(
        'Phase-based reference e.g. early in segment, during first long rally — NOT MM:SS',
      ),
      minItems: 2,
    },
    confidence: confidenceEnum,
  },
  required: ['observation', 'why_it_worked', 'evidence', 'confidence'],
}

const workOnItemSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    rank: { type: SchemaType.INTEGER, description: '1, 2, or 3' },
    title: str('Short label'),
    observation: str('Visible behavior only — no reasoning'),
    interpretation: str('Underlying cause / pattern'),
    coaching_adjustment: str(
      '2-4 sentences: tactical IF-THEN coaching voice, not drill-sheet format',
    ),
    evidence: {
      type: SchemaType.ARRAY,
      items: str(
        'Phase-based reference e.g. mid-segment, after first net approach — NOT MM:SS',
      ),
      minItems: 2,
    },
    impact: enumStr(['high', 'medium', 'low']),
    confidence: confidenceEnum,
  },
  required: [
    'rank',
    'title',
    'observation',
    'interpretation',
    'coaching_adjustment',
    'evidence',
    'impact',
    'confidence',
  ],
}

const keyMomentSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    phase: str(
      'When in segment e.g. late in segment, during second service game — NOT MM:SS',
    ),
    moment_type: enumStr([
      'turning_point',
      'break_point',
      'set_point',
      'pattern_shift',
      'mental_moment',
      'best_point',
      'worst_point',
    ]),
    description: str(),
  },
  required: ['phase', 'moment_type', 'description'],
}

const mentalObservationSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    behavior_observed: str('Visible behavior only — no psychology'),
    interpretation: str('Behavioral pattern only — not mental state diagnosis'),
    evidence: {
      type: SchemaType.ARRAY,
      items: str('Phase-based references — NOT MM:SS'),
      minItems: 2,
    },
    confidence: confidenceEnum,
  },
  required: [
    'behavior_observed',
    'interpretation',
    'evidence',
    'confidence',
  ],
}

const playingStyleSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    archetype: enumStr(
      [
        'baseliner',
        'counterpuncher',
        'aggressive_baseliner',
        'all_court',
        'serve_and_volley',
        'pusher',
        'mixed',
      ],
      'How the player played THIS match; null if unsure',
      true,
    ),
    archetype_confidence: confidenceEnum,
    archetype_summary: str('Use played AS language — single-match observation'),
    mental_observations: {
      type: SchemaType.ARRAY,
      items: mentalObservationSchema,
    },
  },
}

const tendencyQualityFour = enumStr([
  'strong',
  'inconsistent',
  'weak',
  'not_enough_data',
])

const tendencyQualityMixed = enumStr(['strong', 'mixed', 'weak', 'not_enough_data'])

const tendencyDepth = enumStr(['strong', 'mixed', 'shallow', 'not_enough_data'])

const tendencyMovement = enumStr(['fast', 'adequate', 'slow', 'not_enough_data'])

const tendenciesSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    serve_consistency: tendencyQualityFour,
    forehand_quality: tendencyQualityMixed,
    backhand_quality: tendencyQualityMixed,
    baseline_depth: tendencyDepth,
    movement_recovery: tendencyMovement,
    error_pattern: str('One sentence on dominant error pattern if clear', true),
  },
  required: [
    'serve_consistency',
    'forehand_quality',
    'backhand_quality',
    'baseline_depth',
    'movement_recovery',
    'error_pattern',
  ],
}

/** Gemini structured output schema for match analysis v2.3 */
export const MATCH_ANALYSIS_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    player_identification: playerIdentificationSchema,
    match_meta: matchMetaSchema,
    match_context: matchContextSchema,
    narrative_summary: str('2-4 sentences: what happened in this match'),
    tactical_game_plan: tacticalGamePlanSchema,
    what_worked: {
      type: SchemaType.ARRAY,
      items: whatWorkedItemSchema,
    },
    work_on_top_three: {
      type: SchemaType.ARRAY,
      items: workOnItemSchema,
      minItems: 1,
      maxItems: 3,
    },
    key_moments: {
      type: SchemaType.ARRAY,
      items: keyMomentSchema,
    },
    playing_style: playingStyleSchema,
    tendencies: tendenciesSchema,
    honest_limitations: str('What the video angle/quality prevented analyzing well'),
  },
  required: [
    'player_identification',
    'match_meta',
    'narrative_summary',
    'tactical_game_plan',
    'what_worked',
    'work_on_top_three',
    'key_moments',
    'honest_limitations',
  ],
}
