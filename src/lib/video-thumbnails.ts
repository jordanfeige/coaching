'use client'

export function titleInitials(title?: string | null) {
  const words = (title || 'Video')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return words.slice(0, 2).map(word => word[0]?.toUpperCase()).join('') || 'V'
}

export async function generateMediaThumbnailDataUrl(file: Blob): Promise<string | null> {
  if (file.type.startsWith('image/')) {
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    })
  }

  if (!file.type.startsWith('video/')) return null

  return new Promise(resolve => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    const cleanup = () => URL.revokeObjectURL(url)

    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(0.5, Math.max((video.duration || 1) * 0.1, 0))
    }
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 320
        canvas.height = Math.max(1, Math.round((video.videoHeight / Math.max(video.videoWidth, 1)) * canvas.width))
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          cleanup()
          resolve(null)
          return
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        cleanup()
        resolve(canvas.toDataURL('image/jpeg', 0.78))
      } catch {
        cleanup()
        resolve(null)
      }
    }
    video.onerror = () => {
      cleanup()
      resolve(null)
    }
    video.src = url
  })
}
