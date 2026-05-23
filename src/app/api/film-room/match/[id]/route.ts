import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { isFilmRoomEnabled } from '@/lib/film-room/access'
import { getRawMatchVideoSignedUrl } from '@/lib/film-room/raw-video-playback'
import type { FilmRoomChunk, FilmRoomMatchDetail } from '@/lib/film-room/types'
import type { MatchAnalysisV2 } from '@/lib/match-analysis/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function signThumbnail(admin: ReturnType<typeof createSupabaseAdminClient>, path: string | null) {
  if (!path) return null
  const { data } = await admin.storage.from('match-videos').createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
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

  const { id } = await params

  const { data: match, error } = await supabase
    .from('matches')
    .select('*, match_chunks(*)')
    .eq('id', id)
    .single()

  if (error || !match) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const admin = createSupabaseAdminClient()
  const chunksRaw = Array.isArray(match.match_chunks) ? match.match_chunks : []
  chunksRaw.sort(
    (a: { sequence_number: number }, b: { sequence_number: number }) =>
      a.sequence_number - b.sequence_number,
  )

  const match_chunks: FilmRoomChunk[] = []
  for (const c of chunksRaw) {
    match_chunks.push({
      id: c.id,
      sequence_number: c.sequence_number,
      start_seconds: c.start_seconds,
      end_seconds: c.end_seconds,
      duration_seconds: c.duration_seconds,
      analysis_status: c.analysis_status,
      analysis_error: c.analysis_error,
      analysis_result: (c.analysis_result as MatchAnalysisV2 | null) ?? null,
      thumbnail_storage_path: c.thumbnail_storage_path,
      thumbnail_url: await signThumbnail(admin, c.thumbnail_storage_path),
    })
  }

  const analyzed_count = match_chunks.filter(c => c.analysis_status === 'analyzed').length
  const firstThumb = match_chunks[0]?.thumbnail_storage_path ?? null
  const raw_video_url = await getRawMatchVideoSignedUrl(match.raw_video_storage_path)

  const detail: FilmRoomMatchDetail = {
    id: match.id,
    status: match.status,
    status_error: match.status_error,
    opponent_name: match.opponent_name,
    match_context: match.match_context,
    match_date: match.match_date,
    raw_video_duration_seconds: match.raw_video_duration_seconds,
    created_at: match.created_at,
    tap_x_percent: match.tap_x_percent,
    tap_y_percent: match.tap_y_percent,
    chunk_count: match_chunks.length,
    analyzed_count,
    thumbnail_url: await signThumbnail(admin, firstThumb),
    match_chunks,
    raw_video_url,
  }

  return NextResponse.json(detail)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
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

  const { id } = await params

  const { data: match } = await supabase
    .from('matches')
    .select('id, player_id')
    .eq('id', id)
    .single()

  if (!match) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('player_id')
    .eq('id', user.id)
    .single()

  if (!profile?.player_id || profile.player_id !== match.player_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('matches').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
