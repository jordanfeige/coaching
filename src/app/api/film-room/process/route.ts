import { after } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { isFilmRoomEnabled } from '@/lib/film-room/access'
import { getRequestOrigin, getWorkerSecret } from '@/lib/film-room/app-url'

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

async function runProcessWorker(
  matchId: string,
  origin: string,
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
): Promise<void> {
  console.log('[process] runProcessWorker started', { matchId, origin })

  let secret: string
  try {
    secret = getWorkerSecret()
    console.log('[process] WORKER_SECRET resolved', {
      matchId,
      secretLength: secret.length,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'WORKER_SECRET is not configured'
    console.error('[process] WORKER_SECRET missing', { matchId, message })
    await supabaseAdmin
      .from('matches')
      .update({ status: 'failed', status_error: message })
      .eq('id', matchId)
    return
  }

  const workerUrl = `${origin}/api/film-room/process-worker`
  console.log('[process] Firing worker fetch to:', workerUrl, { matchId })

  try {
    const res = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': secret,
      },
      body: JSON.stringify({ matchId }),
    })
    const bodyText = await res.text()
    console.log('[process] Worker fetch returned:', res.status, bodyText)

    if (!res.ok) {
      let message = `Background worker failed (${res.status})`
      try {
        const data = JSON.parse(bodyText) as { error?: string }
        if (data.error) message = data.error
      } catch {
        if (bodyText) message = bodyText.slice(0, 500)
      }
      await supabaseAdmin
        .from('matches')
        .update({ status: 'failed', status_error: message })
        .eq('id', matchId)
      console.error('[process] Worker non-OK response', { matchId, status: res.status, message })
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Background worker dispatch failed'
    console.error(
      '[process] Worker fetch FAILED:',
      err instanceof Error ? err.message : err,
      err instanceof Error ? err.stack : undefined,
    )
    await supabaseAdmin
      .from('matches')
      .update({ status: 'failed', status_error: `Worker fetch failed: ${message}` })
      .eq('id', matchId)
  }
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
    getWorkerSecret()
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not start background worker'
    await supabaseAdmin
      .from('matches')
      .update({ status: 'failed', status_error: message })
      .eq('id', matchId)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const origin = getRequestOrigin(req)
  console.log('[process] Scheduling worker via after()', { matchId, origin })
  after(() => runProcessWorker(matchId, origin, supabaseAdmin))

  return NextResponse.json({ status: 'processing', matchId })
}
