import { anthropic, CLAUDE_SONNET_MODEL } from '@/lib/anthropic'
import type { CustomDrillPayload } from '@/lib/drills-library'
import { mapCheckpointToCategory } from '@/lib/drills-library'

export async function generateCustomDrillWithVia(input: {
  player_request: string
  target_checkpoints?: string[]
  skill_level: string
  duration_minutes: number
  mode: string
}): Promise<CustomDrillPayload> {
  const checkpoints = input.target_checkpoints ?? []
  const category =
    checkpoints.length > 0
      ? mapCheckpointToCategory(checkpoints[0])
      : 'Forehand'

  const response = await anthropic.messages.create({
    model: CLAUDE_SONNET_MODEL,
    max_tokens: 1200,
    system: `You create tennis practice drills for junior players. Respond ONLY with valid JSON matching this schema:
{
  "name": string,
  "primary_category": "Forehand"|"Backhand"|"Serve"|"Volley"|"Footwork"|"Match Play"|"Mental",
  "drill_type": string,
  "checkpoints": string[],
  "skill_level": "beginner"|"intermediate"|"advanced",
  "duration_minutes": number,
  "mode": "solo"|"partner"|"coach_feed",
  "requires": string[],
  "description": string,
  "steps": string[],
  "success_criteria": string,
  "coaching_cue": string
}`,
    messages: [
      {
        role: 'user',
        content: `Create a drill for: ${input.player_request}
Skill level: ${input.skill_level}
Duration: ${input.duration_minutes} minutes
Mode: ${input.mode}
Target checkpoints: ${checkpoints.join(', ') || 'general technique'}
Suggested category: ${category}`,
      },
    ],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const parsed = JSON.parse(text) as CustomDrillPayload
  return {
    name: parsed.name || `Custom: ${input.player_request.slice(0, 40)}`,
    primary_category: parsed.primary_category || category,
    drill_type: parsed.drill_type ?? 'live-ball',
    checkpoints: parsed.checkpoints ?? checkpoints,
    skill_level: parsed.skill_level || input.skill_level,
    duration_minutes: parsed.duration_minutes || input.duration_minutes,
    mode: parsed.mode || input.mode,
    requires: parsed.requires ?? [],
    description: parsed.description || input.player_request,
    steps: parsed.steps?.length ? parsed.steps : [parsed.description || input.player_request],
    success_criteria: parsed.success_criteria ?? 'Complete all reps with focus on the coaching cue.',
    coaching_cue: parsed.coaching_cue ?? 'Quality over speed.',
  }
}
