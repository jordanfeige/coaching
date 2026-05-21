import type { SupabaseClient } from '@supabase/supabase-js'
import type { JourneyBreakdown } from '@/lib/journey-score'
import { getWeekStart } from '@/lib/week-boundary'

export type PlannedDay = {
  date: string
  letter: string
  num: number
  status: 'done' | 'active' | 'upcoming'
  drillCount: number
}

export type WeeklyPlanDrill = {
  id: string
  title: string
  duration_minutes: number
  category: string
}

export type WeeklyPlanPayload = {
  days: PlannedDay[]
  today: { drills: WeeklyPlanDrill[]; totalMinutes: number }
  focus: string
}

const LETTERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const

const FOCUS_BY_CATEGORY: Record<string, string> = {
  tennis: 'Tennis skill — UTR development',
  academics: 'Academic readiness — GPA and test scores',
  coachability:
    "Coachability is your lowest sub-score. Today's drills target reel responsiveness.",
  exposure: 'Exposure — quality wins at higher events',
}

function drillCategoryFromRow(row: {
  title: string
  description: string | null
}): string {
  const desc = row.description ?? ''
  const focus = desc.match(/focus[:\s]+([^·.]+)/i)
  if (focus) return focus[1].trim().toLowerCase()
  const title = row.title.toLowerCase()
  if (/serve|volley|forehand|backhand|rally/i.test(title)) {
    const m = title.match(/(serve|volley|forehand|backhand|rally)/i)
    if (m) return m[1].toLowerCase()
  }
  return 'practice'
}

function drillDurationMinutes(description: string | null): number {
  const desc = description ?? ''
  const sets = desc.match(/(\d+)\s*sets/i)
  if (sets) return Math.min(45, 10 + Number(sets[1]) * 5)
  return 15
}

function computeFocus(breakdown: JourneyBreakdown | null): string {
  const categories = breakdown?.categories ?? []
  if (categories.length === 0) return 'Building your plan'

  const lowest = [...categories].sort(
    (a, b) => (a.raw_pct ?? 0) - (b.raw_pct ?? 0),
  )[0]
  if (!lowest?.key) return 'Improving across the board'
  return FOCUS_BY_CATEGORY[lowest.key] ?? 'Improving across the board'
}

export async function loadPlayerWeeklyPlan(
  supabase: SupabaseClient,
  playerId: string,
): Promise<WeeklyPlanPayload> {
  const today = new Date()
  const weekStart = getWeekStart(today)
  const todayKey = today.toDateString()

  const [{ data: openDrills }, { data: completedDrills }, { data: rating }] =
    await Promise.all([
      supabase
        .from('drills')
        .select('id, title, description, created_at, completed_at')
        .eq('player_id', playerId)
        .is('completed_at', null)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('drills')
        .select('completed_at')
        .eq('player_id', playerId)
        .not('completed_at', 'is', null)
        .gte('completed_at', weekStart.toISOString()),
      supabase
        .from('journey_ratings')
        .select('breakdown')
        .eq('player_id', playerId)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  const completionsByDay = new Map<string, number>()
  for (const row of completedDrills ?? []) {
    if (!row.completed_at) continue
    const key = new Date(row.completed_at).toDateString()
    completionsByDay.set(key, (completionsByDay.get(key) ?? 0) + 1)
  }

  const days: PlannedDay[] = []
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    const dateKey = date.toDateString()
    const drillCount = completionsByDay.get(dateKey) ?? 0
    let status: PlannedDay['status'] = 'upcoming'
    if (dateKey === todayKey) status = 'active'
    else if (date < today) status = 'done'

    days.push({
      date: date.toISOString(),
      letter: LETTERS[i],
      num: date.getDate(),
      status,
      drillCount,
    })
  }

  const todayDrills: WeeklyPlanDrill[] = (openDrills ?? []).map(d => ({
    id: d.id,
    title: d.title,
    duration_minutes: drillDurationMinutes(d.description),
    category: drillCategoryFromRow(d),
  }))

  const totalMinutes = todayDrills.reduce(
    (sum, d) => sum + d.duration_minutes,
    0,
  )

  const breakdown = rating?.breakdown as JourneyBreakdown | null

  return {
    days,
    today: { drills: todayDrills, totalMinutes },
    focus: computeFocus(breakdown),
  }
}
