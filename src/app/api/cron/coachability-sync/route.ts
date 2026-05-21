import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncCoachabilityForPlayer } from '@/lib/journey-coachability-sync'

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
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: players } = await supabase.from('players').select('id').limit(5000)
  const ids = (players ?? []).map(p => p.id)

  let synced = 0
  let skipped = 0
  let failed = 0

  for (const playerId of ids) {
    try {
      const result = await syncCoachabilityForPlayer(supabase, playerId, {
        triggerRecalc: true,
      })
      if (result.written) synced++
      else skipped++
    } catch (e) {
      console.error(`Coachability cron failed for ${playerId}:`, e)
      failed++
    }
  }

  return NextResponse.json({
    total: ids.length,
    synced,
    skipped,
    failed,
  })
}
