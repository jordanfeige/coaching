import type { SupabaseClient } from '@supabase/supabase-js'

const BRACKET_GROWTH = {
  '10U': 0.8,
  '12U': 0.7,
  '14U': 0.6,
  '16U': 0.4,
  '18U': 0.3,
} as const

export type BracketKey = keyof typeof BRACKET_GROWTH

export function bracketForAge(age: number): BracketKey {
  if (age <= 10) return '10U'
  if (age <= 12) return '12U'
  if (age <= 14) return '14U'
  if (age <= 16) return '16U'
  return '18U'
}

/** 1 = first year in bracket, 2 = second year (matches cohort_benchmarks). */
export function yearInBracketForAge(age: number): 1 | 2 {
  return Math.ceil(age) % 2 === 0 ? 2 : 1
}

export function forecastUtr(
  currentUtr: number,
  currentAge: number,
  targetAge: number,
): number {
  if (targetAge <= currentAge) return currentUtr

  let utr = currentUtr
  let age = currentAge

  while (age < targetAge) {
    const nextAge = Math.min(Math.ceil(age + 0.001), targetAge)
    const years = nextAge - age
    const rate = BRACKET_GROWTH[bracketForAge(nextAge)]
    utr += rate * years
    age = nextAge
  }

  return Math.round(utr * 100) / 100
}

export function forecastTrajectory(
  currentUtr: number,
  currentAge: number,
  graduationAge: number,
): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [{ age: currentAge, utr: currentUtr }]
  const startYear = Math.ceil(currentAge)
  for (let age = startYear; age <= graduationAge; age++) {
    points.push({
      age,
      utr: forecastUtr(currentUtr, currentAge, age),
    })
  }
  return points
}

export type TrajectoryPoint = { age: number; utr: number }

export type PlayerTrajectoryDataset = {
  player: {
    currentUtr: number
    currentAge: number
    graduationAge: number
    classYear: number
    bracket: string
    yearInBracket: number
    forecastUtrAtGraduation: number
  }
  history: TrajectoryPoint[]
  forecast: TrajectoryPoint[]
  peerCohort: TrajectoryPoint[]
  goalTrack: TrajectoryPoint[] | null
  goalKey: string | null
  goalLabel: string | null
  academics: {
    gpa: number | null
    sat: number | null
  }
}

export function computeAge(birthDate: string, asOf: Date = new Date()): number {
  return computeAgeAt(birthDate, asOf)
}

