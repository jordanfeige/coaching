/**
 * Recalc Journey ratings for all players (after exposure scoring changes).
 * Run: npm run recalc:all
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const cronSecret = process.env.CRON_SECRET!
const base =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

async function main() {
  if (!supabaseUrl || !serviceKey || !cronSecret) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or CRON_SECRET')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data: players, error } = await supabase.from('players').select('id')
  if (error) throw error
  if (!players?.length) {
    console.log('No players found')
    return
  }

  let recalced = 0
  let failed = 0

  for (const p of players) {
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/api/journey/recalc`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cronSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId: p.id }),
      })
      if (res.ok) recalced++
      else {
        failed++
        console.error(`Failed ${p.id}:`, await res.text())
      }
    } catch (e) {
      failed++
      console.error(`Error ${p.id}:`, e)
    }
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`Recalced ${recalced}, failed ${failed}, total ${players.length}`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
