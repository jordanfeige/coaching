'use client'

import Link from 'next/link'
import { useState } from 'react'
import { QuestsCard } from '@/components/player/training/QuestsCard'
import { WeeklyPlanCard } from '@/components/player/training/WeeklyPlanCard'
import { StreakCard } from '@/components/player/training/StreakCard'
import { usePageReady } from '@/contexts/PageLoadingContext'
import { portalPageTitleStyle } from '@/lib/player-portal-styles'

export function TrainingPageContent() {
  const [questsReady, setQuestsReady] = useState(false)
  const [planReady, setPlanReady] = useState(false)
  const [streakReady, setStreakReady] = useState(false)

  usePageReady(questsReady && planReady && streakReady)

  return (
    <>
      <h1 style={portalPageTitleStyle}>Training</h1>

      <QuestsCard onReadyChange={setQuestsReady} />
      <WeeklyPlanCard onReadyChange={setPlanReady} />
      <StreakCard onReadyChange={setStreakReady} />

      <div
        style={{
          marginTop: 16,
          padding: '14px 18px',
          background: 'white',
          borderRadius: 12,
          border: '0.5px solid rgba(0,0,0,0.06)',
          textAlign: 'center',
        }}
      >
        <Link
          href="/player/training/drills"
          style={{
            fontSize: 12,
            color: '#0F6E56',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          See all drill library →
        </Link>
      </div>
    </>
  )
}
