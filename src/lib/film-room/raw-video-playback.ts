import { getChunksBucket } from '@/lib/vertex-ai/client'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import {
  gcsObjectPathFromStorageMarker,
  isGcsRawStoragePath,
} from '@/lib/film-room/gcs-raw-video'

const READ_TTL_MS = 60 * 60 * 1000

/** Signed URL for full-match playback when raw file still exists. */
export async function getRawMatchVideoSignedUrl(
  storagePath: string | null | undefined,
): Promise<string | null> {
  if (!storagePath?.trim()) return null

  if (isGcsRawStoragePath(storagePath)) {
    const objectPath = gcsObjectPathFromStorageMarker(storagePath)
    const [url] = await getChunksBucket()
      .file(objectPath)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + READ_TTL_MS,
      })
    return url ?? null
  }

  const admin = createSupabaseAdminClient()
  const { data } = await admin.storage
    .from('match-videos')
    .createSignedUrl(storagePath, 3600)
  return data?.signedUrl ?? null
}
