import type { SupabaseClient } from '@supabase/supabase-js'

const MAX_VIDEO_FILE_MB = 300
const MAX_VIDEO_DURATION_SECONDS = 60

async function parseJsonResponse(response: Response) {
  const text = await response.text()
  if (!text) return {}
  return JSON.parse(text) as Record<string, unknown>
}

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(video.duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read video duration'))
    }
    video.src = url
  })
}

export type UploadAndAnalyzeReelOptions = {
  file: File
  title: string
  shotType?: string | null
  sport?: string
  playerId?: string | null
  supabase: SupabaseClient
}

export type UploadAndAnalyzeReelResult = {
  sessionId: string
}

/**
 * Same pipeline as /player/reels/new — signed upload to `videos` bucket then /api/video-analysis.
 */
export async function uploadAndAnalyzePlayerReel(
  options: UploadAndAnalyzeReelOptions,
): Promise<UploadAndAnalyzeReelResult> {
  const { file, title, shotType, sport = 'tennis', playerId, supabase } = options

  if (file.size > MAX_VIDEO_FILE_MB * 1024 * 1024) {
    throw new Error(`Video must be under ${MAX_VIDEO_FILE_MB} MB.`)
  }

  let videoDuration: number | undefined
  try {
    const duration = await getVideoDuration(file)
    if (Number.isFinite(duration)) {
      if (duration > MAX_VIDEO_DURATION_SECONDS) {
        throw new Error(
          `Keep your clip to ${MAX_VIDEO_DURATION_SECONDS} seconds or less.`,
        )
      }
      videoDuration = duration
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('seconds')) throw e
  }

  const uploadResponse = await fetch('/api/analyze-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || 'video/mp4',
    }),
  })
  const uploadPayload = await parseJsonResponse(uploadResponse)
  if (!uploadResponse.ok || uploadPayload.error) {
    throw new Error(String(uploadPayload.error || 'Could not prepare upload'))
  }

  const uploadPath = String(uploadPayload.path)
  const { error: storageError } = await supabase.storage
    .from('videos')
    .uploadToSignedUrl(
      uploadPath,
      String(uploadPayload.token),
      file,
      { contentType: file.type || 'video/mp4' },
    )
  if (storageError) throw new Error(storageError.message)

  const readResponse = await fetch('/api/analyze-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'read', path: uploadPath }),
  })
  const readPayload = await parseJsonResponse(readResponse)
  if (!readResponse.ok || readPayload.error) {
    throw new Error(String(readPayload.error || 'Could not read video'))
  }

  const response = await fetch('/api/video-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoUrl: readPayload.signedUrl,
      videoMimeType: file.type || 'video/mp4',
      storagePath: `videos/${uploadPath}`,
      videoDurationSeconds: videoDuration,
      sport,
      shotType: shotType || undefined,
      title,
      cameraAngle: 'side-on',
      playerName: 'Athlete',
      playerId,
    }),
  })
  const payload = await parseJsonResponse(response)
  if (!response.ok || payload.error) {
    throw new Error(String(payload.error || 'Analysis failed'))
  }

  const sessionId =
    typeof payload.sessionId === 'string'
      ? payload.sessionId
      : typeof payload.session_id === 'string'
        ? payload.session_id
        : null

  if (!sessionId) {
    throw new Error('Analysis completed but no session was saved')
  }

  return { sessionId }
}
