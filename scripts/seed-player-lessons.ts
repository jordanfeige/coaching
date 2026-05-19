import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import {
  seedLessonsForEmail,
  TEST_PLAYER_EMAILS,
} from './player-lesson-seeds'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars. Make sure .env.local has:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function main() {
  const supabase = createClient(supabaseUrl!, supabaseKey!)
  console.log('Seeding lessons for test players...\n')

  let total = 0
  for (const email of TEST_PLAYER_EMAILS) {
    total += await seedLessonsForEmail(supabase, email)
  }

  console.log(`\n✅ Done — ${total} lessons across ${TEST_PLAYER_EMAILS.length} players.`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
