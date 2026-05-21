'use client'

import { useState } from 'react'
import type { JourneyPageViewModel } from '@/lib/journey-types'
import { PlayerCard } from '@/components/journey/PlayerCard'
import { BreakdownSheet } from '@/components/journey/BreakdownSheet'
import { TOKENS, FONTS } from '@/components/journey/JourneyTokens'
import { brand, fonts } from '@/lib/brand'
import { SubScoreTilesGrid } from '@/components/player/journey-desktop/SubScoreTilesGrid'
import { RoadToOffer } from '@/components/player/journey-desktop/RoadToOffer'
import JourneyRecentChanges from '@/components/player/journey/JourneyRecentChanges'
import { portalPageTitleStyle } from '@/lib/player-portal-styles'

type Props = {
  data: JourneyPageViewModel
}

export default function JourneyRatingOnly({ data }: Props) {
  const [sheetFocus, setSheetFocus] = useState<string | null>(null)
  const m = data

  return (
    <>
      <div
        className="mx-auto w-full"
        style={{
          maxWidth: 800,
          padding: '14px 16px 60px',
        }}
      >
        <header style={{ marginBottom: 20 }}>
          <h1 style={portalPageTitleStyle}>Journey rating</h1>
          <p
            style={{
              fontFamily: fonts.serif,
              fontSize: 15,
              fontStyle: 'italic',
              color: brand.sub,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {m.player.sport} · Class of {m.player.classYear}
          </p>
        </header>

        {m.isEmpty && (
          <div
            style={{
              background: brand.paper,
              border: `1px solid ${brand.line}`,
              borderRadius: 12,
              padding: '14px 16px',
              marginBottom: 20,
              fontFamily: fonts.sans,
              fontSize: 13,
              color: brand.sub,
              lineHeight: 1.5,
            }}
          >
            Add UTR, academics, and match history to generate your first Journey
            rating.
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <PlayerCard
            player={m.player}
            categories={m.categories}
            onTapScore={key => setSheetFocus(key)}
            hideSubScores
          />

          <SubScoreTilesGrid
            categories={m.categories}
            nudgeContext={m.nudgeContext}
            onTileClick={key => setSheetFocus(key)}
          />

          <RoadToOffer {...m.roadToOffer} />
        </div>

        <div style={{ marginTop: 14 }}>
          <JourneyRecentChanges events={m.events} />
        </div>

        <p
          style={{
            textAlign: 'center',
            marginTop: 24,
            fontFamily: FONTS.sans,
            fontSize: 11,
            color: TOKENS.MUTED,
            lineHeight: 1.6,
          }}
        >
          Tap any sub-score to see the math behind your rating.
        </p>
      </div>

      <BreakdownSheet
        open={sheetFocus !== null}
        focus={sheetFocus}
        breakdown={{
          total: m.player.journeyRating,
          categories: m.categories,
          events: m.events,
          weightsVersion: m.weightsVersion,
        }}
        onClose={() => setSheetFocus(null)}
      />
    </>
  )
}
