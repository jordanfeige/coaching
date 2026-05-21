import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  computeAge,
  computeAgeAt,
  forecastUtr,
} from '@/lib/utr-forecast'

export const MATCH_WEIGHTS = {
  tennis: 0.4,
  academic: 0.3,
  division: 0.15,
  geography: 0.15,
} as const

export type MatchBucket = 'likely' | 'target' | 'reach' | 'below'

export type MatchScore = {
  schoolId: string
  matchScore: number
  bucket: MatchBucket
  tennisFit: number
  academicFit: number
  divisionFit: number
  geoFit: number
  rosterAvg: number | null
  rationale: string
}

export type PlayerSnapshot = {
  utr: number | null
  projectedUtr: number | null
  classYear: number | null
  currentAge: number | null
  graduationAge: number | null
  gpa: number | null
  sat: number | null
  targetDivision: string | null
  targetAcademicTier: string | null
  targetGeography: string | null
  targetState: string | null
}

function tennisUtrForMatching(player: PlayerSnapshot): number | null {
  if (player.utr == null) return null
  if (
    player.currentAge != null &&
    player.graduationAge != null &&
    player.graduationAge > player.currentAge
  ) {
    return forecastUtr(player.utr, player.currentAge, player.graduationAge)
  }
  return player.utr
}

type SchoolForMatching = {
  id: string
  name: string
  state: string | null
  region: string | null
  academic_tier: string | null
  admission_rate: number | null
  sat_25th: number | null
  sat_75th: number | null
  tp_division: string | null
  tp_roster_avg_utr: number | null
  tp_roster_starter_avg_utr: number | null
  tp_conference: string | null
}

const REGION_ALIASES: Record<string, string[]> = {
  northeast: ['northeast', 'new_england', 'mid_east'],
  midwest: ['midwest', 'great_lakes', 'plains'],
  south: ['south', 'southeast', 'southwest'],
  west: ['west', 'rocky_mountains', 'far_west'],
}

export function scoreTennisFit(
  player: PlayerSnapshot,
  school: SchoolForMatching,
): number {
  const projected = tennisUtrForMatching(player)
  if (projected == null || school.tp_roster_starter_avg_utr == null) return 0

  const gap = projected - school.tp_roster_starter_avg_utr
  if (gap >= 1.0) return 95
  if (gap >= 0.5) return 85
  if (gap >= 0.0) return 75
  if (gap >= -0.5) return 65
  if (gap >= -1.0) return 50
  if (gap >= -1.5) return 38
  if (gap >= -2.0) return 25
  if (gap >= -2.5) return 15
  if (gap >= -3.0) return 5
  return 0
}

export function scoreAcademicFit(
  player: PlayerSnapshot,
  school: SchoolForMatching,
): number {
  if (player.sat == null && player.gpa == null) return 50
  if (school.sat_25th == null || school.sat_75th == null) return 60

  if (player.sat != null) {
    if (player.sat >= school.sat_75th) return 90
    if (player.sat >= (school.sat_25th + school.sat_75th) / 2) return 80
    if (player.sat >= school.sat_25th) return 65
    if (player.sat >= school.sat_25th - 50) return 50
    if (player.sat >= school.sat_25th - 100) return 35
    return 20
  }

  if (player.gpa != null && player.gpa >= 3.8) return 75
  if (player.gpa != null && player.gpa >= 3.5) return 65
  if (player.gpa != null && player.gpa >= 3.2) return 55
  return 40
}

export function scoreDivisionFit(
  player: PlayerSnapshot,
  school: SchoolForMatching,
): number {
  if (!player.targetDivision || player.targetDivision === 'not_sure') return 70
  if (!school.tp_division) return 50
  if (player.targetDivision === school.tp_division) return 100

  const adjacency: Record<string, string[]> = {
    d1_power: ['d1_mid_major'],
    d1_mid_major: ['d1_power', 'd2'],
    d2: ['d1_mid_major', 'd3'],
    d3: ['d2', 'naia'],
    naia: ['d3', 'juco'],
    juco: ['naia'],
  }
  if (adjacency[player.targetDivision]?.includes(school.tp_division)) return 65
  return 30
}

