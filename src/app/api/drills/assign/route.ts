import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'
import { syncCoachabilityForPlayer } from '@/lib/journey-coachability-sync'
import { triggerCoachabilitySync } from '@/lib/journey-coachability-trigger'

export const dynamic = 'force-dynamic'

type AssignBody = {
  title: string
  description?: string
  analysisSessionId?: string
  sport?: string
}

export async function POST(request: NextRequest) {
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

  let body: AssignBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const title = body.title?.trim()
  if (!title) {
    return NextResponse.json({ error: 'title required' }, { status: 400 })
  }

  if (body.analysisSessionId) {
    const { data: session } = await supabase
      .from('analysis_sessions')
      .select('id, player_id')
      .eq('id', body.analysisSessionId)
      .maybeSingle()

    if (!session || session.player_id !== playerId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
  }

  const sport = body.sport ?? 'tennis'
  const sessionNote = body.analysisSessionId
    ? ` From reel analysis (${body.analysisSessionId.slice(0, 8)}).`
    : ''
  const description =
    body.description?.trim() ||
    `Prescribed from ${sport} analysis.${sessionNote} 3 sets · 15 reps.`

  const { data: existing } = await supabase
    .from('drills')
    .select('id')
    .eq('player_id', playerId)
    .eq('title', title)
    .is('completed_at', null)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, drillId: existing.id, alreadyAssigned: true })
  }

  const { data: drill, error: insertErr } = await supabase
    .from('drills')
    .insert({
      player_id: playerId,
      title,
      description,
    })
    .select('id, title, created_at')
    .single()

  if (insertErr || !drill) {
    return NextResponse.json(
      { error: insertErr?.message ?? 'Could not assign drill' },
      { status: 500 },
    )
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
      console.error('[drill-assign] inline sync failed:', e)
      triggerCoachabilitySync(playerId)
    }
  } else {
    triggerCoachabilitySync(playerId)
  }

  return NextResponse.json({ ok: true, drill: drill, alreadyAssigned: false })
}
