'use client'

import PlayerPageVia from '@/components/player/PlayerPageVia'
import { fonts } from '@/lib/brand'

const TEXT = 'hsl(220,20%,15%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = '#F5F4F0'

export default function PlayerCoachPage() {
  return (
    <div
      style={{
        fontFamily: fonts.sans,
        color: TEXT,
        maxWidth: 720,
        margin: '0 auto',
        padding: '0 0 40px',
        background: WARM_BG,
        marginLeft: -16,
        marginRight: -16,
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      <PlayerPageVia pageContext={{ page: 'player-coach' }} />

      <h1
        style={{
          fontFamily: fonts.serif,
          fontSize: 24,
          fontWeight: 400,
          margin: '0 0 12px',
        }}
      >
        Coach
      </h1>
      <p style={{ fontSize: 15, color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>
        Your coach view — coming soon
      </p>
    </div>
  )
}
