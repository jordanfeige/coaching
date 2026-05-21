import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'
import { syncCoachabilityForPlayer } from '@/lib/journey-coachability-sync'
import { triggerCoachabilitySync } from '@/lib/journey-coachability-trigger'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id: drillId } = await context.params
  if (!drillId) {
    return NextResponse.json({ error: 'Drill id required' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const playerId = await getLinkedPlayerIdForUser(supabase, user.id)
  if (!playerId) {
    return NextResponse.json({ error: 'No linked player' }, { status: 403 })
  }

  const { data: drill, error: fetchErr } = await supabase
    .from('drills')
    .select('id, player_id, completed_at')
    .eq('id', drillId)
    .maybeSingle()

  if (fetchErr || !drill) {
    return NextResponse.json({ error: 'Drill not found' }, { status: 404 })
  }

  if (drill.player_id !== playerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (drill.completed_at) {
    return NextResponse.json({ ok: true, alreadyCompleted: true })
  }

  const completedAt = new Date().toISOString()
  const { error: updateErr } = await supabase
    .from('drills')
    .update({ completed_at: completedAt })
    .eq('id', drillId)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (serviceKey && supabaseUrl) {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    try {
      await syncCoachabilityForPlayer(admin, playerId)
    } catch (e) {
      console.error('[drill-complete] inline sync failed, triggering async:', e)
      triggerCoachabilitySync(playerId)
    }
  } else {
    triggerCoachabilitySync(playerId)
  }

  return NextResponse.json({ ok: true, completedAt })
}