export function scoreGeographyFit(
  player: PlayerSnapshot,
  school: SchoolForMatching,
): number {
  if (!player.targetGeography || player.targetGeography === 'anywhere') return 100

  if (player.targetGeography === 'specific_state' && player.targetState) {
    const want = player.targetState.trim().toUpperCase()
    if ((school.state ?? '').toUpperCase() === want) return 100
    return 25
  }

  if (player.targetGeography === 'specific_region' && player.targetState) {
    const bucket = player.targetState.toLowerCase()
    const aliases = REGION_ALIASES[bucket] ?? [bucket]
    if (school.region && aliases.includes(school.region.toLowerCase())) return 100
    return 30
  }

  return 70
}

export function bucketFromScore(matchScore: number): MatchBucket {
  if (matchScore >= 80) return 'likely'
  if (matchScore >= 60) return 'target'
  if (matchScore >= 40) return 'reach'
  return 'below'
}

export function generateRationale(
  player: PlayerSnapshot,
  school: SchoolForMatching,
  bucket: MatchBucket,
): string {
  const parts: string[] = []

  const projected = tennisUtrForMatching(player)
  if (school.tp_roster_starter_avg_utr != null && projected != null) {
    const gap = projected - school.tp_roster_starter_avg_utr
    if (gap >= 0.5) {
      parts.push(
        `Projected UTR ${projected.toFixed(1)} is above their roster avg of ${school.tp_roster_starter_avg_utr}`,
      )
    } else if (gap >= -0.5) {
      parts.push(
        `Projected UTR ${projected.toFixed(1)} is at their roster level (${school.tp_roster_starter_avg_utr})`,
      )
    } else if (gap >= -1.5) {
      parts.push(
        `Projected UTR ${projected.toFixed(1)} sits ${Math.abs(gap).toFixed(1)} below their roster avg`,
      )
    } else {
      parts.push(
        `Projected UTR gap of ${Math.abs(gap).toFixed(1)} from their roster`,
      )
    }
  }

  if (
    player.sat != null &&
    school.sat_25th != null &&
    school.sat_75th != null
  ) {
    if (player.sat >= school.sat_75th) {
      parts.push('SAT above their 75th percentile')
    } else if (player.sat >= school.sat_25th) {
      parts.push('SAT within their admitted range')
    } else {
      parts.push(`SAT below their 25th percentile (${school.sat_25th})`)
    }
  }

  const summary =
    bucket === 'likely'
      ? 'Likely roster fit.'
      : bucket === 'target'
        ? 'Roster competitive.'
        : bucket === 'reach'
          ? 'Real stretch.'
          : 'Below typical fit.'

  return parts.length > 0 ? `${summary} ${parts.join(' · ')}` : summary
}

function parseTennisProgram(raw: unknown): {
  division: string | null
  roster_avg_utr: number | null
  roster_starter_avg_utr: number | null
  conference: string | null
} {
  const row = Array.isArray(raw) ? raw[0] : raw
  if (!row || typeof row !== 'object') {
    return {
      division: null,
      roster_avg_utr: null,
      roster_starter_avg_utr: null,
      conference: null,
    }
  }
  const t = row as Record<string, unknown>
  return {
    division: typeof t.division === 'string' ? t.division : null,
    roster_avg_utr:
      t.roster_avg_utr != null ? Number(t.roster_avg_utr) : null,
    roster_starter_avg_utr:
      t.roster_starter_avg_utr != null
        ? Number(t.roster_starter_avg_utr)
        : null,
    conference: typeof t.conference === 'string' ? t.conference : null,
  }
}

