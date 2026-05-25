import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { isFilmRoomEnabled } from '@/lib/film-room/access'
import { getAppBaseUrl, getWorkerSecret } from '@/lib/film-room/app-url'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

async function assertMatchOwnership(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  matchId: string,
  playerId: string,
) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('player_id')
    .eq('id', userId)
    .single()

  if (!profile?.player_id || profile.player_id !== playerId) {
    return false
  }
  return true
}

function dispatchProcessWorker(matchId: string): void {
  const baseUrl = getAppBaseUrl()
  const secret = getWorkerSecret()
  const url = `${baseUrl}/api/film-room/process-worker`

  void fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-secret': secret,
    },
    body: JSON.stringify({ matchId }),
  }).catch(err => {
    console.error('[film-room/process] Worker dispatch failed:', err)
  })
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const supabaseAdmin = createSupabaseAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isFilmRoomEnabled(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const matchId = body.matchId as string
  const referenceFrameDataUrl = body.referenceFrameDataUrl as string
  const tapXPercent = Number(body.tapXPercent)
  const tapYPercent = Number(body.tapYPercent)
  const frameCapturedAtSeconds = Number(body.frameCapturedAtSeconds)
  const playerDescriptionHint = body.playerDescriptionHint as string | undefined

  if (!matchId) {
    return NextResponse.json({ error: 'matchId required' }, { status: 400 })
  }

  const { data: match, error: fetchErr } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (fetchErr || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  const owns = await assertMatchOwnership(
    supabase,
    user.id,
    matchId,
    match.player_id,
  )
  if (!owns) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!match.raw_video_storage_path) {
    return NextResponse.json(
      { error: 'Raw video not uploaded yet' },
      { status: 400 },
    )
  }

  const frameMatch = referenceFrameDataUrl?.match(
    /^data:image\/(\w+);base64,(.+)$/,
  )
  if (!frameMatch) {
    return NextResponse.json({ error: 'Bad frame data URL' }, { status: 400 })
  }

  const frameBuffer = Buffer.from(frameMatch[2], 'base64')
  const framePath = `matches/${matchId}/reference-frame.jpg`

  const { error: frameErr } = await supabase.storage
    .from('match-videos')
    .upload(framePath, frameBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (frameErr) {
    await supabaseAdmin
      .from('matches')
      .update({ status: 'failed', status_error: frameErr.message })
      .eq('id', matchId)
    return NextResponse.json({ error: frameErr.message }, { status: 500 })
  }

  await supabase
    .from('matches')
    .update({
      status: 'chunking',
      reference_frame_storage_path: framePath,
      tap_x_percent: tapXPercent,
      tap_y_percent: tapYPercent,
      frame_captured_at_seconds: frameCapturedAtSeconds,
      player_description_hint: playerDescriptionHint ?? null,
      status_error: null,
    })
    .eq('id', matchId)

  try {
    dispatchProcessWorker(matchId)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not start background worker'
    await supabaseAdmin
      .from('matches')
      .update({ status: 'failed', status_error: message })
      .eq('id', matchId)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ status: 'processing', matchId })
}
