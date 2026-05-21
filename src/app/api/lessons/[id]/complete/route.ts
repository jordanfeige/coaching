import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { syncCoachabilityForPlayer } from '@/lib/journey-coachability-sync'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

/** Coach marks a lesson complete — triggers Coachability sync for the player. */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: lessonId } = await context.params
  if (!lessonId) {
    return NextResponse.json({ error: 'Lesson id required' }, { status: 400 })
  }

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
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { journalNote?: string } = {}
  try {
    body = await request.json()
  } catch {
    /* optional body */
  }

  const { data: lesson, error: lessonErr } = await supabase
    .from('lessons')
    .select('id, player_id, status')
    .eq('id', lessonId)
    .maybeSingle()

  if (lessonErr || !lesson?.player_id) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  const { error: updateErr } = await supabase
    .from('lessons')
    .update({ status: 'completed' })
    .eq('id', lessonId)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  if (body.journalNote?.trim()) {
    await supabase.from('journal_entries').insert({
      player_id: lesson.player_id,
      lesson_id: lessonId,
      content: body.journalNote.trim(),
    })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (serviceKey && supabaseUrl) {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    try {
      await syncCoachabilityForPlayer(admin, lesson.player_id)
    } catch (e) {
      console.error('[lesson-complete] coachability sync failed:', e)
    }
  }

  return NextResponse.json({ ok: true })
}
