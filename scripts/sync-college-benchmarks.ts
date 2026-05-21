/**
 * Quarterly: pull NCAA tennis rosters from UTR, compute division-level UTR
 * averages, and update journey_benchmarks (category: utr only).
 *
 * Run: npm run sync:college-benchmarks
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { syncCollegeRostersToBenchmarks } from '../src/lib/sync-college-rosters'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!process.env.UTR_JWT) {
  console.error('Missing UTR_JWT — cannot call UTR college roster API')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  console.log('Starting college roster → journey_benchmarks sync...\n')

  const result = await syncCollegeRostersToBenchmarks(supabase, {
    log: msg => console.log(msg),
  })

  console.log(`\nDone. Active UTR roster-sync benchmark rows: ${result.activeBenchmarkRows}`)

  const estimates: Record<string, number> = {
    d1_power: 11.5,
    d1_mid_major: 9.2,
    d2: 7.8,
    d3: 6.5,
    naia: 7.0,
    juco: 6.8,
  }

  console.log('\nCompare vs playvia_estimate seeds:')
  for (const d of result.divisions) {
    const est = estimates[d.division]
    const delta = est != null ? d.avg - est : null
    const flag =
      delta != null && Math.abs(delta) > 2 ? ' ⚠ large shift' : ''
    console.log(
      `  ${d.division}: synced avg=${d.avg}` +
        (est != null
          ? ` (estimate was ${est}, Δ${delta! >= 0 ? '+' : ''}${delta?.toFixed(2)})`
          : '') +
        flag,
    )
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
