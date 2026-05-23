import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { isFilmRoomEnabled } from '@/lib/film-room/access'
import { isMatchVisibleInList } from '@/lib/film-room/match-list'
import type { FilmRoomMatchSummary } from '@/lib/film-room/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('player_id')
    .eq('id', user.id)
    .single()

  if (!profile?.player_id) {
    return NextResponse.json({ matches: [] })
  }

  const { data: matches, error } = await supabase
    .from('matches')
    .select(
      `
      id,
      status,
      status_error,
      opponent_name,
      match_context,
      match_date,
      raw_video_duration_seconds,
      created_at,
      match_chunks (
        sequence_number,
        analysis_status,
        thumbnail_storage_path
      )
    `,
    )
    .eq('player_id', profile.player_id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const admin = createSupabaseAdminClient()
  const summaries: FilmRoomMatchSummary[] = []

  for (const row of (matches ?? []).filter(isMatchVisibleInList)) {
    const chunks = Array.isArray(row.match_chunks)
      ? [...row.match_chunks].sort(
          (a: { sequence_number: number }, b: { sequence_number: number }) =>
            a.sequence_number - b.sequence_number,
        )
      : []

    const analyzed_count = chunks.filter(
      (c: { analysis_status: string }) => c.analysis_status === 'analyzed',
    ).length

    const firstThumb = chunks[0]?.thumbnail_storage_path as string | null
    let thumbnail_url: string | null = null

    if (firstThumb) {
      const { data: signed } = await admin.storage
        .from('match-videos')
        .createSignedUrl(firstThumb, 3600)
      thumbnail_url = signed?.signedUrl ?? null
    }

    summaries.push({
      id: row.id,
      status: row.status,
      status_error: row.status_error,
      opponent_name: row.opponent_name,
      match_context: row.match_context,
      match_date: row.match_date,
      raw_video_duration_seconds: row.raw_video_duration_seconds,
      created_at: row.created_at,
      chunk_count: chunks.length,
      analyzed_count,
      thumbnail_url,
    })
  }

  return NextResponse.json({ matches: summaries })
}
