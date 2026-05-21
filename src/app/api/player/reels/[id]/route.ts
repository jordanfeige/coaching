import { NextRequest, NextResponse } from 'next/server'
import { normalizeReelTitle } from '@/lib/reel-display'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getLinkedPlayerIdForUser } from '@/lib/linked-player'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const playerId = await getLinkedPlayerIdForUser(supabase, user.id)
  if (!playerId) {
    return NextResponse.json({ error: 'No player' }, { status: 404 })
  }

  const body = (await req.json()) as { title?: string }
  if (typeof body.title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const title = normalizeReelTitle(body.title)
  if (!title) {
    return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('analysis_sessions')
    .update({ title })
    .eq('id', id)
    .eq('player_id', playerId)
    .select('id, title')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Reel not found' }, { status: 404 })
  }

  return NextResponse.json({ id: data.id, title: data.title })
}
