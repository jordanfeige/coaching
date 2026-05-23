export type MatchAnalysisResult = {
  match_meta: {
    duration_seconds: number
    result: 'win' | 'loss' | 'unfinished' | 'unclear'
    final_score: string
    confidence_in_score: 'high' | 'medium' | 'low'
  }
  stats: {
    winners_estimate: number
    unforced_errors_estimate: number
    first_serve_percentage_estimate: number
    break_points_won_estimate: string
    confidence_in_stats: 'high' | 'medium' | 'low'
  }
  narrative_summary: string
  work_on_top_three: Array<{
    rank: number
    title: string
    description: string
    impact: 'high' | 'moderate' | 'low'
  }>
  honest_limitations: string
}

export function buildMatchAnalysisPrompt(args: {
  opponent_name: string
  match_context: string
}): string {
  return `You are an elite tennis coach analyzing a full match video.

MATCH CONTEXT:
${args.match_context}
Player vs ${args.opponent_name}

YOUR TASK:
Watch the entire match. Then produce a structured JSON analysis with these fields:

{
  "match_meta": {
    "duration_seconds": <integer — total length of video you analyzed>,
    "result": "win" | "loss" | "unfinished" | "unclear",
    "final_score": "<e.g., '6-3, 4-6, 7-5' — leave empty string if you can't determine>",
    "confidence_in_score": "high" | "medium" | "low"
  },
  "stats": {
    "winners_estimate": <integer estimate>,
    "unforced_errors_estimate": <integer estimate>,
    "first_serve_percentage_estimate": <integer 0-100, your best estimate>,
    "break_points_won_estimate": "<e.g., '4/9' — leave empty if can't track>",
    "confidence_in_stats": "high" | "medium" | "low"
  },
  "narrative_summary": "<2-3 sentence summary of the match. Be specific. Mention what happened, what changed, the most defining pattern. Write as if you're a coach talking to the player after the match. NO generic statements like 'you played hard' — be specific to what you observed.>",
  "work_on_top_three": [
    {
      "rank": 1,
      "title": "<Short title of the issue, 8 words max>",
      "description": "<2-3 sentences explaining what you observed and the specific fix. Reference concrete moments if possible.>",
      "impact": "high" | "moderate" | "low"
    },
    {
      "rank": 2,
      "title": "...",
      "description": "...",
      "impact": "high" | "moderate" | "low"
    },
    {
      "rank": 3,
      "title": "...",
      "description": "...",
      "impact": "high" | "moderate" | "low"
    }
  ],
  "honest_limitations": "<Brief note about what you couldn't see or confidently assess. e.g., 'Camera angle made it hard to see the deuce-court return position consistently.' Be honest.>"
}

QUALITY REQUIREMENTS:

1. **Specificity is non-negotiable.** Generic feedback ("work on consistency") is failure. Specific feedback ("forehand depth drops in long rallies, especially when pulled wide on the backhand side") is the goal.

2. **Cite moments when possible.** "At around 23:00 you started attacking the backhand corner — that's when momentum shifted" is gold.

3. **Honest uncertainty.** If you can't see the score clearly, say so. If the camera angle hides certain things, say so. Don't fabricate confidence.

4. **Tennis principles** to weight your analysis:
   - Footwork-first: split-step, first step, recovery
   - Consistency over power
   - Depth and direction control (crosscourt theory)
   - Down-the-line shots only from balanced positions inside the baseline
   - Patience in rallies — wait for the short ball
   - Pressure points (break points, set points) reveal real skill gaps

5. **The "work_on_top_three" must be ACTIONABLE.** Each item should be something a player could practice this week. Not "be more consistent" — but "when pulled wide on forehand, reset crosscourt deep instead of attempting down-the-line."

6. **JSON only.** No prose before/after the JSON object. No markdown code blocks.

7. **Valid JSON syntax.** No trailing commas. Escape double quotes and newlines inside strings (use \\n). Keep narrative_summary and descriptions on one line or use \\n — never raw line breaks inside JSON string values.

Begin analysis now.`
}

export type GeminiUsageMetadata = {
  promptTokenCount?: number
  candidatesTokenCount?: number
  totalTokenCount?: number
}

/** Rough USD estimate — verify against Google Cloud billing after first run. */
export function computeEstimatedCostUsd(usage: GeminiUsageMetadata | undefined): number {
  if (!usage) return 0

  const inputCostPer1M = 0.075
  const outputCostPer1M = 0.3

  const inputCost =
    ((usage.promptTokenCount ?? 0) / 1_000_000) * inputCostPer1M
  const outputCost =
    ((usage.candidatesTokenCount ?? 0) / 1_000_000) * outputCostPer1M

  return inputCost + outputCost
}
