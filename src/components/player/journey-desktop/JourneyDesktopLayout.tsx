'use client'

import { useState } from 'react'
import type { JourneyPageViewModel } from '@/lib/journey-types'
import { brand, fonts } from '@/lib/brand'
import { PlayerCard } from '@/components/journey/PlayerCard'
import { RoadToOffer } from '@/components/journey/RoadToOffer'
import { QuestCard } from '@/components/journey/QuestCard'
import { BreakdownSheet } from '@/components/journey/BreakdownSheet'
import { Bar } from '@/components/journey/Bar'
import JourneyUtrSection from '@/components/journey/JourneyUtrSection'
import AskViaAnchor from '@/components/player/AskViaAnchor'
import { TOKENS, FONTS, CATEGORY_COLORS } from '@/components/journey/JourneyTokens'

type Props = {
  data: JourneyPageViewModel
}

function SubScoreGrid({
  categories,
  onTapScore,
  lowestGap,
}: {
  categories: JourneyPageViewModel['categories']
  onTapScore: (key: string) => void
  lowestGap: { label: string; pct: number } | null
}) {
  return (
    <section style={{ marginTop: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: brand.sub,
          }}
        >
          Sub-scores
        </div>
        <AskViaAnchor
          prompt="Which sub-score gap should I prioritize closing first?"
          label="Which gap should I fix first?"
          context={
            lowestGap
              ? `Lowest: ${lowestGap.label} at ${lowestGap.pct}%`
              : 'journey-subscores'
          }
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}
      >
        {categories.map(cat => {
          const colors = CATEGORY_COLORS[cat.key]
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onTapScore(cat.key)}
              style={{
                background: 'white',
                border: `1px solid ${brand.line}`,
                borderRadius: 16,
                padding: '18px 20px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'box-shadow 0.15s',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 22 }}>{cat.icon}</span>
                <span
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: colors?.color ?? brand.tealDarkHex,
                  }}
                >
                  {cat.weight}% weight
                </span>
              </div>
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: brand.sub,
                  marginBottom: 4,
                }}
              >
                {cat.label}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontFamily: fonts.serif,
                    fontSize: 32,
                    fontWeight: 700,
                    color: brand.ink,
                    lineHeight: 1,
                    letterSpacing: '-1px',
                  }}
                >
                  {cat.pct}%
                </span>
                <span
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 12,
                    color: brand.muted,
                  }}
                >
                  {cat.score} pts
                </span>
              </div>
              <Bar
                value={cat.pct / 100}
                color={colors?.color ?? brand.tealHex}
                trackColor={brand.lineSoft}
                height={4}
              />
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  color: brand.sub,
                  lineHeight: 1.5,
                  marginTop: 10,
                }}
              >
                {cat.gap}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function DesktopMomentum({ data }: { data: JourneyPageViewModel }) {
  const m = data.momentum
  return (
    <section style={{ marginTop: 20 }}>
      <div
        style={{
          fontFamily: fonts.sans,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: brand.sub,
          marginBottom: 12,
        }}
      >
        Momentum
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div
          style={{
            background: brand.tealTint,
            border: `1px solid rgba(45,155,127,0.25)`,
            borderRadius: 16,
            padding: '18px 20px',
          }}
        >
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: brand.tealDarkHex,
              marginBottom: 8,
            }}
          >
            Fastest mover
          </div>
          <div
            style={{
              fontFamily: fonts.serif,
              fontSize: 20,
              fontWeight: 700,
              color: brand.ink,
              marginBottom: 4,
            }}
          >
            {m.fastestMover.name}
          </div>
          <div style={{ fontFamily: fonts.sans, fontSize: 13, color: brand.sub }}>
            {m.fastestMover.delta} · {m.fastestMover.window}
          </div>
        </div>
        <div
          style={{
            background: brand.blueTint,
            border: `1px solid rgba(24,95,165,0.2)`,
            borderRadius: 16,
            padding: '18px 20px',
          }}
        >
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: brand.blueHex,
              marginBottom: 8,
            }}
          >
            UTR percentile
          </div>
          <div
            style={{
              fontFamily: fonts.serif,
              fontSize: 36,
              fontWeight: 700,
              color: brand.ink,
              lineHeight: 1,
            }}
          >
            {m.utrPercentile}%
          </div>
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 12,
              color: brand.sub,
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            {m.statement}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function JourneyDesktopLayout({ data }: Props) {
  const [sheetFocus, setSheetFocus] = useState<string | null>(null)
  const m = data

  const lowestCategory = [...m.categories].sort((a, b) => a.pct - b.pct)[0]
  const lowestGap = lowestCategory
    ? { label: lowestCategory.label, pct: lowestCategory.pct }
    : null

  return (
    <>
      <header style={{ marginBottom: 28 }}>
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: brand.sub,
            marginBottom: 8,
          }}
        >
          Your Journey
        </div>
        <h1
          style={{
            fontFamily: fonts.serif,
            fontSize: 34,
            fontWeight: 700,
            color: brand.ink,
            margin: '0 0 8px',
            letterSpacing: '-0.5px',
            lineHeight: 1.15,
          }}
        >
          {m.player.name}
        </h1>
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
          {m.player.sport} · Class of {m.player.classYear} · {m.player.tier}
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

      <section>
        <PlayerCard
          player={m.player}
          categories={m.categories}
          onTapScore={key => setSheetFocus(key)}
          hideSubScores
        />
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 12,
          }}
        >
          <AskViaAnchor
            prompt="Why did my rating change?"
            label="Why did my rating change?"
            context={`Rating: ${m.player.journeyRating}, delta: ${m.player.ratingDelta ?? 'n/a'}`}
            variant="light"
          />
          <AskViaAnchor
            prompt={`How do I reach ${m.player.nextTier}?`}
            label={`How do I reach ${m.player.pointsToNextTier} pts?`}
            context={`Current tier: ${m.player.tier}, next: ${m.player.nextTier}`}
            variant="light"
          />
        </div>
      </section>

      <SubScoreGrid
        categories={m.categories}
        onTapScore={key => setSheetFocus(key)}
        lowestGap={lowestGap}
      />

      <DesktopMomentum data={data} />

      <section style={{ marginTop: 28 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: fonts.sans,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: TOKENS.RUST,
              }}
            >
              Your Quests
            </div>
            <h2
              style={{
                fontFamily: fonts.serif,
                fontSize: 22,
                fontWeight: 700,
                color: brand.ink,
                margin: '6px 0 0',
                letterSpacing: '-0.3px',
              }}
            >
              {m.quests.length} ways to move the number this week.
            </h2>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          {m.quests.map(q => (
            <QuestCard key={q.id} quest={q} />
          ))}
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: brand.muted,
            }}
          >
            Road to offer
          </div>
          <AskViaAnchor
            prompt="What's my fastest path to D1?"
            label="What's my fastest path to D1?"
            context={`Tier: ${m.player.tier}, rating: ${m.player.journeyRating}`}
          />
        </div>
        <RoadToOffer milestones={m.milestones} />
      </section>

      <div style={{ marginTop: 28 }}>
        <JourneyUtrSection />
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
