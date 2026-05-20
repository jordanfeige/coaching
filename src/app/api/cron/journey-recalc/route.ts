import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recalcJourneyRating } from '@/lib/journey-recalc'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: playerIds } = await supabase
    .from('journey_score_inputs')
    .select('player_id')
    .limit(10000)

  const unique = [...new Set((playerIds ?? []).map(r => r.player_id))]

  let success = 0
  let failed = 0
  for (const playerId of unique) {
    try {
      await recalcJourneyRating(
        playerId,
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      )
      success++
    } catch (e) {
      console.error(`Recalc failed for ${playerId}:`, e)
      failed++
    }
  }

  return NextResponse.json({
    recalculated: success,
    failed,
    total: unique.length,
  })
}
