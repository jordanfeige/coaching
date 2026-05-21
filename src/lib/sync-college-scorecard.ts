import type { SupabaseClient } from '@supabase/supabase-js'

const SCORECARD_BASE = 'https://api.data.gov/ed/collegescorecard/v1/schools'
const PAGE_SIZE = 100
const MAX_PAGES = 50

type ScorecardSchool = Record<string, unknown>

const REGIONS: Record<number, string> = {
  1: 'new_england',
  2: 'mid_east',
  3: 'great_lakes',
  4: 'plains',
  5: 'southeast',
  6: 'southwest',
  7: 'rocky_mountains',
  8: 'far_west',
  9: 'outlying_areas',
}

const REGION_BUCKETS: Record<string, string> = {
  new_england: 'northeast',
  mid_east: 'northeast',
  great_lakes: 'midwest',
  plains: 'midwest',
  southeast: 'south',
  southwest: 'south',
  rocky_mountains: 'west',
  far_west: 'west',
  outlying_areas: 'other',
}

const OWNERSHIP: Record<number, string> = {
  1: 'public',
  2: 'private_nonprofit',
  3: 'private_for_profit',
}

const IVY_IPEDS_IDS = new Set([
  '166027',
  '130794',
  '186131',
  '215062',
  '190150',
  '182670',
  '199120',
  '162928',
])

export type ScorecardSyncResult = {
  totalReported: number
  synced: number
  pages: number
}

function num(s: ScorecardSchool, key: string): number | null {
  const v = s[key]
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function str(s: ScorecardSchool, key: string): string | null {
  const v = s[key]
  return v != null ? String(v) : null
}

async function fetchPage(apiKey: string, page: number) {
  const fields = [
    'id',
    'school.name',
    'school.alias',
    'school.city',
    'school.state',
    'school.region_id',
    'school.zip',
    'school.school_url',
    'school.carnegie_basic',
    'school.ownership',
    'latest.student.size',
    'latest.admissions.admission_rate.overall',
    'latest.admissions.sat_scores.25th_percentile.critical_reading',
    'latest.admissions.sat_scores.75th_percentile.critical_reading',
    'latest.admissions.sat_scores.25th_percentile.math',
    'latest.admissions.sat_scores.75th_percentile.math',
    'latest.admissions.act_scores.25th_percentile.cumulative',
    'latest.admissions.act_scores.75th_percentile.cumulative',
    'latest.cost.avg_net_price.overall',
  ].join(',')

  const params = new URLSearchParams({
    api_key: apiKey,
    fields,
    'school.degrees_awarded.predominant': '3',
    'school.operating': '1',
    'latest.student.size__range': '100..',
    per_page: String(PAGE_SIZE),
    page: String(page),
  })

  const res = await fetch(`${SCORECARD_BASE}?${params}`)
  if (!res.ok) {
    throw new Error(`Scorecard API ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }

  return res.json() as Promise<{
    results: ScorecardSchool[]
    metadata: { total: number; page: number }
  }>
}

function computeAcademicTier(school: ScorecardSchool, ipedsId: string): string {
  if (IVY_IPEDS_IDS.has(ipedsId)) return 'ivy'

  const adm = num(school, 'latest.admissions.admission_rate.overall')
  if (adm != null) {
    if (adm < 0.15) return 'top_25_academic'
    if (adm < 0.3) return 'top_100_academic'
  }

  const ownership = num(school, 'school.ownership')
  if (ownership === 1) return 'public_state'

  return 'other'
}

function computeSatComposite(
  school: ScorecardSchool,
  percentile: '25' | '75',
): number | null {
  const reading = num(
    school,
    `latest.admissions.sat_scores.${percentile}th_percentile.critical_reading`,
  )
  const math = num(
    school,
    `latest.admissions.sat_scores.${percentile}th_percentile.math`,
  )
  if (reading == null || math == null) return null
  return Math.round(reading + math)
}

export async function syncCollegeScorecard(
  supabase: SupabaseClient,
  apiKey: string,
  options?: { log?: (msg: string) => void },
): Promise<ScorecardSyncResult> {
  const log = options?.log ?? (() => {})
  const today = new Date().toISOString().split('T')[0]
  let totalReported = 0
  let synced = 0

  for (let page = 0; page < MAX_PAGES; page++) {
    const { results, metadata } = await fetchPage(apiKey, page)
    totalReported = metadata.total
    if (!results?.length) break

    const rows = results.map(s => {
      const ipedsId = String(s.id)
      const regionId = num(s, 'school.region_id')
      const regionText = regionId != null ? REGIONS[regionId] : null
      const regionBucket = regionText
        ? (REGION_BUCKETS[regionText] ?? null)
        : null

      return {
        ipeds_id: ipedsId,
        name: str(s, 'school.name') ?? 'Unknown',
        alias: str(s, 'school.alias'),
        city: str(s, 'school.city'),
        state: str(s, 'school.state'),
        region: regionBucket,
        zip: str(s, 'school.zip'),
        url: str(s, 'school.school_url'),
        carnegie_basic: num(s, 'school.carnegie_basic'),
        control: OWNERSHIP[num(s, 'school.ownership') ?? 0] ?? null,
        size: num(s, 'latest.student.size'),
        admission_rate: num(s, 'latest.admissions.admission_rate.overall'),
        sat_25th: computeSatComposite(s, '25'),
        sat_75th: computeSatComposite(s, '75'),
        act_25th: num(s, 'latest.admissions.act_scores.25th_percentile.cumulative'),
        act_75th: num(s, 'latest.admissions.act_scores.75th_percentile.cumulative'),
        net_price: num(s, 'latest.cost.avg_net_price.overall'),
        academic_tier: computeAcademicTier(s, ipedsId),
        scorecard_as_of: today,
        updated_at: new Date().toISOString(),
      }
    })

    const { error } = await supabase.from('schools').upsert(rows, {
      onConflict: 'ipeds_id',
    })

    if (error) {
      log(`Page ${page} failed: ${error.message}`)
    } else {
      synced += rows.length
      log(`  Page ${page + 1}: synced ${rows.length} (${synced}/${totalReported})`)
    }

    if (synced >= totalReported) break
    await new Promise(r => setTimeout(r, 250))
  }

  return { totalReported, synced, pages: Math.min(MAX_PAGES, Math.ceil(synced / PAGE_SIZE)) }
}
