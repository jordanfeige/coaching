/** Parse issue labels from analysis_sessions.full_result (shape varies by model version). */

export function issueNameFromEntry(issue: unknown): string | null {
  if (typeof issue === 'string') return issue.trim() || null
  if (!issue || typeof issue !== 'object') return null
  const row = issue as Record<string, unknown>
  const name =
    row.area ??
    row.name ??
    row.title ??
    row.area_name
  return typeof name === 'string' && name.trim() ? name.trim() : null
}

export function drillNameFromEntry(issue: unknown): string | null {
  if (!issue || typeof issue !== 'object') return null
  const row = issue as Record<string, unknown>
  const drill = row.drill
  if (typeof drill === 'string') return drill
  if (drill && typeof drill === 'object') {
    const d = drill as Record<string, unknown>
    if (typeof d.name === 'string') return d.name
  }
  if (typeof row.suggested_drill === 'string') return row.suggested_drill
  if (typeof row.drill_name === 'string') return row.drill_name
  return null
}

export function topIssueFromFullResult(
  fullResult: Record<string, unknown> | null | undefined,
  fallbackTopIssue?: string | null,
): string | null {
  if (fallbackTopIssue?.trim()) return fallbackTopIssue.trim()
  if (!fullResult) return null
  if (typeof fullResult.top_issue === 'string' && fullResult.top_issue.trim()) {
    return fullResult.top_issue.trim()
  }
  const areas = fullResult.areas_to_improve
  if (Array.isArray(areas) && areas.length > 0) {
    return issueNameFromEntry(areas[0])
  }
  return null
}

export type ReelInsightRow = {
  id: string
  analyzed_at: string
  overall_score: number | null
  shot_type: string | null
  top_issue: string | null
  full_result: Record<string, unknown> | null
  video_duration_seconds?: number | null
}

export function aggregateRecurringIssue(
  reels: ReelInsightRow[],
  minCount = 2,
): { name: string; appearancesIn: number; outOf: number } | null {
  const issueCounts: Record<string, number> = {}
  for (const reel of reels) {
    const full = reel.full_result
    const areas = full?.areas_to_improve
    if (!Array.isArray(areas)) continue
    for (const entry of areas) {
      const name = issueNameFromEntry(entry)
      if (name) issueCounts[name] = (issueCounts[name] || 0) + 1
    }
  }
  let top: { name: string; appearancesIn: number; outOf: number } | null = null
  for (const [name, count] of Object.entries(issueCounts)) {
    if (count >= minCount && (!top || count > top.appearancesIn)) {
      top = { name, appearancesIn: count, outOf: reels.length }
    }
  }
  return top
}
