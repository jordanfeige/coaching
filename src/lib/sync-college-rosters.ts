import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getCollegeSchoolRoster,
  listAllCollegeTeams,
  mapCollegeToJourneyDivision,
  type CollegeTeam,
} from './utr-colleges'

const PACE_MS = 200

export type RosterSyncDivisionResult = {
  division: string
  avg: number
  topQuartile: number
  sampleSize: number
  rosterHits: number
  teamCount: number
  rosterMisses: number
}

export type RosterSyncResult = {
  programsFound: number
  mensTeams: number
  skippedDivision: number
  divisions: RosterSyncDivisionResult[]
  activeBenchmarkRows: number
}

function isMensTeam(team: CollegeTeam): boolean {
  const g = team.gender.toLowerCase()
  return g === 'male' || g === 'm' || g.includes('men')
}

export async function syncCollegeRostersToBenchmarks(
  supabase: SupabaseClient,
  options?: { paceMs?: number; log?: (msg: string) => void },
): Promise<RosterSyncResult> {
  const log = options?.log ?? (() => {})
  const paceMs = options?.paceMs ?? PACE_MS
  const today = new Date().toISOString().split('T')[0]

  const teams = await listAllCollegeTeams()
  const mensTeams = teams.filter(isMensTeam)
  log(`Found ${teams.length} programs (${mensTeams.length} men's)`)

  const byDivision: Record<string, CollegeTeam[]> = {}
  let skippedDivision = 0

  for (const t of mensTeams) {
    const div = mapCollegeToJourneyDivision(t.divisionName, t.conferenceName)
    if (!div) {
      skippedDivision++
      continue
    }
    if (!byDivision[div]) byDivision[div] = []
    byDivision[div].push(t)
  }

  if (skippedDivision > 0) {
    log(`Skipped ${skippedDivision} teams with unmapped division labels`)
  }

  const divisions: RosterSyncDivisionResult[] = []

  for (const [division, divisionTeams] of Object.entries(byDivision)) {
    const utrs: number[] = []
    let rosterHits = 0
    let rosterMisses = 0

    for (const team of divisionTeams) {
      try {
        let players = team.embeddedRoster

        if (!players?.length) {
          const roster = await getCollegeSchoolRoster(team.clubId)
          if (!roster) {
            rosterMisses++
            await new Promise(r => setTimeout(r, paceMs))
            continue
          }
          players = roster.players
          await new Promise(r => setTimeout(r, paceMs))
        }

        rosterHits++
        for (const p of players) {
          if (p.singlesUtr > 0) utrs.push(p.singlesUtr)
        }
      } catch (e) {
        log(
          `Failed roster for ${team.name}: ${e instanceof Error ? e.message : e}`,
        )
        rosterMisses++
        await new Promise(r => setTimeout(r, paceMs))
      }
    }

    if (utrs.length === 0) {
      log(`No UTR data for ${division} (${divisionTeams.length} teams), skipping`)
      continue
    }

    const avg = utrs.reduce((a, b) => a + b, 0) / utrs.length
    const sorted = utrs.slice().sort((a, b) => a - b)
    const topQuartile =
      sorted[Math.floor(sorted.length * 0.75)] ?? sorted[sorted.length - 1]

    await supabase
      .from('journey_benchmarks')
      .update({ active: false })
      .eq('sport', 'tennis')
      .eq('division', division)
      .eq('category', 'utr')
      .eq('active', true)

    const { error } = await supabase.from('journey_benchmarks').insert([
      {
        sport: 'tennis',
        division,
        category: 'utr',
        metric: 'avg',
        value: Number(avg.toFixed(2)),
        unit: 'utr_points',
        sample_size: utrs.length,
        source: 'utr_api_roster_sync',
        as_of_date: today,
        active: true,
      },
      {
        sport: 'tennis',
        division,
        category: 'utr',
        metric: 'top_quartile',
        value: Number(topQuartile.toFixed(2)),
        unit: 'utr_points',
        sample_size: utrs.length,
        source: 'utr_api_roster_sync',
        as_of_date: today,
        active: true,
      },
    ])

    if (error) {
      log(`Insert failed for ${division}: ${error.message}`)
      continue
    }

    const row: RosterSyncDivisionResult = {
      division,
      avg: Number(avg.toFixed(2)),
      topQuartile: Number(topQuartile.toFixed(2)),
      sampleSize: utrs.length,
      rosterHits,
      teamCount: divisionTeams.length,
      rosterMisses,
    }
    divisions.push(row)
    log(
      `  ✓ ${division}: avg=${row.avg} top_q=${row.topQuartile} ` +
        `(n=${row.sampleSize}, ${rosterHits}/${divisionTeams.length} rosters)`,
    )
  }

  const { count } = await supabase
    .from('journey_benchmarks')
    .select('*', { count: 'exact', head: true })
    .eq('sport', 'tennis')
    .eq('category', 'utr')
    .eq('source', 'utr_api_roster_sync')
    .eq('active', true)

  return {
    programsFound: teams.length,
    mensTeams: mensTeams.length,
    skippedDivision,
    divisions,
    activeBenchmarkRows: count ?? 0,
  }
}
