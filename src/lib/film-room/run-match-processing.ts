import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { gcsChunksBucketName } from '@/lib/vertex-ai/client'
import {
  deleteRawVideoFromGcs,
  isGcsRawStoragePath,
} from '@/lib/film-room/gcs-raw-video'
import { getRawMatchVideoSignedUrl } from '@/lib/film-room/raw-video-playback'
import { streamMatchIntoChunks } from '@/lib/film-room/stream-chunking'
import { analyzeChunk } from '@/lib/film-room/vertex-analyzer'

/**
 * Chunk raw video, persist segments, analyze chunk 0, mark match ready.
 * Intended to run inside /api/film-room/process-worker (long-running).
 */
export async function runMatchProcessing(
  matchId: string,
  supabase: SupabaseClient,
): Promise<{ chunkCount: number }> {
  console.log('[worker] runMatchProcessing: load match', { matchId })
  const supabaseAdmin = createSupabaseAdminClient()

  const { data: match, error: fetchErr } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (fetchErr || !match) {
    console.error('[worker] runMatchProcessing: match not found', { matchId, fetchErr })
    throw new Error('Match not found')
  }

  if (!match.raw_video_storage_path) {
    console.error('[worker] runMatchProcessing: no raw video path', { matchId })
    throw new Error('Raw video not uploaded yet')
  }

  console.log('[worker] runMatchProcessing: signing raw video URL', {
    matchId,
    rawPath: match.raw_video_storage_path,
  })
  const sourceUrl = await getRawMatchVideoSignedUrl(match.raw_video_storage_path)
  if (!sourceUrl) {
    console.error('[worker] runMatchProcessing: signed URL failed', { matchId })
    throw new Error('Could not create signed URL for raw video')
  }

  console.log('[worker] runMatchProcessing: streamMatchIntoChunks starting', { matchId })
  const { probed, chunks } = await streamMatchIntoChunks(matchId, sourceUrl, 600)
  console.log('[worker] runMatchProcessing: streamMatchIntoChunks done', {
    matchId,
    durationSeconds: probed.durationSeconds,
    chunkCount: chunks.length,
  })

  await supabase
    .from('matches')
    .update({ raw_video_duration_seconds: probed.durationSeconds })
    .eq('id', matchId)

  const bucketName = gcsChunksBucketName || process.env.GCP_BUCKET_CHUNKS!
  console.log('[worker] runMatchProcessing: persisting chunks', {
    matchId,
    chunkCount: chunks.length,
    bucketName,
  })

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

  console.log('[worker] runMatchProcessing: deleting raw video', { matchId })
  if (isGcsRawStoragePath(match.raw_video_storage_path)) {
    await deleteRawVideoFromGcs(match.raw_video_storage_path)
  } else {
    await supabaseAdmin.storage
      .from('match-videos')
      .remove([match.raw_video_storage_path])
  }

  console.log('[worker] runMatchProcessing: status -> chunks_ready', { matchId })
  await supabase
    .from('matches')
    .update({
      status: 'chunks_ready',
      raw_video_storage_path: null,
      chunking_completed_at: new Date().toISOString(),
    })
    .eq('id', matchId)

  console.log('[worker] runMatchProcessing: status -> analyzing_first', { matchId })
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
    console.log('[worker] runMatchProcessing: analyzeChunk(0) starting', {
      matchId,
      chunkId: firstChunk.id,
    })
    try {
      await analyzeChunk(firstChunk.id)
      console.log('[worker] runMatchProcessing: analyzeChunk(0) done', { matchId })
    } catch (analyzeErr) {
      console.error('[worker] runMatchProcessing: analyzeChunk(0) failed', {
        matchId,
        err: analyzeErr,
      })
    }
  } else {
    console.log('[worker] runMatchProcessing: no chunk 0 to analyze', { matchId })
  }

  console.log('[worker] runMatchProcessing: status -> ready', { matchId })
  await supabase
    .from('matches')
    .update({
      status: 'ready',
      ready_at: new Date().toISOString(),
    })
    .eq('id', matchId)

  return { chunkCount: chunks.length }
}
