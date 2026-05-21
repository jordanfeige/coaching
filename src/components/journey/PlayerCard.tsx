'use client'

import { useEffect, useState } from 'react'
import type { JourneyCategory } from '@/lib/journey-types'
import { ViaAnchor } from './ViaAnchor'
import { Bar } from './Bar'
import { TOKENS, FONTS, CATEGORY_COLORS } from './JourneyTokens'

type Player = {
  name: string
  sport: string
  classYear: string
  tier: string
  nextTier: string
  tierProgress: number
  journeyRating: number
  ratingDelta: number | null
  pointsToNextTier: number
}

type Props = {
  player: Player
  categories: JourneyCategory[]
  onTapScore: (key: string) => void
  /** Desktop layout shows sub-scores in a separate grid */
  hideSubScores?: boolean
}

export function PlayerCard({
  player,
  categories,
  onTapScore,
  hideSubScores = false,
}: Props) {
  const target = player.journeyRating
  const [displayed, setDisplayed] = useState(target)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const isFirstReveal =
      typeof window !== 'undefined' &&
      sessionStorage.getItem('journey_first_reveal') === 'true'

    if (!isFirstReveal) {
      setDisplayed(target)
      setRevealed(true)
      return
    }

    sessionStorage.removeItem('journey_first_reveal')
    const duration = 1500
    const startedAt = performance.now()

    function tick(now: number) {
      const elapsed = now - startedAt
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayed(Math.round(target * eased * 100) / 100)
      if (t < 1) requestAnimationFrame(tick)
      else setRevealed(true)
    }

    requestAnimationFrame(tick)
  }, [target])

  return (
    <div
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        background: 'linear-gradient(150deg, #063D31 0%, #0F6E56 70%, #0a4a3c 100%)',
        boxShadow: '0 12px 40px rgba(6,61,49,0.28)',
      }}
    >
      <div style={{ padding: '18px 18px 16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: FONTS.sans,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.55)',
                marginBottom: 4,
              }}
            >
              {player.sport} · Class of {player.classYear}
            </div>
            <div
              style={{
                fontFamily: FONTS.serif,
                fontSize: 22,
                fontWeight: 700,
                color: 'white',
                letterSpacing: '-0.3px',
              }}
            >
              {player.name}
            </div>
          </div>
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: 10,
              fontWeight: 700,
              padding: '5px 10px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            {player.tier}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onTapScore('all')}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16,
            padding: '14px 16px',
            cursor: 'pointer',
            textAlign: 'left',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: 10,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Journey Rating
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span
              style={{
                fontFamily: FONTS.serif,
                fontSize: 52,
                fontWeight: 700,
                color: 'white',
                lineHeight: 1,
                letterSpacing: '-2px',
              }}
            >
              {displayed}
            </span>
            {player.ratingDelta != null ? (
              <span
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: 14,
                  fontWeight: 700,
                  color:
                    player.ratingDelta > 0
                      ? '#6EE7B7'
                      : player.ratingDelta < 0
                        ? '#FDA4AF'
                        : 'rgba(255,255,255,0.7)',
                }}
              >
                {player.ratingDelta > 0
                  ? '↑'
                  : player.ratingDelta < 0
                    ? '↓'
                    : '→'}{' '}
                {player.ratingDelta > 0 ? '+' : ''}
                {player.ratingDelta.toFixed(1)} this month
              </span>
            ) : (
              <span
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.45)',
                  fontStyle: 'italic',
                }}
              >
                Tracking — check back next month
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: 11,
              color: 'rgba(255,255,255,0.45)',
              marginTop: 8,
            }}
          >
            Tap for breakdown →
          </div>
        </button>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          <ViaAnchor
            prompt="Why did my rating change?"
            context="player-card:rating-delta"
            onDark
          />
          <ViaAnchor
            prompt="How do I get to 60?"
            context="player-card:target-60"
            onDark
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: FONTS.sans,
              fontSize: 11,
              color: 'rgba(255,255,255,0.65)',
              marginBottom: 6,
            }}
          >
            <span>Next: {player.nextTier}</span>
            <span>{player.pointsToNextTier} pts away</span>
          </div>
          <Bar
            value={player.tierProgress}
            color="#6EE7B7"
            trackColor="rgba(255,255,255,0.15)"
            height={5}
          />
        </div>

        {!hideSubScores && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}
        >
          {categories.map((cat, i) => {
            const colors = CATEGORY_COLORS[cat.key]
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => onTapScore(cat.key)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12,
                  padding: '10px 11px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                  opacity: revealed ? 1 : 0,
                  transition: `opacity 0.35s ease ${200 + i * 200}ms`,
                }}
              >
                {cat.isStrength && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      fontFamily: FONTS.sans,
                      fontSize: 8,
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      padding: '2px 5px',
                      borderRadius: 4,
                      background: '#6EE7B7',
                      color: TOKENS.TEAL_DEEP,
                    }}
                  >
                    STRENGTH
                  </span>
                )}
                <div style={{ fontSize: 16, marginBottom: 4 }}>{cat.icon}</div>
                <div
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.55)',
                    marginBottom: 2,
                  }}
                >
                  {cat.shortLabel}
                </div>
                <div
                  style={{
                    fontFamily: FONTS.serif,
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'white',
                    lineHeight: 1,
                  }}
                >
                  {cat.pct}%
                </div>
                <div
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 9,
                    color: colors?.color || '#6EE7B7',
                    marginTop: 4,
                    fontWeight: 600,
                  }}
                >
                  {cat.weight}% weight
                </div>
              </button>
            )
          })}
        </div>
        )}
      </div>
    </div>
  )
}