export function computeAgeAt(birthDate: string, at: Date): number {
  const b = new Date(`${birthDate}T12:00:00`)
  if (Number.isNaN(b.getTime())) return 12
  const diffMs = at.getTime() - b.getTime()
  return Math.round((diffMs / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10
}

function parseGradYear(raw: string | number | null | undefined): number | null {
  if (raw == null) return null
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  const s = String(raw)
  if (s.includes('2030')) return 2030
  const n = parseInt(s.replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

const COMPETITIVE_GOALS = new Set([
  'recruited_college',
  'scholarship_smaller',
  'win_highest_level',
  'improve_have_fun',
])

export type TrajectoryMissing = 'birth_date' | 'utr'

export async function diagnoseTrajectoryGaps(
  playerId: string,
  supabase: SupabaseClient,
): Promise<TrajectoryMissing[]> {
  const [{ data: utrInput }, { data: playerRow }] = await Promise.all([
    supabase
      .from('journey_score_inputs')
      .select('value_numeric')
      .eq('player_id', playerId)
      .eq('category', 'tennis')
      .eq('input_key', 'utr_rating')
      .maybeSingle(),
    supabase.from('players').select('birth_date, utr_singles').eq('id', playerId).maybeSingle(),
  ])

  const missing: TrajectoryMissing[] = []
  if (!playerRow?.birth_date) missing.push('birth_date')

  const utrFromInput =
    utrInput?.value_numeric != null && Number(utrInput.value_numeric) > 0
      ? Number(utrInput.value_numeric)
      : null
  const utrFromPlayer =
    playerRow?.utr_singles != null && Number(playerRow.utr_singles) > 0
      ? Number(playerRow.utr_singles)
      : null
  if (utrFromInput == null && utrFromPlayer == null) missing.push('utr')

  return missing
}

export async function computePlayerTrajectory(
  playerId: string,
  supabase: SupabaseClient,
): Promise<PlayerTrajectoryDataset | null> {
  const missing = await diagnoseTrajectoryGaps(playerId, supabase)
  if (missing.length > 0) return null

  const [{ data: utrInput }, { data: playerRow }, { data: prefs }, { data: recruiting }] =
    await Promise.all([
      supabase
        .from('journey_score_inputs')
        .select('value_numeric, captured_at')
        .eq('player_id', playerId)
        .eq('category', 'tennis')
        .eq('input_key', 'utr_rating')
        .maybeSingle(),
      supabase
        .from('players')
        .select('birth_date, utr_singles')
        .eq('id', playerId)
        .maybeSingle(),
      supabase
        .from('journey_preferences')
        .select('primary_goal')
        .eq('player_id', playerId)
        .maybeSingle(),
      supabase
        .from('recruiting_profiles')
        .select('grad_year')
        .eq('player_id', playerId)
        .maybeSingle(),
    ])

  if (!playerRow?.birth_date) return null

  const utrFromInput =
    utrInput?.value_numeric != null && Number(utrInput.value_numeric) > 0
      ? Number(utrInput.value_numeric)
      : null
  const utrFromPlayer =
    playerRow.utr_singles != null && Number(playerRow.utr_singles) > 0
      ? Number(playerRow.utr_singles)
      : null
  const latestUtr = utrFromInput ?? utrFromPlayer
  if (latestUtr == null) return null

  const [{ data: gpaRow }, { data: satRow }] = await Promise.all([
    supabase
      .from('journey_score_inputs')
      .select('value_numeric')
      .eq('player_id', playerId)
      .eq('category', 'academics')
      .eq('input_key', 'gpa')
      .maybeSingle(),
    supabase
      .from('journey_score_inputs')
      .select('value_numeric')
      .eq('player_id', playerId)
      .eq('category', 'academics')
      .eq('input_key', 'sat')
      .maybeSingle(),
  ])

  const gradYear = parseGradYear(recruiting?.grad_year)
  const currentAge = computeAge(playerRow.birth_date)
  const graduationAge =
    gradYear != null
      ? computeAgeAt(
          playerRow.birth_date,
          new Date(`${gradYear}-06-01T12:00:00`),
        )
      : Math.min(18, currentAge + 5)

  const classYear =
    gradYear ??
    new Date().getFullYear() + Math.max(1, Math.round(graduationAge - currentAge))

  const history: TrajectoryPoint[] = []
  if (utrInput?.captured_at && utrFromInput != null) {
    const ageAtInput = computeAgeAt(
      playerRow.birth_date,
      new Date(utrInput.captured_at),
    )
    if (ageAtInput > 0 && ageAtInput <= currentAge + 0.5) {
      history.push({
        age: Math.round(ageAtInput * 10) / 10,
        utr: utrFromInput,
      })
    }
  }
  if (history.length === 0 || history[history.length - 1].age < currentAge) {
    history.push({ age: currentAge, utr: latestUtr })
  }

  const forecast = forecastTrajectory(latestUtr, currentAge, graduationAge)
  const forecastUtrAtGraduation =
    forecast.length > 0 ? forecast[forecast.length - 1].utr : latestUtr

  const { data: cohort } = await supabase
    .from('cohort_benchmarks')
    .select('age, utr_threshold')
    .order('age')

  const peerCohort: TrajectoryPoint[] = (cohort ?? []).map(c => ({
    age: c.age,
    utr: Number(c.utr_threshold),
  }))

  let goalTrack: TrajectoryPoint[] | null = null
  let goalKey: string | null = null
  let goalLabel: string | null = null

  const goal = prefs?.primary_goal ?? null
  if (goal && COMPETITIVE_GOALS.has(goal)) {
    const { data: track } = await supabase
      .from('goal_tracks')
      .select('age, utr_target, label')
      .eq('goal_key', goal)
      .order('age')

    if (track?.length) {
      goalTrack = track.map(t => ({
        age: t.age,
        utr: Number(t.utr_target),
      }))
      goalKey = goal
      goalLabel = track[0].label
    }
  }

  const bracket = bracketForAge(currentAge)
  const yearInBracket = Math.ceil(currentAge) % 2 === 0 ? 2 : 1

  return {
    player: {
      currentUtr: latestUtr,
      currentAge,
      graduationAge,
      classYear,
      bracket,
      yearInBracket,
      forecastUtrAtGraduation,
    },
    history,
    forecast,
    peerCohort,
    goalTrack,
    goalKey,
    goalLabel,
    academics: {
      gpa:
        gpaRow?.value_numeric != null ? Number(gpaRow.value_numeric) : null,
      sat:
        satRow?.value_numeric != null ? Number(satRow.value_numeric) : null,
    },
  }
}
