import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  resolveVerifiedUtrPlayerId,
  syncPlayerMatches,
} from '@/lib/sync-player-matches'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.UTR_JWT) {
    return NextResponse.json({ error: 'UTR_JWT not configured' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: verifiedInputs, error } = await supabase
    .from('journey_score_inputs')
    .select('player_id')
    .eq('category', 'tennis')
    .eq('input_key', 'utr_rating')
    .eq('verified', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const playerIds = [
    ...new Set((verifiedInputs ?? []).map(r => r.player_id)),
  ]

  if (!playerIds.length) {
    return NextResponse.json({ ok: true, synced: 0, failed: 0, players: 0 })
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  let totalSynced = 0
  let failed = 0

  for (const playerId of playerIds) {
    const utrPlayerId = await resolveVerifiedUtrPlayerId(supabase, playerId)
    if (!utrPlayerId) continue

    try {
      const r = await syncPlayerMatches(supabase, {
        playerId,
        utrPlayerId,
        since,
      })
      totalSynced += r.inserted
    } catch (e) {
      console.error(`Match sync failed for ${playerId}:`, e)
      failed++
    }

    await new Promise(r => setTimeout(r, 1500))
  }

  return NextResponse.json({
    ok: true,
    synced: totalSynced,
    failed,
    players: playerIds.length,
  })
}
