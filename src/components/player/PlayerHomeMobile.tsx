'use client'

import { useState, type ReactNode } from 'react'
import PlayerHomeQuickStats, {
  type HomeStat,
} from '@/components/player/home/PlayerHomeQuickStats'
import PlayerHomeTodaysPlan from '@/components/player/home/PlayerHomeTodaysPlan'
import PlayerHomeAddReelCard from '@/components/player/home/PlayerHomeAddReelCard'
import PlayerHomeJourneySnapshot from '@/components/player/home/PlayerHomeJourneySnapshot'
import TrajectoryChartCompact from '@/components/player/home-desktop/TrajectoryChartCompact'
import { QuestsTeaser } from '@/components/player/home/QuestsTeaser'
import { JourneyRatingHomeCard } from '@/components/player/home/JourneyRatingHomeCard'
const TEXT = 'hsl(220,20%,15%)'

export type PlayerHomeMobileProps = {
  player: { id: string; name: string | null; sport: string | null }
  journey: {
    rating: number
    ratingDelta: number | null
    tier: string
    nextTier: string | null
    pointsToNext: number
  } | null
  stats: HomeStat[]
  drill: {
    id: string
    title: string
    description?: string | null
    completed_at?: string | null
  } | null
  lesson: { startsAt: Date; notes?: string | null } | null
  welcomeMessage: ReactNode
  prompts: string[]
  sessions: Array<Record<string, unknown>>
  currentScore: number | null
  delta: number | null
}

const CSS = `
  @media (max-width: 640px) {
    .player-home-stats { grid-template-columns: repeat(3, 1fr) !important; }
    .player-home-stats > div { padding: 12px 10px !important; }
  }
`

export default function PlayerHomeMobile({
  player,
  journey,
  stats,
  drill,
  lesson,
  sessions: _sessions,
  currentScore: _currentScore,
  delta: _delta,
  welcomeMessage: _welcomeMessage,
  prompts: _prompts,
}: PlayerHomeMobileProps) {
  const [trajectoryChartVisible, setTrajectoryChartVisible] = useState(false)

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        color: TEXT,
        maxWidth: 720,
        margin: '0 auto',
        padding: '0 0 40px',
        minHeight: '100%',
      }}
    >
      <style>{CSS}</style>

      <TrajectoryChartCompact
        onChartVisible={setTrajectoryChartVisible}
        fallback={
          journey ? (
            <PlayerHomeJourneySnapshot
              rating={journey.rating}
              ratingDelta={journey.ratingDelta}
              tier={journey.tier}
              nextTier={journey.nextTier}
              pointsToNext={journey.pointsToNext}
            />
          ) : null
        }
      />

      <QuestsTeaser />

      {trajectoryChartVisible && journey && (
        <JourneyRatingHomeCard
          rating={journey.rating}
          ratingDelta={journey.ratingDelta}
          tier={journey.tier}
          nextTier={journey.nextTier}
          pointsToNext={journey.pointsToNext}
        />
      )}

      <PlayerHomeQuickStats stats={stats} />

      <PlayerHomeTodaysPlan drill={drill} lesson={lesson} />

      <PlayerHomeAddReelCard />
    </div>
  )
}
