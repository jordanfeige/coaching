import type { SupabaseClient } from '@supabase/supabase-js'

export type MatchVideoUploadInit = {
  matchId: string
  storagePath: string
}

/**
 * Create match record + upload raw video directly to GCS (large files; not limited by Supabase bucket size).
 */
export async function uploadMatchVideoFile(
  _supabase: SupabaseClient,
  file: File,
  init: {
    fileName: string
    fileSize: number
    opponent_name?: string | null
    match_context?: string | null
    match_date?: string | null
  },
  onProgress?: (pct: number) => void,
): Promise<MatchVideoUploadInit> {
  const res = await fetch('/api/film-room/upload-init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(init),
  })
  const payload = await res.json()
  if (!res.ok) {
    throw new Error(payload.error || payload.message || 'Could not start upload')
  }

  const uploadUrl = String(payload.uploadUrl)
  const storagePath = String(payload.storagePath)

  await putFileWithProgress(uploadUrl, file, onProgress)

  return {
    matchId: String(payload.matchId),
    storagePath,
  }
}

function putFileWithProgress(
  uploadUrl: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    // No Content-Type header — must not be in signed URL headers (see gcs-raw-video.ts)

    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve()
        return
      }
      if (xhr.status === 413) {
        reject(
          new Error(
            'Video file is too large (max 5 GB). Try a shorter clip or lower resolution export.',
          ),
        )
        return
      }
      reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText || 'unknown error'}`))
    }

    xhr.onerror = () => {
      reject(
        new Error(
          'Upload failed — if this persists, GCS bucket CORS may need configuration for localhost.',
        ),
      )
    }

    xhr.send(file)
  })
}