function parseGradYear(raw: unknown): number | null {
  if (raw == null) return null
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  const n = parseInt(String(raw).replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

export async function buildPlayerSnapshot(
  supabase: SupabaseClient,
  playerId: string,
): Promise<PlayerSnapshot> {
  const [{ data: inputs }, { data: prefs }, { data: playerRow }, { data: recruiting }] =
    await Promise.all([
      supabase
        .from('journey_score_inputs')
        .select('category, input_key, value_numeric')
        .eq('player_id', playerId),
      supabase
        .from('journey_preferences')
        .select(
          'target_division, target_academic_tier, target_geography, target_state',
        )
        .eq('player_id', playerId)
        .maybeSingle(),
      supabase
        .from('players')
        .select('birth_date')
        .eq('id', playerId)
        .maybeSingle(),
      supabase
        .from('recruiting_profiles')
        .select('grad_year')
        .eq('player_id', playerId)
        .maybeSingle(),
    ])

  const utr = inputs?.find(
    i => i.category === 'tennis' && i.input_key === 'utr_rating',
  )?.value_numeric
  const gpa = inputs?.find(
    i => i.category === 'academics' && i.input_key === 'gpa',
  )?.value_numeric
  const sat = inputs?.find(
    i => i.category === 'academics' && i.input_key === 'sat',
  )?.value_numeric

  const classYear = parseGradYear(recruiting?.grad_year)
  let currentAge: number | null = null
  let graduationAge: number | null = null

  if (playerRow?.birth_date) {
    currentAge = computeAge(playerRow.birth_date)
    graduationAge =
      classYear != null
        ? computeAgeAt(
            playerRow.birth_date,
            new Date(`${classYear}-06-01T12:00:00`),
          )
        : Math.min(18, currentAge + 5)
  }

  const utrNum = utr != null ? Number(utr) : null
  const projectedUtr =
    utrNum != null && currentAge != null && graduationAge != null
      ? forecastUtr(utrNum, currentAge, graduationAge)
      : utrNum

  return {
    utr: utrNum,
    projectedUtr,
    classYear,
    currentAge,
    graduationAge,
    gpa: gpa != null ? Number(gpa) : null,
    sat: sat != null ? Number(sat) : null,
    targetDivision: prefs?.target_division ?? null,
    targetAcademicTier: prefs?.target_academic_tier ?? null,
    targetGeography: prefs?.target_geography ?? null,
    targetState: prefs?.target_state ?? null,
  }
}

export async function computeCollegeMatches(
  playerId: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<MatchScore[]> {
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const player = await buildPlayerSnapshot(supabase, playerId)

  const { data: schools, error } = await supabase
    .from('schools')
    .select(
      `
      ipeds_id, name, state, region, academic_tier,
      admission_rate, sat_25th, sat_75th,
      school_tennis_programs (
        division, roster_avg_utr, roster_starter_avg_utr, conference
      )
    `,
    )
    .eq('has_tennis_program', true)

  if (error) throw error
  if (!schools?.length) return []

  const results: MatchScore[] = []

  for (const s of schools) {
    const tp = parseTennisProgram(s.school_tennis_programs)
    const school: SchoolForMatching = {
      id: s.ipeds_id as string,
      name: s.name as string,
      state: s.state as string | null,
      region: s.region as string | null,
      academic_tier: s.academic_tier as string | null,
      admission_rate:
        s.admission_rate != null ? Number(s.admission_rate) : null,
      sat_25th: s.sat_25th != null ? Number(s.sat_25th) : null,
      sat_75th: s.sat_75th != null ? Number(s.sat_75th) : null,
      tp_division: tp.division,
      tp_roster_avg_utr: tp.roster_avg_utr,
      tp_roster_starter_avg_utr: tp.roster_starter_avg_utr,
      tp_conference: tp.conference,
    }

    const tennisFit = scoreTennisFit(player, school)
    const academicFit = scoreAcademicFit(player, school)
    const divisionFit = scoreDivisionFit(player, school)
    const geoFit = scoreGeographyFit(player, school)

    const composite =
      tennisFit * MATCH_WEIGHTS.tennis +
      academicFit * MATCH_WEIGHTS.academic +
      divisionFit * MATCH_WEIGHTS.division +
      geoFit * MATCH_WEIGHTS.geography

    const matchScore = Math.round(composite * 100) / 100
    const bucket = bucketFromScore(matchScore)

    results.push({
      schoolId: school.id,
      matchScore,
      bucket,
      tennisFit,
      academicFit,
      divisionFit,
      geoFit,
      rosterAvg: school.tp_roster_starter_avg_utr,
      rationale: generateRationale(player, school, bucket),
    })
  }

  results.sort((a, b) => b.matchScore - a.matchScore)

  const rows = results.map(r => ({
    player_id: playerId,
    school_id: r.schoolId,
    match_score: r.matchScore,
    bucket: r.bucket,
    tennis_fit: r.tennisFit,
    academic_fit: r.academicFit,
    division_fit: r.divisionFit,
    geo_fit: r.geoFit,
    player_utr_snapshot: player.utr,
    player_projected_utr: player.projectedUtr,
    player_class_year: player.classYear,
    player_gpa_snapshot: player.gpa,
    player_sat_snapshot: player.sat,
    school_roster_avg: r.rosterAvg,
    rationale: r.rationale,
    computed_at: new Date().toISOString(),
  }))

  for (let i = 0; i < rows.length; i += 500) {
    const { error: upsertErr } = await supabase
      .from('college_matches')
      .upsert(rows.slice(i, i + 500), { onConflict: 'player_id,school_id' })
    if (upsertErr) throw upsertErr
  }

  return results
}
