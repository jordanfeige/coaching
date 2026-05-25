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
  const supabaseAdmin = createSupabaseAdminClient()

  const { data: match, error: fetchErr } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (fetchErr || !match) {
    throw new Error('Match not found')
  }

  if (!match.raw_video_storage_path) {
    throw new Error('Raw video not uploaded yet')
  }

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
      console.error('[film-room/process-worker] First chunk analysis failed:', analyzeErr)
    }
  }

  await supabase
    .from('matches')
    .update({
      status: 'ready',
      ready_at: new Date().toISOString(),
    })
    .eq('id', matchId)

  return { chunkCount: chunks.length }
}
