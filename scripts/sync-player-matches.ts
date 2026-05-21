/**
 * Sync a player's UTR match history into match_results.
 * Run: npm run sync:player-matches -- <player-id>
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import {
  resolveVerifiedUtrPlayerId,
  syncPlayerMatches,
} from '../src/lib/sync-player-matches'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function main() {
  const playerId = process.argv[2]
  if (!playerId) {
    console.error('Usage: npm run sync:player-matches -- <player-id>')
    process.exit(1)
  }

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  if (!process.env.UTR_JWT) {
    console.error('Missing UTR_JWT')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const utrPlayerId = await resolveVerifiedUtrPlayerId(supabase, playerId)
  if (!utrPlayerId) {
    console.error(
      'Player has no verified UTR on file (link UTR + verified utr_rating input) — sync skipped',
    )
    process.exit(1)
  }

  const result = await syncPlayerMatches(supabase, {
    playerId,
    utrPlayerId,
  })

  console.log(
    `Synced ${result.inserted} of ${result.total} matches ` +
      `(${result.failed} failed)`,
  )
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
