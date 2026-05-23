'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FilmRoomChunk } from '@/lib/film-room/types'

type Props = {
  chunks: FilmRoomChunk[]
  rawVideoUrl?: string | null
  seekToSeconds?: number | null
}

function chunkAtTime(chunks: FilmRoomChunk[], t: number): FilmRoomChunk | undefined {
  return chunks.find(c => t >= c.start_seconds && t < c.end_seconds) ?? chunks[chunks.length - 1]
}

export function MatchFilmVideoPlayer({ chunks, rawVideoUrl, seekToSeconds }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [activeChunkId, setActiveChunkId] = useState<string | null>(chunks[0]?.id ?? null)
  const [chunkUrl, setChunkUrl] = useState<string | null>(rawVideoUrl ?? null)
  const [loadingUrl, setLoadingUrl] = useState(false)

  const activeChunk = useMemo(
    () => chunks.find(c => c.id === activeChunkId) ?? chunks[0],
    [chunks, activeChunkId],
  )

  const loadChunkUrl = useCallback(
    async (chunkId: string) => {
      if (rawVideoUrl) return rawVideoUrl
      setLoadingUrl(true)
      try {
        const res = await fetch(`/api/film-room/chunk/${chunkId}/url`)
        const data = await res.json()
        return (data.url as string) ?? null
      } catch {
        return null
      } finally {
        setLoadingUrl(false)
      }
    },
    [rawVideoUrl],
  )

  useEffect(() => {
    if (rawVideoUrl) {
      setChunkUrl(rawVideoUrl)
      return
    }
    if (!activeChunk?.id) return
    let cancelled = false
    loadChunkUrl(activeChunk.id).then(url => {
      if (!cancelled) setChunkUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [activeChunk?.id, rawVideoUrl, loadChunkUrl])

  useEffect(() => {
    if (seekToSeconds == null) return
    const ch = chunkAtTime(chunks, seekToSeconds)
    if (!ch) return
    setActiveChunkId(ch.id)
    const v = videoRef.current
    if (v && !rawVideoUrl) {
      const local = seekToSeconds - ch.start_seconds
      if (v.readyState >= 1) v.currentTime = local
    } else if (v && rawVideoUrl) {
      v.currentTime = seekToSeconds
    }
  }, [seekToSeconds, chunks, rawVideoUrl])

  return (
    <div style={{ margin: '0 -16px 20px', padding: '0 16px' }}>
      <div
        style={{
          width: '100%',
          background: '#000',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {chunkUrl ? (
          <video
            ref={videoRef}
            key={rawVideoUrl ? 'raw' : activeChunk?.id}
            src={chunkUrl}
            controls
            playsInline
            preload="metadata"
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              maxHeight: 240,
              objectFit: 'contain',
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 160,
              color: '#9CA3AF',
              fontSize: 13,
            }}
          >
            {loadingUrl ? 'Loading video…' : 'Video unavailable'}
          </div>
        )}
      </div>
    </div>
  )
}
