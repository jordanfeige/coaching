import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isFilmRoomEnabled } from '@/lib/film-room/access'
import { createRawVideoUploadSignedUrl } from '@/lib/film-room/gcs-raw-video'
import {
  MAX_MATCH_VIDEO_BYTES,
  MAX_MATCH_VIDEO_LABEL,
} from '@/lib/match-analysis/limits'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('player_id')
    .eq('id', user.id)
    .single()

  if (!profile?.player_id) {
    return NextResponse.json({ error: 'No player profile' }, { status: 400 })
  }

  const body = await req.json()
  const fileSize = Number(body.fileSize)
  const opponent_name = body.opponent_name as string | undefined
  const match_context = body.match_context as string | undefined
  const match_date = body.match_date as string | undefined

  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return NextResponse.json({ error: 'Invalid fileSize' }, { status: 400 })
  }

  if (fileSize > MAX_MATCH_VIDEO_BYTES) {
    return NextResponse.json(
      {
        error: 'Video too large',
        message: `Maximum size is ${MAX_MATCH_VIDEO_LABEL} (5120 MB)`,
      },
      { status: 400 },
    )
  }

  const { data: match, error } = await supabase
    .from('matches')
    .insert({
      player_id: profile.player_id,
      opponent_name: opponent_name ?? null,
      match_context: match_context ?? null,
      match_date: match_date ?? null,
      raw_video_size_bytes: fileSize,
      status: 'uploading',
    })
    .select('id')
    .single()

  if (error || !match) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
  }

  try {
    const { uploadUrl, storagePath } = await createRawVideoUploadSignedUrl(match.id)

    await supabase
      .from('matches')
      .update({ raw_video_storage_path: storagePath })
      .eq('id', match.id)

    return NextResponse.json({
      matchId: match.id,
      uploadUrl,
      storagePath,
      uploadTarget: 'gcs',
    })
  } catch (err: unknown) {
    await supabase.from('matches').delete().eq('id', match.id)
    const message = err instanceof Error ? err.message : 'Could not create upload URL'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
