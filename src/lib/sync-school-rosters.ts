import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getCollegeRoster,
  isPowerConference,
  searchCollegeTeams,
} from '@/lib/utr-colleges'

const UTR_DIVISION_TO_PROGRAM: Record<string, string> = {
  d1: 'd1_mid_major',
  d2: 'd2',
  d3: 'd3',
  naia: 'naia',
  juco: 'juco',
  d1_power: 'd1_power',
  d1_mid_major: 'd1_mid_major',
}

function mapUtrDivisionToProgram(
  utrDivision: string | null,
  conference: string | null,
): string | null {
  if (!utrDivision) return null
  if (utrDivision === 'd1' || utrDivision === 'd1_mid_major') {
    return conference && isPowerConference(conference)
      ? 'd1_power'
      : 'd1_mid_major'
  }
  return UTR_DIVISION_TO_PROGRAM[utrDivision] ?? null
}

export type SyncOneSchoolResult = {
  synced: number
  schoolId: string
  schoolName: string
}

export async function syncOneSchoolRoster(
  supabase: SupabaseClient,
  schoolId: string,
  schoolName: string,
): Promise<SyncOneSchoolResult> {
  let schoolUtrId: string | null = null
  let division: string | null = null
  let conference: string | null = null

  try {
    const candidates = await searchCollegeTeams(schoolName)
    const match =
      candidates.find(
        c => c.name.toLowerCase() === schoolName.toLowerCase(),
      ) ?? candidates[0]

    if (!match) {
      console.log(`  ⚠ ${schoolName}: no UTR team found`)
      return { synced: 0, schoolId, schoolName }
    }

    schoolUtrId = match.schoolUtrId
    division = mapUtrDivisionToProgram(match.division, null)
  } catch (e) {
    console.log(
      `  ⚠ ${schoolName}: search failed`,
      e instanceof Error ? e.message : e,
    )
    return { synced: 0, schoolId, schoolName }
  }

  let roster
  try {
    roster = await getCollegeRoster(schoolUtrId!)
  } catch (e) {
    console.log(
      `  ⚠ ${schoolName}: roster fetch failed`,
      e instanceof Error ? e.message : e,
    )
    return { synced: 0, schoolId, schoolName }
  }

  conference = roster.conference
  division =
    mapUtrDivisionToProgram(roster.division, conference) ?? division

  const today = new Date().toISOString().split('T')[0]
  const sorted = [...roster.rosterPlayers].sort((a, b) => b.utr - a.utr)
  const utrs = sorted.map(p => p.utr).filter(u => u > 0)

  if (utrs.length === 0) {
    return { synced: 0, schoolId, schoolName }
  }

  const rosterRows = sorted.map((p, idx) => ({
    school_id: schoolId,
    school_utr_id: schoolUtrId,
    player_utr_id: p.utrId,
    player_name: p.name,
    player_utr: p.utr,
    class_year: p.classYear,
    position: p.position,
    is_starter: idx < 6,
    as_of_date: today,
    synced_at: new Date().toISOString(),
  }))

  const { error: rosterErr } = await supabase
    .from('school_rosters')
    .upsert(rosterRows, {
      onConflict: 'school_id,player_utr_id,as_of_date',
    })

  if (rosterErr) {
    console.error(`  Roster upsert failed for ${schoolName}:`, rosterErr.message)
    return { synced: 0, schoolId, schoolName }
  }

  const avg = utrs.reduce((a, b) => a + b, 0) / utrs.length
  const starterUtrs = utrs.slice(0, 6)
  const starterAvg =
    starterUtrs.reduce((a, b) => a + b, 0) / starterUtrs.length

  const { error: programErr } = await supabase
    .from('school_tennis_programs')
    .upsert({
      school_id: schoolId,
      school_utr_id: schoolUtrId,
      division,
      conference,
      roster_avg_utr: Math.round(avg * 100) / 100,
      roster_min_utr: Math.min(...utrs),
      roster_max_utr: Math.max(...utrs),
      roster_starter_avg_utr: Math.round(starterAvg * 100) / 100,
      roster_count: utrs.length,
      last_synced_at: new Date().toISOString(),
    })

  if (programErr) {
    console.error(
      `  Program summary upsert failed for ${schoolName}:`,
      programErr.message,
    )
    return { synced: 0, schoolId, schoolName }
  }

  return { synced: rosterRows.length, schoolId, schoolName }
}

export type SyncAllSchoolRostersOptions = {
  paceMs?: number
  limit?: number
  log?: (msg: string) => void
}

export type SyncAllSchoolRostersResult = {
  schoolsProcessed: number
  schoolsWithTennis: number
  totalRosterPlayers: number
}

export async function syncAllSchoolRosters(
  supabase: SupabaseClient,
  options?: SyncAllSchoolRostersOptions,
): Promise<SyncAllSchoolRostersResult> {
  const log = options?.log ?? (() => {})
  const paceMs = options?.paceMs ?? 1000

  let query = supabase
    .from('schools')
    .select('ipeds_id, name')
    .order('name')

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data: schools, error } = await query

  if (error) throw error
  if (!schools?.length) {
    return { schoolsProcessed: 0, schoolsWithTennis: 0, totalRosterPlayers: 0 }
  }

  let schoolsWithTennis = 0
  let totalRosterPlayers = 0

  for (const [i, school] of schools.entries()) {
    if (i % 50 === 0) {
      log(`Progress: ${i}/${schools.length}`)
    }

    const result = await syncOneSchoolRoster(
      supabase,
      school.ipeds_id,
      school.name,
    )

    if (result.synced > 0) {
      schoolsWithTennis++
      totalRosterPlayers += result.synced
    }

    await new Promise(r => setTimeout(r, paceMs))
  }

  return {
    schoolsProcessed: schools.length,
    schoolsWithTennis,
    totalRosterPlayers,
  }
}
