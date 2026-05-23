import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getChunksBucket } from '@/lib/vertex-ai/client'
import { isFilmRoomEnabled } from '@/lib/film-room/access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TTL_MS = 15 * 60 * 1000

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chunkId: string }> },
) {
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

  const { chunkId } = await params

  const { data: chunk } = await supabase
    .from('match_chunks')
    .select('id, gcs_path, gcs_bucket, matches!inner(player_id)')
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

  const bucket = getChunksBucket()
  const file = bucket.file(chunk.gcs_path)
  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + TTL_MS,
  })

  return NextResponse.json({
    url: signedUrl,
    expiresInSeconds: TTL_MS / 1000,
  })
}
