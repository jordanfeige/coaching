import type { SupabaseClient } from '@supabase/supabase-js'
import { differenceInCalendarDays, subDays } from 'date-fns'
import { PLAYER_VISIBLE_SESSIONS_FILTER } from '@/lib/analysis-sessions'
import { updateJourneyInput } from '@/lib/journey-inputs'

const COACHABILITY_SOURCE = 'coachability_sync'

export type CoachabilityPointBreakdown = {
  improvement_pts: number
  drill_pts: number
  lesson_pts: number
  reel_pts: number
  total_pts: number
}

export type CoachabilitySyncResult = {
  written: boolean
  points: CoachabilityPointBreakdown
  metadata: Record<string, unknown>
}

type AnalysisRow = {
  id: string
  analyzed_at: string | null
  overall_score: number | null
  top_issue: string | null
  full_result: Record<string, unknown> | null
}

function normalizeIssueArea(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function extractIssueAreas(session: AnalysisRow): string[] {
  const areas = new Set<string>()
  const fr = session.full_result
  const list = fr?.areas_to_improve
  if (Array.isArray(list)) {
    for (const item of list) {
      if (typeof item === 'string') {
        const n = normalizeIssueArea(item)
        if (n) areas.add(n)
      } else if (item && typeof item === 'object' && 'area' in item) {
        const a = (item as { area?: string }).area
        if (typeof a === 'string') {
          const n = normalizeIssueArea(a)
          if (n) areas.add(n)
        }
      }
    }
  }
  if (session.top_issue) {
    const n = normalizeIssueArea(session.top_issue)
    if (n) areas.add(n)
  }
  return [...areas]
}

function computeImprovementPts(sessions: AnalysisRow[]): {
  pts: number
  method: 'issues_fixed' | 'score_velocity' | 'none'
  fixedAreas: string[]
  velocity: number | null
} {
  if (sessions.length === 0) {
    return { pts: 0, method: 'none', fixedAreas: [], velocity: null }
  }

  const sorted = [...sessions].sort(
    (a, b) =>
      new Date(String(a.analyzed_at)).getTime() -
      new Date(String(b.analyzed_at)).getTime(),
  )
  const latest = sorted[sorted.length - 1]
  const latestAt = new Date(String(latest.analyzed_at))
  const latestAreas = new Set(extractIssueAreas(latest))

  const occurrenceMap = new Map<
    string,
    { count: number; earliest: Date; label: string }
  >()

  for (const s of sorted.slice(0, -1)) {
    const at = new Date(String(s.analyzed_at))
    for (const area of extractIssueAreas(s)) {
      const prev = occurrenceMap.get(area)
      const firstIssue = (
        s.full_result as { areas_to_improve?: Array<{ area?: string } | string> } | null
      )?.areas_to_improve?.[0]
      const label =
        firstIssue && typeof firstIssue === 'object'
          ? String(firstIssue.area ?? area)
          : area
      if (!prev) {
        occurrenceMap.set(area, { count: 1, earliest: at, label })
      } else {
        prev.count += 1
        if (at < prev.earliest) prev.earliest = at
      }
    }
  }

  const fixedAreas: string[] = []
  for (const [area, meta] of occurrenceMap) {
    if (meta.count < 2) continue
    if (latestAreas.has(area)) continue
    const daysSpan = differenceInCalendarDays(latestAt, meta.earliest)
    if (daysSpan < 14) continue
    fixedAreas.push(meta.label || area)
  }

  if (fixedAreas.length > 0) {
    return {
      pts: Math.min(5, fixedAreas.length),
      method: 'issues_fixed',
      fixedAreas,
      velocity: null,
    }
  }

  const scored = sorted.filter(s => s.overall_score != null)
  if (scored.length >= 2) {
    const first = Number(scored[0].overall_score)
    const last = Number(scored[scored.length - 1].overall_score)
    const velocity = last - first
    const pts = Math.min(5, Math.max(0, velocity / 4))
    return { pts, method: 'score_velocity', fixedAreas: [], velocity }
  }

  return { pts: 0, method: 'none', fixedAreas: [], velocity: null }
}

function computeDrillPts(
  assigned: number,
  completed: number,
): { pts: number; rate: number } {
  if (assigned <= 0) return { pts: 0, rate: 0 }
  const rate = Math.min(1, completed / assigned)
  return { pts: rate * 4, rate }
}

export async function syncCoachabilityForPlayer(
  supabase: SupabaseClient,
  playerId: string,
  options?: { triggerRecalc?: boolean },
): Promise<CoachabilitySyncResult> {
  const since = subDays(new Date(), 90)
  const sinceIso = since.toISOString()
  const nowIso = new Date().toISOString()

  const [
    { data: sessionsRaw },
    { data: drillsRaw },
    { data: lessonsRaw },
  ] = await Promise.all([
    supabase
      .from('analysis_sessions')
      .select('id, analyzed_at, overall_score, top_issue, full_result')
      .eq('player_id', playerId)
      .not('overall_score', 'is', null)
      .gte('analyzed_at', sinceIso)
      .or(PLAYER_VISIBLE_SESSIONS_FILTER)
      .order('analyzed_at', { ascending: true }),
    supabase
      .from('drills')
      .select('id, created_at, completed_at')
      .eq('player_id', playerId)
      .gte('created_at', sinceIso),
    supabase
      .from('lessons')
      .select('id, starts_at, status')
      .eq('player_id', playerId)
      .eq('status', 'completed')
      .gte('starts_at', sinceIso)
      .lte('starts_at', nowIso),
  ])

  const sessions = (sessionsRaw ?? []) as AnalysisRow[]
  const drills = drillsRaw ?? []
  const lessons = lessonsRaw ?? []

  const drillsAssigned = drills.length
  const drillsCompleted = drills.filter(d => d.completed_at != null).length
  const lessonsCompleted = lessons.length
  const reelCount = sessions.length

  const hasEngagement =
    reelCount > 0 || drillsAssigned > 0 || lessonsCompleted > 0

  if (!hasEngagement) {
    return {
      written: false,
      points: {
        improvement_pts: 0,
        drill_pts: 0,
        lesson_pts: 0,
        reel_pts: 0,
        total_pts: 0,
      },
      metadata: { reason: 'no_engagement_90d' },
    }
  }

  const improvement = computeImprovementPts(sessions)
  const drill = computeDrillPts(drillsAssigned, drillsCompleted)
  const lessonPts = Math.min(3, lessonsCompleted)
  const reelPts = Math.min(3, reelCount)

  const points: CoachabilityPointBreakdown = {
    improvement_pts: improvement.pts,
    drill_pts: drill.pts,
    lesson_pts: lessonPts,
    reel_pts: reelPts,
    total_pts: Math.min(
      15,
      improvement.pts + drill.pts + lessonPts + reelPts,
    ),
  }

  const metadata: Record<string, unknown> = {
    window_days: 90,
    improvement_method: improvement.method,
    issues_fixed: improvement.fixedAreas,
    score_velocity: improvement.velocity,
    drills_assigned_90d: drillsAssigned,
    drills_completed_90d: drillsCompleted,
    drill_completion_rate: drill.rate,
    lessons_completed_90d: lessonsCompleted,
    reels_analyzed_90d: reelCount,
  }

  const triggerRecalc = options?.triggerRecalc !== false
  const inputDefs = [
    {
      inputKey: 'improvement_pts_90d',
      valueNumeric: points.improvement_pts,
      unit: 'pts',
      valueText: JSON.stringify({
        method: improvement.method,
        fixed_areas: improvement.fixedAreas,
        velocity: improvement.velocity,
      }),
    },
    {
      inputKey: 'drill_pts_90d',
      valueNumeric: points.drill_pts,
      unit: 'pts',
      valueText: JSON.stringify({
        assigned: drillsAssigned,
        completed: drillsCompleted,
        rate: drill.rate,
      }),
    },
    {
      inputKey: 'lesson_pts_90d',
      valueNumeric: points.lesson_pts,
      unit: 'pts',
      valueText: String(lessonsCompleted),
    },
    {
      inputKey: 'reel_pts_90d',
      valueNumeric: points.reel_pts,
      unit: 'pts',
      valueText: String(reelCount),
    },
  ] as const

  for (let i = 0; i < inputDefs.length; i++) {
    const def = inputDefs[i]
    await updateJourneyInput({
      playerId,
      category: 'coachability',
      inputKey: def.inputKey,
      valueNumeric: def.valueNumeric,
      valueText: def.valueText,
      unit: def.unit,
      source: COACHABILITY_SOURCE,
      verified: true,
      triggerRecalc: triggerRecalc && i === inputDefs.length - 1,
    })
  }

  await supabase.from('journey_score_events').insert({
    player_id: playerId,
    event_type: 'input_updated',
    category: 'coachability',
    label: `Coachability sync: ${points.total_pts}/15 pts`,
    detail: JSON.stringify(metadata),
    metadata,
    actor: 'system',
  })

  return { written: true, points, metadata }
}
