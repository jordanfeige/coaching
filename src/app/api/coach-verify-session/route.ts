import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'coach') {
    return NextResponse.json({ error: 'Coach access required' }, { status: 403 })
  }

  const {
    sessionId,
    overrides,
    coachNote,
    scoreOverride,
    publish,
  } = await req.json()

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('analysis_sessions')
    .update({
      coach_verified: true,
      coach_verified_at: new Date().toISOString(),
      coach_verified_by: user.id,
      coach_overrides: overrides ?? [],
      coach_notes: coachNote || null,
      coach_score_override:
        typeof scoreOverride === 'number' ? scoreOverride : null,
      published_to_player: Boolean(publish),
      published_at: publish ? new Date().toISOString() : null,
    })
    .eq('id', sessionId)

  if (error) {
    console.error('Coach verify error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'coach') {
    return NextResponse.json({ error: 'Coach access required' }, { status: 403 })
  }

  const { sessionId } = await req.json()
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('analysis_sessions')
    .update({
      published_to_player: true,
      published_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
