'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getLinkedPlayerRowForUser } from '@/lib/linked-player'
import UtrLinkPanel from '@/components/UtrLinkPanel'

export default function JourneyUtrSection() {
  const router = useRouter()
  const supabase = createClient()
  const [player, setPlayer] = useState<{
    id: string
    name: string
    utr_player_id: string | null
    utr_singles: number | null
    utr_doubles: number | null
    utr_last_synced: string | null
  } | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const row = await getLinkedPlayerRowForUser(supabase, user.id)
    if (!row?.id) return

    const { data: recruiting } = await supabase
      .from('recruiting_profiles')
      .select('utr_display_name, last_synced_at')
      .eq('player_id', row.id)
      .maybeSingle()

    setPlayer({
      id: row.id,
      name: row.name || 'Athlete',
      utr_player_id: row.utr_player_id,
      utr_singles: row.utr_singles,
      utr_doubles: row.utr_doubles,
      utr_last_synced: row.utr_last_synced,
    })
    setDisplayName(recruiting?.utr_display_name ?? null)
  }, [supabase])

  useEffect(() => {
    void load()
  }, [load])

  if (!player) return null

  return (
    <div style={{ marginTop: 28 }}>
      <UtrLinkPanel
        playerId={player.id}
        playerName={player.name}
        utrPlayerId={player.utr_player_id}
        utrSingles={player.utr_singles}
        utrDoubles={player.utr_doubles}
        utrDisplayName={displayName}
        lastSyncedAt={player.utr_last_synced}
        onUpdated={() => {
          void load()
          router.refresh()
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('playvia:utr-updated'))
          }
        }}
      />
    </div>
  )
}
