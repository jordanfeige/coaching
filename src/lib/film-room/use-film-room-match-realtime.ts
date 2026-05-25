'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

/** Subscribe to match row updates for the current player (chunking → ready, etc.). */
export function useFilmRoomMatchRealtime(
  playerId: string | null | undefined,
  onMatchUpdate: (payload: {
    id: string
    status: string
    opponent_name: string | null
    oldStatus: string | null
  }) => void,
) {
  useEffect(() => {
    if (!playerId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`film-room-matches:${playerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `player_id=eq.${playerId}`,
        },
        payload => {
          const newRow = payload.new as {
            id: string
            status: string
            opponent_name: string | null
          }
          const oldRow = payload.old as { status?: string } | undefined
          onMatchUpdate({
            id: newRow.id,
            status: newRow.status,
            opponent_name: newRow.opponent_name,
            oldStatus: oldRow?.status ?? null,
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [playerId, onMatchUpdate])
}
