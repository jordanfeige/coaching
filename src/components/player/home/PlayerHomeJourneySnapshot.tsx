'use client'

import { useRouter } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import {
  TEAL_DARK,
  TEAL_DEEP,
  TEAL_GHOST,
  sans,
  serif,
} from '@/lib/player-home-tokens'

type Props = {
  rating: number
  ratingDelta: number | null
  tier: string
  nextTier: string | null
  pointsToNext: number
}

export default function PlayerHomeJourneySnapshot({
  rating,
  ratingDelta,
  tier,
  nextTier,
  pointsToNext,
}: Props) {
  const router = useRouter()
  const deltaLabel =
    ratingDelta != null && ratingDelta !== 0
      ? `${ratingDelta > 0 ? '↑' : '↓'} ${ratingDelta > 0 ? '+' : ''}${ratingDelta}`
      : null

  const subtitle =
    nextTier && pointsToNext > 0
      ? `${tier} · ${pointsToNext} pts to ${nextTier}`
      : tier

  return (
    <section style={{ marginTop: 16 }}>
      <div
        style={{
          background: `linear-gradient(135deg, ${TEAL_DEEP} 0%, ${TEAL_DARK} 100%)`,
          borderRadius: 18,
          padding: '22px 26px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 14px 32px -18px rgba(15,110,86,0.5)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -50,
            right: -30,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(125,221,184,0.16) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'inline-block',
                fontFamily: sans,
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: TEAL_GHOST,
                background: 'rgba(125,221,184,0.14)',
                padding: '3px 10px',
                borderRadius: 999,
                marginBottom: 10,
              }}
            >
              Your Journey
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 12,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontFamily: serif,
                  fontSize: 44,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-1.5px',
                }}
              >
                {rating > 0 ? rating.toFixed(2) : '—'}
              </span>
              {deltaLabel && (
                <span
                  style={{
                    fontFamily: sans,
                    fontSize: 12,
                    fontWeight: 700,
                    color: TEAL_GHOST,
                    padding: '2px 8px',
                    borderRadius: 5,
                    background: 'rgba(125,221,184,0.16)',
                  }}
                >
                  {deltaLabel}
                </span>
              )}
            </div>

            <div
              style={{
                fontFamily: sans,
                fontSize: 12,
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              {subtitle}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => router.push('/player/recruiting')}
              style={{
                padding: '11px 18px',
                background: 'white',
                color: TEAL_DARK,
                border: 'none',
                borderRadius: 12,
                fontFamily: sans,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              }}
            >
              View recruiting
              <ArrowUpRight size={14} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              onClick={() => router.push('/player/journey')}
              style={{
                padding: '8px 14px',
                background: 'rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.9)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 12,
                fontFamily: sans,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Journey rating →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
