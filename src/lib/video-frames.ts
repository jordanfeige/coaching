export type ExtractedVideoFrame = {
  index: number
  timestamp: number
  mediaType: 'image/jpeg'
  base64: string
  dataUrl: string
}

type ExtractOptions = {
  count?: number
  maxWidth?: number
  quality?: number
}

function seek(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
    }
    const onSeeked = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error('Could not seek video while extracting frames.'))
    }
    video.addEventListener('seeked', onSeeked, { once: true })
    video.addEventListener('error', onError, { once: true })
    video.currentTime = Math.min(Math.max(time, 0), Math.max(video.duration - 0.1, 0))
  })
}

function loadVideo(url: string) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.src = url

    video.onloadedmetadata = () => resolve(video)
    video.onerror = () => reject(new Error('Could not load video for frame extraction.'))
    video.load()
  })
}

export async function extractVideoFrames(
  videoUrl: string,
  { count = 8, maxWidth = 720, quality = 0.62 }: ExtractOptions = {}
): Promise<ExtractedVideoFrame[]> {
  const video = await loadVideo(videoUrl)
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 6
  const frameCount = Math.max(3, Math.min(count, 12))
  const times = Array.from({ length: frameCount }, (_, i) => {
    const pct = frameCount === 1 ? 0.5 : (i + 0.5) / frameCount
    return Math.min(duration * pct, Math.max(duration - 0.1, 0))
  })

  const ratio = video.videoWidth > maxWidth ? maxWidth / video.videoWidth : 1
  const width = Math.max(Math.round((video.videoWidth || maxWidth) * ratio), 1)
  const height = Math.max(Math.round((video.videoHeight || 405) * ratio), 1)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not prepare frame extraction canvas.')

  const frames: ExtractedVideoFrame[] = []
  for (let i = 0; i < times.length; i++) {
    await seek(video, times[i])
    ctx.drawImage(video, 0, 0, width, height)
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    frames.push({
      index: i,
      timestamp: times[i],
      mediaType: 'image/jpeg',
      base64: dataUrl.split(',')[1] || '',
      dataUrl,
    })
  }
  video.removeAttribute('src')
  video.load()
  return frames
}

export function analysisFramePreviews(frames: ExtractedVideoFrame[]) {
  return frames.map(frame => ({
    index: frame.index,
    timestamp: frame.timestamp,
    dataUrl: frame.dataUrl,
  }))
}
