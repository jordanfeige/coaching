'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase'
import { getLinkedPlayerRowForUser } from '@/lib/linked-player'
import PlayerViaHero from '@/components/player/PlayerViaHero'
import type { UniversalViaReelContext } from '@/components/UniversalVia'
import { generatePlayerPageBrief } from '@/lib/via-page-brief'
import type { PageContext } from '@/lib/via-page-brief'

type Props = {
  playerId?: string
  playerName?: string
  pageContext: PageContext
  /** Override brief line (e.g. home UTR welcome). */
  welcomeMessage?: ReactNode
  prompts?: string[]
  reelContext?: UniversalViaReelContext
}

/** Standard player Via — same hero UI as Home, wired to askVia / AskViaAnchor. */
export default function PlayerPageVia({
  playerId: playerIdProp,
  playerName: playerNameProp,
  pageContext,
  welcomeMessage,
  prompts: promptsProp,
  reelContext,
}: Props) {
  const { brief, prompts: briefPrompts } = useMemo(
    () => generatePlayerPageBrief(pageContext),
    [pageContext],
  )

  const [playerId, setPlayerId] = useState(playerIdProp ?? '')
  const [playerName, setPlayerName] = useState(playerNameProp ?? 'Athlete')

  useEffect(() => {
    if (playerIdProp) {
      setPlayerId(playerIdProp)
      setPlayerName(playerNameProp ?? 'Athlete')
    }
  }, [playerIdProp, playerNameProp])

  useEffect(() => {
    if (playerIdProp) return
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const row = await getLinkedPlayerRowForUser(supabase, user.id)
      if (!row?.id || cancelled) return
      setPlayerId(row.id)
      setPlayerName(row.name ?? 'Athlete')
    })()
    return () => {
      cancelled = true
    }
  }, [playerIdProp])

  const displayWelcome = welcomeMessage ?? brief
  const displayPrompts = promptsProp ?? briefPrompts

  return (
    <PlayerViaHero
      playerId={playerId}
      playerName={playerName}
      pageContext={pageContext}
      welcomeMessage={displayWelcome}
      prompts={displayPrompts}
      reelContext={reelContext}
      chatEnabled={Boolean(playerId)}
    />
  )
}
