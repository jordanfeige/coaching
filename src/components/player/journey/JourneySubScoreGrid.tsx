'use client'

import type { JourneyPageViewModel } from '@/lib/journey-types'
import { brand, fonts } from '@/lib/brand'
import { Bar } from '@/components/journey/Bar'
import { ExposureSignalsList } from '@/components/journey/ExposureSignalsList'
import AskViaAnchor from '@/components/player/AskViaAnchor'
import { CATEGORY_COLORS } from '@/components/journey/JourneyTokens'

type Props = {
  categories: JourneyPageViewModel['categories']
  onTapScore: (key: string) => void
  lowestGap: { label: string; pct: number } | null
}

export default function JourneySubScoreGrid({
  categories,
  onTapScore,
  lowestGap,
}: Props) {
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
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
              {cat.key === 'exposure' && cat.exposureSignals?.length ? (
                <ExposureSignalsList signals={cat.exposureSignals} compact />
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}
