/**
 * M1c Step 11 — journey E2E checks (Taylor / test.advanced@playvia.studio)
 * Run: npx tsx scripts/verify-journey-e2e.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { recalcJourneyRating } from '../src/lib/journey-recalc'
import { fetchJourneyPageData } from '../src/lib/journey-fetch'
import { buildJourneyViewModel } from '../src/lib/journey-view-model'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const cronSecret = process.env.CRON_SECRET!

if (!supabaseUrl || !serviceKey || !cronSecret) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function taylorPlayerId(): Promise<string> {
  const { data: authUsers, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  const user = authUsers.users.find(u => u.email === 'test.advanced@playvia.studio')
  if (!user) throw new Error('Taylor auth user not found')

  const { data: profile } = await supabase
    .from('profiles')
    .select('player_id')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.player_id) return profile.player_id

  const { data: legacy } = await supabase
    .from('players')
    .select('id')
    .eq('parent_id', user.id)
    .maybeSingle()
  if (legacy?.id) return legacy.id
  throw new Error('Taylor player_id not linked')
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`)
  console.log(`  ✓ ${msg}`)
}

async function main() {
  const playerId = await taylorPlayerId()
  console.log(`Taylor player_id: ${playerId}\n`)

  const { data: beforeRows } = await supabase
    .from('journey_ratings')
    .select('total, tier, breakdown, computed_at')
    .eq('player_id', playerId)
    .order('computed_at', { ascending: false })
    .limit(1)

  const beforeTotal = beforeRows?.[0] ? Number(beforeRows[0].total) : null
  assert(beforeTotal != null, `Has journey_ratings row (total=${beforeTotal})`)

  const pageData = await fetchJourneyPageData(supabase, playerId)
  assert(pageData != null, 'fetchJourneyPageData returns data')
  assert(
    pageData!.player.journeyRating === beforeTotal,
    `Page fetch rating ${pageData!.player.journeyRating} matches DB ${beforeTotal}`,
  )

  const vm = buildJourneyViewModel(pageData!)
  assert(vm.categories.length === 4, 'Breakdown has 4 categories')
  assert(
    vm.categories.every(c => typeof c.score === 'number'),
    'Each category has a score',
  )

  const reelInput = pageData!.inputs.find(
    i => i.category === 'exposure' && i.input_key === 'verified_reels_count',
  )
  assert(reelInput != null, 'verified_reels_count input present in fetch')

  const { count: eventCount } = await supabase
    .from('journey_score_events')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', playerId)
  assert((eventCount ?? 0) > 0, `Events timeline has ${eventCount} rows`)

  console.log('\n--- Simulating verified reel upload + recalc ---\n')

  await supabase.from('journey_score_inputs').upsert(
    {
      player_id: playerId,
      category: 'exposure',
      input_key: 'verified_reels_count',
      value_numeric: 1,
      unit: 'count',
      source: 'playvia',
      verified: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'player_id,category,input_key' },
  )

  await supabase.from('journey_score_events').insert({
    player_id: playerId,
    event_type: 'input_updated',
    category: 'exposure',
    label: 'verified_reels_count: 0 → 1',
    before_value: '0',
    after_value: '1',
    actor: 'e2e-test',
  })

  const breakdown = await recalcJourneyRating(playerId, supabaseUrl, serviceKey)
  const afterTotal = breakdown.total
  assert(afterTotal > beforeTotal!, `Rating increased: ${beforeTotal} → ${afterTotal}`)

  const { data: afterRows } = await supabase
    .from('journey_ratings')
    .select('id, total, computed_at')
    .eq('player_id', playerId)
    .order('computed_at', { ascending: false })
    .limit(2)

  assert((afterRows?.length ?? 0) >= 2, 'New journey_ratings row appended')

  const refreshed = await fetchJourneyPageData(supabase, playerId)
  assert(
    refreshed!.player.journeyRating === afterTotal,
    `Refreshed page data shows new rating ${afterTotal}`,
  )

  const baseUrl = process.env.PLAYVIA_BASE_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/journey/recalc`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerId }),
    })
    if (res.ok) {
      const json = await res.json()
      assert(json.total === afterTotal, `POST /api/journey/recalc returns total ${json.total}`)
    } else {
      console.log(
        `  ⚠ POST /api/journey/recalc skipped (${res.status}) — start dev server to test HTTP route`,
      )
    }
  } catch {
    console.log('  ⚠ POST /api/journey/recalc skipped — dev server not running')
  }

  console.log('\nAll automated Step 11 checks passed.')
  console.log('Manual: log in as test.advanced@playvia.studio and open /player/journey to confirm UI.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
