import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { syncCollegeScorecard } from '../src/lib/sync-college-scorecard'

if (!process.env.COLLEGE_SCORECARD_API_KEY) {
  console.error('COLLEGE_SCORECARD_API_KEY not set')
  process.exit(1)
}
const apiKey = process.env.COLLEGE_SCORECARD_API_KEY!

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  console.log('Syncing College Scorecard data...')
  const result = await syncCollegeScorecard(supabase, apiKey, {
    log: msg => console.log(msg),
  })
  console.log(`Done. Synced ${result.synced} schools.`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
