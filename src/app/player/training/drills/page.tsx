'use client'

import Link from 'next/link'
import PlayerTrainingDrills from '@/components/player/PlayerTrainingDrills'
import {
  portalPageTitleStyle,
  portalPageWrapStyle,
} from '@/lib/player-portal-styles'

export default function TrainingDrillsPage() {
  return (
    <div style={{ ...portalPageWrapStyle, padding: '14px 16px 40px' }}>
      <Link
        href="/player/training"
        style={{
          display: 'inline-block',
          fontSize: 12,
          color: '#0F6E56',
          fontWeight: 500,
          textDecoration: 'none',
          marginBottom: 12,
        }}
      >
        ← Training
      </Link>

      <h1 style={{ ...portalPageTitleStyle, marginBottom: 14 }}>
        Drill library
      </h1>

      <PlayerTrainingDrills />
    </div>
  )
}
