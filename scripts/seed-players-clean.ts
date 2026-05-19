import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { clearPlayerLessons } from './player-lesson-seeds'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars. Make sure .env.local has:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAILS = [
  'test.new@playvia.studio',
  'test.early@playvia.studio',
  'test.improving@playvia.studio',
  'test.advanced@playvia.studio',
  'test.regression@playvia.studio',
]

async function main() {
  for (const email of TEST_EMAILS) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, player_id')
      .eq('email', email)
      .maybeSingle()

    if (profile?.player_id) {
      await clearPlayerLessons(supabase, profile.player_id)
      await supabase
        .from('analysis_sessions')
        .delete()
        .eq('player_id', profile.player_id)
      await supabase.from('drills').delete().eq('player_id', profile.player_id)
      await supabase
        .from('account_players')
        .delete()
        .eq('player_id', profile.player_id)
      await supabase.from('players').delete().eq('id', profile.player_id)
    }

    if (profile?.id) {
      await supabase.from('profiles').delete().eq('id', profile.id)
      await supabase.auth.admin.deleteUser(profile.id)
    }

    console.log(`✓ Cleaned up ${email}`)
  }
  console.log('\nDone!')
}

main().catch(console.error)
