import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isFilmRoomEnabled } from '@/lib/film-room/access'
import { analyzeChunk } from '@/lib/film-room/vertex-analyzer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 800

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isFilmRoomEnabled(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { chunkId } = await req.json()

  if (!chunkId || typeof chunkId !== 'string') {
    return NextResponse.json({ error: 'chunkId required' }, { status: 400 })
  }

  const { data: chunk } = await supabase
    .from('match_chunks')
    .select('id, matches!inner(player_id)')
    .eq('id', chunkId)
    .single()

  if (!chunk) {
    return NextResponse.json({ error: 'Chunk not found' }, { status: 404 })
  }

  const match = chunk.matches as unknown as { player_id: string }

  const { data: profile } = await supabase
    .from('profiles')
    .select('player_id')
    .eq('id', user.id)
    .single()

  if (!profile?.player_id || profile.player_id !== match.player_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await analyzeChunk(chunkId)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
