'use client'

import { useState, type ReactNode } from 'react'
import { Sparkle } from 'lucide-react'
import { brand, fonts } from '@/lib/brand'
import PlayerHomeQuickStats, {
  type HomeStat,
} from '@/components/player/home/PlayerHomeQuickStats'
import PlayerHomeTodaysPlan from '@/components/player/home/PlayerHomeTodaysPlan'
import PlayerHomeJourneySnapshot from '@/components/player/home/PlayerHomeJourneySnapshot'
import TrajectoryChartCompact from '@/components/player/home-desktop/TrajectoryChartCompact'
import PlayerHomeAddReelCard from '@/components/player/home/PlayerHomeAddReelCard'
import { QuestsTeaser } from '@/components/player/home/QuestsTeaser'
import { JourneyRatingHomeCard } from '@/components/player/home/JourneyRatingHomeCard'

const CSS = `
  @media (max-width: 640px) {
    .player-home-plan { grid-template-columns: 1fr !important; }
    .player-home-stats { grid-template-columns: repeat(3, 1fr) !important; }
    .player-home-stats > div { padding: 12px 10px !important; }
  }
`

export type HomeDesktopProps = {
  playerId: string
  playerName: string
  firstName: string
  editorialLine: string
  welcomeMessage: ReactNode
  prompts: string[]
  stats: HomeStat[]
  drill: {
    id: string
    title: string
    description?: string | null
    completed_at?: string | null
  } | null
  lesson: { startsAt: Date; notes?: string | null } | null
  journey: {
    rating: number
    ratingDelta: number | null
    tier: string
    nextTier: string | null
    pointsToNext: number
  } | null
}

export default function HomeDesktopLayout({
  playerId,
  playerName,
  firstName,
  editorialLine,
  welcomeMessage: _welcomeMessage,
  prompts: _prompts,
  stats,
  drill,
  lesson,
  journey,
}: HomeDesktopProps) {
  const [trajectoryChartVisible, setTrajectoryChartVisible] = useState(false)

  return (
    <div style={{ fontFamily: fonts.serif, color: brand.ink }}>
      <style>{CSS}</style>

      <div
        style={{
          fontFamily: fonts.serif,
          fontSize: 13,
          fontStyle: 'italic',
          color: brand.sub,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          letterSpacing: '0.01em',
        }}
      >
        <Sparkle size={12} color={brand.tealHex} strokeWidth={2} />
        {editorialLine}
      </div>

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
