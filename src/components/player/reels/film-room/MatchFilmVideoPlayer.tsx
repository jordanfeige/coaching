'use client'

import { brand } from '@/lib/brand'
import { formatSegmentTime } from '@/lib/film-room/format'
import type { FilmRoomChunk } from '@/lib/film-room/types'

type Props = {
  activeChunk: FilmRoomChunk | null
  videoUrl: string | null
  loading: boolean
}

export function MatchFilmVideoPlayer({ activeChunk, videoUrl, loading }: Props) {
  if (!activeChunk) {
    return (
      <div style={{ margin: '0 -16px 20px', padding: '0 16px' }}>
        <div
          style={{
            height: 240,
            borderRadius: 8,
            background: '#0d1a14',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 13,
          }}
        >
          No segments yet
        </div>
      </div>
    )
  }

  const label = `Segment ${activeChunk.sequence_number + 1} · ${formatSegmentTime(activeChunk.start_seconds)} – ${formatSegmentTime(activeChunk.end_seconds)}`

  return (
    <div style={{ margin: '0 -16px 20px' }}>
      <p
        style={{
          fontSize: 11,
          color: brand.sub,
          margin: '0 0 8px',
          padding: '0 16px',
        }}
      >
        {label}
      </p>
      <div style={{ padding: '0 16px' }}>
        {videoUrl ? (
          <video
            key={activeChunk.id}
            src={videoUrl}
            controls
            playsInline
            preload="metadata"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: 280,
              borderRadius: 8,
              background: '#000',
              display: 'block',
            }}
          />
        ) : (
          <div
            style={{
              height: 240,
              borderRadius: 8,
              background: '#0d1a14',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 13,
            }}
          >
            {loading ? 'Loading segment…' : 'Could not load segment video'}
          </div>
        )}
      </div>
    </div>
  )
}
