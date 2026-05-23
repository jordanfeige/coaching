/**
 * Extract a single frame from a video file as a JPEG data URL.
 */
export async function extractFrameFromVideo(
  file: File,
  timestampSeconds = 30,
): Promise<{
  dataUrl: string
  width: number
  height: number
  capturedAtSeconds: number
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true

    const url = URL.createObjectURL(file)
    video.src = url

    const cleanup = () => {
      URL.revokeObjectURL(url)
      video.remove()
    }

    video.addEventListener('loadedmetadata', () => {
      const seekTo = Math.min(
        timestampSeconds,
        Math.max(0, (video.duration || timestampSeconds) - 0.5),
      )
      video.currentTime = seekTo
    })

    video.addEventListener('seeked', () => {
      try {
        const maxWidth = 1280
        const scale =
          video.videoWidth > maxWidth ? maxWidth / video.videoWidth : 1
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(video.videoWidth * scale)
        canvas.height = Math.round(video.videoHeight * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Could not get canvas context')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72)
        resolve({
          dataUrl,
          width: video.videoWidth,
          height: video.videoHeight,
          capturedAtSeconds: video.currentTime,
        })
        cleanup()
      } catch (err) {
        cleanup()
        reject(err)
      }
    })

    video.addEventListener('error', () => {
      cleanup()
      reject(new Error('Could not load video for frame extraction'))
    })
  })
}
