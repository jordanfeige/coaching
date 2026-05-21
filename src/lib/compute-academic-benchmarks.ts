import type { SupabaseClient } from '@supabase/supabase-js'

const TIERS = [
  { key: 'ivy', label: 'Ivy League' },
  { key: 'top_25_academic', label: 'Top-25 academic' },
  { key: 'top_100_academic', label: 'Top-100 academic' },
  { key: 'public_state', label: 'Public state' },
] as const

export type AcademicBenchmarkResult = {
  division: string
  satMin: number
  satAvg: number
  gpaFloor: number
  sample: number
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

async function deactivateExisting(
  supabase: SupabaseClient,
  division: string,
  category: string,
  metric: string,
) {
  await supabase
    .from('journey_benchmarks')
    .update({ active: false })
    .eq('sport', 'tennis')
    .eq('division', division)
    .eq('category', category)
    .eq('metric', metric)
    .eq('active', true)
}

async function computeTier(
  supabase: SupabaseClient,
  tier: (typeof TIERS)[number],
): Promise<AcademicBenchmarkResult | null> {
  const { data: schools, error } = await supabase
    .from('schools')
    .select('sat_25th, sat_75th')
    .eq('academic_tier', tier.key)
    .not('sat_25th', 'is', null)

  if (error || !schools?.length) return null

  const sat25 = schools.map(s => Number(s.sat_25th)).filter(n => n > 0)
  const sat75 = schools.map(s => Number(s.sat_75th)).filter(n => n > 0)
  if (sat25.length === 0) return null

  const today = new Date().toISOString().split('T')[0]
  const source = `college_scorecard_${today}`

  const satMin = Math.round(median(sat25) ?? 0)
  const satAvg = Math.round(median(sat75) ?? satMin)
  const gpaFloor = Number(
    Math.min(4.0, Math.max(2.5, 2.0 + (satMin - 800) / 1000)).toFixed(2),
  )

  await deactivateExisting(supabase, tier.key, 'sat', 'min')
  await deactivateExisting(supabase, tier.key, 'sat', 'avg')
  await deactivateExisting(supabase, tier.key, 'gpa', 'min')

  const sample = schools.length
  const { error: insertErr } = await supabase.from('journey_benchmarks').insert([
    {
      sport: 'tennis',
      division: tier.key,
      category: 'sat',
      metric: 'min',
      value: satMin,
      unit: 'sat',
      sample_size: sample,
      source,
      as_of_date: today,
      active: true,
    },
    {
      sport: 'tennis',
      division: tier.key,
      category: 'sat',
      metric: 'avg',
      value: satAvg,
      unit: 'sat',
      sample_size: sample,
      source,
      as_of_date: today,
      active: true,
    },
    {
      sport: 'tennis',
      division: tier.key,
      category: 'gpa',
      metric: 'min',
      value: gpaFloor,
      unit: 'gpa',
      sample_size: sample,
      source,
      as_of_date: today,
      active: true,
    },
  ])

  if (insertErr) throw insertErr

  return { division: tier.key, satMin, satAvg, gpaFloor, sample }
}

export async function computeAcademicBenchmarksFromSchools(
  supabase: SupabaseClient,
  options?: { log?: (msg: string) => void },
): Promise<AcademicBenchmarkResult[]> {
  const log = options?.log ?? (() => {})
  const results: AcademicBenchmarkResult[] = []

  for (const tier of TIERS) {
    const row = await computeTier(supabase, tier)
    if (row) {
      results.push(row)
      log(
        `  ${tier.label}: SAT ${row.satMin}/${row.satAvg} · GPA floor ${row.gpaFloor} (n=${row.sample})`,
      )
    } else {
      log(`  Skipping ${tier.label} — no SAT data`)
    }
  }

  return results
}
