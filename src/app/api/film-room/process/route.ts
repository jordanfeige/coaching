import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { isFilmRoomEnabled } from '@/lib/film-room/access'
import { gcsChunksBucketName } from '@/lib/vertex-ai/client'
import {
  deleteRawVideoFromGcs,
  isGcsRawStoragePath,
} from '@/lib/film-room/gcs-raw-video'
import { getRawMatchVideoSignedUrl } from '@/lib/film-room/raw-video-playback'
import { streamMatchIntoChunks } from '@/lib/film-room/stream-chunking'
import { analyzeChunk } from '@/lib/film-room/vertex-analyzer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 800

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
    await supabase
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
    const sourceUrl = await getRawMatchVideoSignedUrl(match.raw_video_storage_path)
    if (!sourceUrl) {
      throw new Error('Could not create signed URL for raw video')
    }

    const { probed, chunks } = await streamMatchIntoChunks(matchId, sourceUrl, 600)

    await supabase
      .from('matches')
      .update({ raw_video_duration_seconds: probed.durationSeconds })
      .eq('id', matchId)

    const bucketName = gcsChunksBucketName || process.env.GCP_BUCKET_CHUNKS!

    for (const chunk of chunks) {
      const thumbStoragePath = `matches/${matchId}/thumbnails/thumb-${chunk.sequenceNumber.toString().padStart(3, '0')}.jpg`

      const { error: thumbErr } = await supabaseAdmin.storage
        .from('match-videos')
        .upload(thumbStoragePath, chunk.thumbnailBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (thumbErr) {
        throw new Error(`Thumbnail upload failed: ${thumbErr.message}`)
      }

      const { error: chunkInsertErr } = await supabaseAdmin
        .from('match_chunks')
        .insert({
          match_id: matchId,
          sequence_number: chunk.sequenceNumber,
          start_seconds: chunk.startSeconds,
          end_seconds: chunk.endSeconds,
          duration_seconds: chunk.durationSeconds,
          gcs_bucket: bucketName,
          gcs_path: chunk.gcsPath,
          gcs_uri: `gs://${bucketName}/${chunk.gcsPath}`,
          size_bytes: chunk.sizeBytes,
          thumbnail_storage_path: thumbStoragePath,
        })

      if (chunkInsertErr) {
        throw new Error(chunkInsertErr.message)
      }
    }

    if (isGcsRawStoragePath(match.raw_video_storage_path)) {
      await deleteRawVideoFromGcs(match.raw_video_storage_path)
    } else {
      await supabaseAdmin.storage
        .from('match-videos')
        .remove([match.raw_video_storage_path])
    }

    await supabase
      .from('matches')
      .update({
        status: 'chunks_ready',
        raw_video_storage_path: null,
        chunking_completed_at: new Date().toISOString(),
      })
      .eq('id', matchId)

    await supabase
      .from('matches')
      .update({ status: 'analyzing_first' })
      .eq('id', matchId)

    const { data: firstChunk } = await supabaseAdmin
      .from('match_chunks')
      .select('id')
      .eq('match_id', matchId)
      .eq('sequence_number', 0)
      .single()

    if (firstChunk) {
      try {
        await analyzeChunk(firstChunk.id)
      } catch (analyzeErr) {
        console.error('[film-room/process] First chunk analysis failed:', analyzeErr)
      }
    }

    await supabase
      .from('matches')
      .update({
        status: 'ready',
        ready_at: new Date().toISOString(),
      })
      .eq('id', matchId)

    return NextResponse.json({
      success: true,
      matchId,
      chunkCount: chunks.length,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Pipeline failed'
    console.error('[film-room/process] Pipeline failed:', err)

    await supabase
      .from('matches')
      .update({ status: 'failed', status_error: message })
      .eq('id', matchId)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
