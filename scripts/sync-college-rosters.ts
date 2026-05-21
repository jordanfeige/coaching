/**
 * Sync college tennis program rosters into school_rosters and
 * school_tennis_programs (M4.5). Run annually or for initial backfill.
 *
 * Run: npm run sync:rosters
 * Optional: npm run sync:rosters -- --limit=100
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { syncAllSchoolRosters } from '../src/lib/sync-school-rosters'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function main() {
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  if (!process.env.UTR_JWT) {
    console.error('Missing UTR_JWT')
    process.exit(1)
  }

  const limitArg = process.argv.find(a => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1] ?? '', 10) : undefined

  const supabase = createClient(supabaseUrl, serviceKey)

  console.log('Syncing college tennis program rosters...')
  if (limit) console.log(`(limit: ${limit} schools)`)

  const result = await syncAllSchoolRosters(supabase, {
    limit: Number.isFinite(limit) ? limit : undefined,
    paceMs: 1000,
    log: msg => console.log(msg),
  })

  console.log(
    `Done. Processed ${result.schoolsProcessed} schools — ` +
      `${result.schoolsWithTennis} with tennis, ` +
      `${result.totalRosterPlayers} roster players synced.`,
  )
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
