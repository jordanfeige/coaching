'use client'

import { useState } from 'react'
import type { JourneyPageViewModel } from '@/lib/journey-types'
import { PlayerCard } from '@/components/journey/PlayerCard'
import { MomentumStrip } from '@/components/journey/MomentumStrip'
import { RoadToOffer } from '@/components/journey/RoadToOffer'
import { QuestCard } from '@/components/journey/QuestCard'
import { BreakdownSheet } from '@/components/journey/BreakdownSheet'
import { TOKENS, FONTS } from '@/components/journey/JourneyTokens'
import UniversalVia from '@/components/UniversalVia'

type Props = {
  data: JourneyPageViewModel
}

export default function JourneyPageClient({ data }: Props) {
  const [sheetFocus, setSheetFocus] = useState<string | null>(null)
  const m = data

  return (
    <>
      <div
        style={{
          background: TOKENS.CREAM,
          minHeight: '100vh',
          paddingBottom: 120,
          fontFamily: FONTS.serif,
          marginLeft: -16,
          marginRight: -16,
          marginTop: -16,
        }}
      >
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 60px' }}>
          <UniversalVia
            role="player"
            pageContext={{
              page: 'player-journey',
              utrSingles: m.utrSingles ?? undefined,
              targetDivision: 'D1 mid-major',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.serif,
                fontSize: 22,
                fontWeight: 700,
                color: TOKENS.INK,
              }}
            >
              Play<span style={{ color: TOKENS.TEAL, fontStyle: 'italic' }}>via</span>
            </div>
            <div
              style={{
                fontFamily: FONTS.sans,
                fontSize: 11,
                color: TOKENS.SUB,
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}
            >
              Journey
            </div>
          </div>

          {m.isEmpty && (
            <div
              style={{
                background: TOKENS.PAPER,
                border: `1px solid ${TOKENS.LINE}`,
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 14,
                fontFamily: FONTS.sans,
                fontSize: 13,
                color: TOKENS.SUB,
                lineHeight: 1.5,
              }}
            >
              Add UTR, academics, and match history to generate your first Journey
              rating.
            </div>
          )}

          <PlayerCard
            player={m.player}
            categories={m.categories}
            onTapScore={key => setSheetFocus(key)}
          />

          <div style={{ marginTop: 14 }}>
            <MomentumStrip momentum={m.momentum} classYear={m.player.classYear} />
          </div>

          <div style={{ marginTop: 18 }}>
            <RoadToOffer milestones={m.milestones} />
          </div>

          <div style={{ marginTop: 26, marginBottom: 14 }}>
            <div
              style={{
                fontFamily: FONTS.sans,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: TOKENS.RUST,
              }}
            >
              Your Quests
            </div>
            <h3
              style={{
                fontFamily: FONTS.serif,
                fontSize: 19,
                fontWeight: 700,
                color: TOKENS.INK,
                margin: '5px 0 0',
                letterSpacing: '-0.3px',
              }}
            >
              {m.quests.length} ways to move the number this week.
            </h3>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {m.quests.map(q => (
              <QuestCard key={q.id} quest={q} />
            ))}
          </div>

          <div
            style={{
              textAlign: 'center',
              marginTop: 28,
              fontFamily: FONTS.sans,
              fontSize: 11,
              color: TOKENS.MUTED,
              lineHeight: 1.6,
            }}
          >
            Tap any score to see the math.
            <br />
            Tap any chip to ask Via.
          </div>
        </div>
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
