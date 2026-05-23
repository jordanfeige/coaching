import { getChunksBucket } from '@/lib/vertex-ai/client'

const DEFAULT_ATTEMPTS = 3

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Upload a local file to GCS with exponential backoff retries. */
export async function uploadChunkToGcs(
  localPath: string,
  destination: string,
  attempts = DEFAULT_ATTEMPTS,
): Promise<void> {
  const bucket = getChunksBucket()
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await bucket.upload(localPath, {
        destination,
        contentType: 'video/mp4',
        resumable: true,
      })
      return
    } catch (err) {
      lastError = err
      console.error(
        `[film-room/gcs] Upload attempt ${attempt}/${attempts} failed for ${destination}:`,
        err instanceof Error ? err.message : err,
      )
      if (attempt < attempts) {
        await sleep(2000 * Math.pow(2, attempt - 1))
      }
    }
  }

  throw lastError
}
