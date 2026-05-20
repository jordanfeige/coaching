// One-time seed of tennis benchmarks with Playvia estimates.
// These get OVERWRITTEN by the UTR API roster sync in M1d.
// Run with: npm run seed:benchmarks

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars. Make sure .env.local has:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const today = new Date().toISOString().split('T')[0]

const tennisBenchmarks = [
  { sport: 'tennis', division: 'd1_power', category: 'utr', metric: 'avg', value: 11.5, unit: 'utr_points' },
  { sport: 'tennis', division: 'd1_power', category: 'utr', metric: 'top_quartile', value: 12.3, unit: 'utr_points' },
  { sport: 'tennis', division: 'd1_mid_major', category: 'utr', metric: 'avg', value: 9.2, unit: 'utr_points' },
  { sport: 'tennis', division: 'd1_mid_major', category: 'utr', metric: 'top_quartile', value: 9.8, unit: 'utr_points' },
  { sport: 'tennis', division: 'd2', category: 'utr', metric: 'avg', value: 7.8, unit: 'utr_points' },
  { sport: 'tennis', division: 'd3', category: 'utr', metric: 'avg', value: 6.5, unit: 'utr_points' },
  { sport: 'tennis', division: 'naia', category: 'utr', metric: 'avg', value: 7.0, unit: 'utr_points' },
  { sport: 'tennis', division: 'juco', category: 'utr', metric: 'avg', value: 6.8, unit: 'utr_points' },

  { sport: 'tennis', division: 'd1', category: 'gpa', metric: 'min', value: 3.2, unit: 'gpa' },
  { sport: 'tennis', division: 'd1', category: 'sat', metric: 'min', value: 1100, unit: 'sat' },
  { sport: 'tennis', division: 'd2', category: 'gpa', metric: 'min', value: 2.8, unit: 'gpa' },

  { sport: 'tennis', division: 'd1_prospect', category: 'tournaments', metric: 'avg', value: 8, unit: 'count_per_year' },
  { sport: 'tennis', division: 'd2_prospect', category: 'tournaments', metric: 'avg', value: 6, unit: 'count_per_year' },
  { sport: 'tennis', division: 'd3_prospect', category: 'tournaments', metric: 'avg', value: 4, unit: 'count_per_year' },
]

async function seed() {
  console.log(`Seeding ${tennisBenchmarks.length} tennis benchmarks (estimates)...`)

  for (const b of tennisBenchmarks) {
    await supabase
      .from('journey_benchmarks')
      .update({ active: false })
      .eq('sport', b.sport)
      .eq('division', b.division)
      .eq('category', b.category)
      .eq('metric', b.metric)
      .eq('active', true)

    const { error } = await supabase.from('journey_benchmarks').insert({
      ...b,
      source: 'playvia_estimate',
      as_of_date: today,
      active: true,
    })

    if (error) {
      console.error(
        `Failed to seed ${b.sport}/${b.division}/${b.category}/${b.metric}:`,
        error,
      )
    } else {
      console.log(
        `  ✓ ${b.sport} · ${b.division} · ${b.category} · ${b.metric} = ${b.value}`,
      )
    }
  }

  const { count, error: countError } = await supabase
    .from('journey_benchmarks')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)

  if (countError) {
    console.error('Count check failed:', countError)
  } else {
    console.log(`Done. Active benchmark rows: ${count ?? 0}`)
  }
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
