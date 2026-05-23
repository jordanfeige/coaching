import { SchemaType, type Schema } from '@google/generative-ai'

function str(description?: string): Schema {
  return { type: SchemaType.STRING, description }
}

const tendencyRatingSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    value: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: ['Strong', 'Inconsistent', 'Avoided', 'Steady', 'not_enough_data'],
    },
    strength: {
      type: SchemaType.INTEGER,
      description: '0-100 bar fill; Strong ~85, Steady ~68, Inconsistent ~48, Avoided ~15',
    },
  },
  required: ['value', 'strength'],
}

const tendenciesSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    forehand: tendencyRatingSchema,
    backhand: tendencyRatingSchema,
    net_play: tendencyRatingSchema,
    court_coverage: tendencyRatingSchema,
    composure: tendencyRatingSchema,
  },
  required: ['forehand', 'backhand', 'net_play', 'court_coverage', 'composure'],
}

const gamePlanSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    theme: str('One-sentence match-level meta-tactic'),
    reasoning: str('2-4 sentences IF-THEN reasoning across segments'),
    what_to_do: str('Concrete tactical adjustments'),
  },
  required: ['theme', 'reasoning', 'what_to_do'],
}

export const MATCH_SYNTHESIS_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    match_game_plan: gamePlanSchema,
    tendencies: tendenciesSchema,
    recurring_themes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          type: {
            type: SchemaType.STRING,
            format: 'enum',
            enum: ['strength', 'weakness'],
          },
          title: str(),
          description: str(),
          appears_in_segments: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.INTEGER },
          },
        },
        required: ['type', 'title', 'description', 'appears_in_segments'],
      },
    },
    work_on_list: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: str(),
          frequency: { type: SchemaType.INTEGER },
          total_segments: { type: SchemaType.INTEGER },
          severity_summary: str('high | medium | low or short phrase'),
          description: str('One-line tactical hint, e.g. step in after the setup shot'),
        },
        required: ['title', 'frequency', 'total_segments', 'severity_summary', 'description'],
      },
    },
    inconsistencies_noted: {
      type: SchemaType.ARRAY,
      items: str(),
    },
    synthesis_limitations: str('How many segments synthesized vs total match'),
  },
  required: [
    'match_game_plan',
    'tendencies',
    'recurring_themes',
    'work_on_list',
    'inconsistencies_noted',
    'synthesis_limitations',
  ],
}
