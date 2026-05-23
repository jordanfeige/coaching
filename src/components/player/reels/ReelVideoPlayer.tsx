'use client'

import { isImageMediaPath } from '@/lib/video-frames'

type Props = {
  videoUrl: string | null
  storagePath?: string | null
  title?: string
}

export function ReelVideoPlayer({ videoUrl, storagePath, title }: Props) {
  if (!videoUrl) {
    return (
      <div
        style={{
          background: '#0d1a14',
          borderRadius: 12,
          padding: '28px 16px',
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,.45)' }}>
          Video not available
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(255,255,255,.25)' }}>
          This reel may be from before clips were saved, or playback access failed.
        </p>
      </div>
    )
  }

  const pathForMime = storagePath ?? title
  if (isImageMediaPath(pathForMime)) {
    return (
      <div
        style={{
          borderRadius: 12,
          overflow: 'hidden',
          background: '#0A2A22',
          marginBottom: 16,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={videoUrl}
          alt={title || 'Reel'}
          style={{
            width: '100%',
            display: 'block',
            maxHeight: 360,
            objectFit: 'contain',
          }}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        background: '#0A2A22',
        marginBottom: 16,
      }}
    >
      <video
        src={videoUrl}
        controls
        playsInline
        preload="metadata"
        style={{
          width: '100%',
          display: 'block',
          maxHeight: 360,
          objectFit: 'contain',
          background: 'black',
        }}
      >
        <track kind="captions" />
      </video>
    </div>
  )
}
