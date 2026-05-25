'use client'

import { useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useFilmRoomMatchRealtime } from '@/lib/film-room/use-film-room-match-realtime'

type Props = {
  playerId: string | null | undefined
}

export function MatchReadyToastWatcher({ playerId }: Props) {
  const router = useRouter()
  const toastedIds = useRef(new Set<string>())

  const onMatchUpdate = useCallback(
    (update: {
      id: string
      status: string
      opponent_name: string | null
      oldStatus: string | null
    }) => {
      if (update.status !== 'ready' || update.oldStatus === 'ready') return
      if (toastedIds.current.has(update.id)) return
      toastedIds.current.add(update.id)

      const label = update.opponent_name
        ? `vs ${update.opponent_name}`
        : 'Untitled match'

      toast.success('Your match analysis is ready!', {
        description: `${label} — Tap to view`,
        duration: 8000,
        action: {
          label: 'View',
          onClick: () => router.push(`/player/reels/match/${update.id}`),
        },
      })
    },
    [router],
  )

  useFilmRoomMatchRealtime(playerId, onMatchUpdate)

  return null
}
