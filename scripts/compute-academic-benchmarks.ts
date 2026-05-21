import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { computeAcademicBenchmarksFromSchools } from '../src/lib/compute-academic-benchmarks'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  console.log('Computing academic-tier benchmarks from College Scorecard data...')
  await computeAcademicBenchmarksFromSchools(supabase, {
    log: msg => console.log(msg),
  })
  console.log('Done.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
