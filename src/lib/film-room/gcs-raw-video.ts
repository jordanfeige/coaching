import { getChunksBucket, gcsChunksBucketName } from '@/lib/vertex-ai/client'

export const GCS_RAW_PREFIX = 'gcs:'

const RAW_UPLOAD_TTL_MS = 60 * 60 * 1000 // 1 hour

export function rawVideoGcsObjectPath(matchId: string): string {
  return `matches/${matchId}/raw/input.mp4`
}

export function rawVideoStorageMarker(matchId: string): string {
  return `${GCS_RAW_PREFIX}${rawVideoGcsObjectPath(matchId)}`
}

export function isGcsRawStoragePath(path: string | null | undefined): boolean {
  return Boolean(path?.startsWith(GCS_RAW_PREFIX))
}

export function gcsObjectPathFromStorageMarker(path: string): string {
  return path.startsWith(GCS_RAW_PREFIX) ? path.slice(GCS_RAW_PREFIX.length) : path
}

/** Signed URL for browser PUT upload (large match files — not limited by Supabase). */
export async function createRawVideoUploadSignedUrl(
  matchId: string,
): Promise<{ uploadUrl: string; objectPath: string; storagePath: string }> {
  const objectPath = rawVideoGcsObjectPath(matchId)
  const bucket = getChunksBucket()
  const file = bucket.file(objectPath)

  // Do not bind content-type in the signature — browsers often omit or mismatch it on cross-origin PUT.
  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + RAW_UPLOAD_TTL_MS,
  })

  return {
    uploadUrl,
    objectPath,
    storagePath: rawVideoStorageMarker(matchId),
  }
}

export async function downloadRawVideoToFile(
  storagePath: string,
  destination: string,
): Promise<void> {
  const objectPath = gcsObjectPathFromStorageMarker(storagePath)
  await getChunksBucket().file(objectPath).download({ destination })
}

export async function deleteRawVideoFromGcs(
  storagePath: string | null | undefined,
): Promise<void> {
  if (!storagePath || !isGcsRawStoragePath(storagePath)) return
  const objectPath = gcsObjectPathFromStorageMarker(storagePath)
  try {
    await getChunksBucket().file(objectPath).delete({ ignoreNotFound: true })
  } catch (err) {
    console.warn('[film-room/gcs] Raw video delete failed:', err)
  }
}

export { gcsChunksBucketName }
