'use client'

import type { ReactNode } from 'react'
import { Sparkle } from 'lucide-react'
import { brand, fonts } from '@/lib/brand'
import PlayerHomeViaHero from '@/components/player/home/PlayerHomeViaHero'
import PlayerHomeQuickStats, {
  type HomeStat,
} from '@/components/player/home/PlayerHomeQuickStats'
import PlayerHomeTodaysPlan from '@/components/player/home/PlayerHomeTodaysPlan'
import PlayerHomeJourneySnapshot from '@/components/player/home/PlayerHomeJourneySnapshot'
import PlayerHomeAddReelCard from '@/components/player/home/PlayerHomeAddReelCard'

const CSS = `
  @media (max-width: 640px) {
    .player-home-plan { grid-template-columns: 1fr !important; }
    .player-home-stats { grid-template-columns: repeat(2, 1fr) !important; }
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
  welcomeMessage,
  prompts,
  stats,
  drill,
  lesson,
  journey,
}: HomeDesktopProps) {
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

      <PlayerHomeViaHero
        playerId={playerId}
        playerName={playerName}
        welcomeMessage={welcomeMessage}
        prompts={prompts}
      />

      <PlayerHomeQuickStats stats={stats} />

      <PlayerHomeTodaysPlan drill={drill} lesson={lesson} />

      {journey && (
        <PlayerHomeJourneySnapshot
          rating={journey.rating}
          ratingDelta={journey.ratingDelta}
          tier={journey.tier}
          nextTier={journey.nextTier}
          pointsToNext={journey.pointsToNext}
        />
      )}

      <PlayerHomeAddReelCard />
    </div>
  )
}
