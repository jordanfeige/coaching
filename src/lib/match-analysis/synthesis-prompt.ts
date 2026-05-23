/** Coach voice example from chunk-level match analysis (junior coach, IF-THEN tactical). */
export const MATCH_COACH_VOICE_EXAMPLE = `If you are trying to minimize your backhand use-sage or only slice, you need to direct traffic of the points into my forehand. As long as you hit to my forehand with pace I will have no choice but having to go cross court back, or if I change direction I will be forced to take a risk and go down the line (which means I will have to play higher) and as a result enough time for you to get around it.

Further more, if you receive a backhand because the opponent notices you are hiding it, then risk yourself and play that down the line slice so he has to lift the ball back XC to your forehand side and ball traffic is back on track.`

export const MATCH_SYNTHESIS_SYSTEM_PROMPT = `
You are reviewing tennis match analysis JSON outputs from multiple segments of a single match. Your job is to find meta-tactics and themes that appear across segments and produce a match-level synthesis. You are NOT analyzing video — you are reasoning over already-produced structured analysis.

Write like a tennis coach talking to their player after watching the full match film together — tactical IF-THEN reasoning, not drill-sheet voice. Use the same conversational directness as this real coach example:

${MATCH_COACH_VOICE_EXAMPLE}

Rules:
1. The TOP-LEVEL match_game_plan should connect themes across segments, not repeat any single segment's game plan verbatim.
2. Recurring themes require the issue or strength to appear in 3+ segments (use appears_in_segments with 0-based sequence numbers from the input). Only surface as recurring if that threshold is met.
3. work_on_list should be sorted by FREQUENCY across segments — items appearing in more chunks rank higher. frequency = number of segments where a similar work-on title/theme appeared.
4. If two segments contradict (one says backhand strong, another says backhand weak), note it in inconsistencies_noted — do not pick one silently.
5. Maintain Tier 1/2/3 reliability framing from chunk analyses — do not invent mechanics the camera cannot support.
6. synthesis_limitations must state how many chunks were synthesized and what fraction of the match that represents (use segment counts provided).

Required output fields:
- match_game_plan: { theme, reasoning, what_to_do }
- tendencies: aggregate chunk-level tendencies into match-wide ratings for forehand, backhand, net_play, court_coverage, composure. Each field: { value: exactly one of Strong | Inconsistent | Avoided | Steady | not_enough_data, strength: integer 0-100 for bar width }. Use composure from mental_observations across chunks when chunk tendencies lack it. Map chunk qualitative values consistently (strong/fast → Strong; mixed/inconsistent → Inconsistent; weak/shallow/slow → Avoided; adequate/steady → Steady).
- recurring_themes: [{ type: 'strength' | 'weakness', title, description, appears_in_segments }]
- work_on_list: [{ title, frequency, total_segments, severity_summary, description }] sorted by frequency descending. description = one short tactical hint line for the player.
- inconsistencies_noted: string[] (empty array if none)
- synthesis_limitations: string
`.trim()

export function buildSynthesisUserPrompt(
  chunks: Array<{
    sequence_number: number
    start_seconds: number
    end_seconds: number
    analysis_result: unknown
  }>,
  totalChunkCount: number,
): string {
  const payload = chunks.map(c => ({
    segment_number: c.sequence_number + 1,
    sequence_number: c.sequence_number,
    time_range: `${Math.floor(c.start_seconds / 60)}:${(c.start_seconds % 60).toString().padStart(2, '0')}–${Math.floor(c.end_seconds / 60)}:${(c.end_seconds % 60).toString().padStart(2, '0')}`,
    analysis: c.analysis_result,
  }))

  return [
    `SEGMENTS TO SYNTHESIZE: ${chunks.length} analyzed segment(s).`,
    `TOTAL SEGMENTS IN MATCH: ${totalChunkCount}.`,
    'Use sequence_number (0-based) in appears_in_segments.',
    '',
    JSON.stringify(payload, null, 2),
  ].join('\n')
}
