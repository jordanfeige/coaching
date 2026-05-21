'use client'

import type { ReactNode } from 'react'
import PlayerViaHero from '@/components/player/PlayerViaHero'
import type { PageContext } from '@/lib/via-page-brief'

type Props = {
  playerId: string
  playerName: string
  welcomeMessage: ReactNode
  prompts: string[]
}

/** Home page Via — uses the shared player hero. */
export default function PlayerHomeViaHero({
  playerId,
  playerName,
  welcomeMessage,
  prompts,
}: Props) {
  const pageContext: PageContext = { page: 'player-home' }

  return (
    <PlayerViaHero
      playerId={playerId}
      playerName={playerName}
      pageContext={pageContext}
      welcomeMessage={welcomeMessage}
      prompts={prompts}
    />
  )
}
