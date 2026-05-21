'use client'

import PlayerPageVia from '@/components/player/PlayerPageVia'
import PlayerProfileSettings from '@/components/player/settings/PlayerProfileSettings'

export default function PlayerSettingsPage() {
  return (
    <div style={{ padding: '20px 16px 60px' }}>
      <PlayerPageVia pageContext={{ page: 'player-settings' }} />
      <PlayerProfileSettings />
    </div>
  )
}
