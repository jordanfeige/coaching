'use client'

import UniversalVia from '@/components/UniversalVia'
import { useViaContext } from '@/components/via/UniversalViaContext'
import type { PageContext } from '@/lib/via-page-brief'

type Props = {
  playerId?: string
  playerName?: string
  pageContext?: PageContext
}

export default function PlayerDesktopViaPanel({
  playerId,
  playerName,
  pageContext,
}: Props) {
  const { prefilledPrompt } = useViaContext()

  if (!prefilledPrompt) return null

  return (
    <div className="hidden lg:block" style={{ marginTop: 16, marginBottom: 24 }}>
      <UniversalVia
        role="player"
        playerId={playerId}
        playerName={playerName}
        pageContext={pageContext}
        embedded
        autoSendPrompt={prefilledPrompt}
      />
    </div>
  )
}
