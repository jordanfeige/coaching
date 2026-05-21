'use client'

import Link from 'next/link'

type Props = {
  rating: number
  ratingDelta: number | null
  tier: string
  nextTier: string | null
  pointsToNext: number
}

export function JourneyRatingHomeCard({
  rating,
  ratingDelta,
  tier,
  nextTier,
  pointsToNext,
}: Props) {
  if (rating <= 0) return null

  const deltaLabel =
    ratingDelta != null && ratingDelta !== 0
      ? `${ratingDelta > 0 ? '↑' : '↓'} ${ratingDelta > 0 ? '+' : ''}${ratingDelta} this month`
      : null

  const subtitle =
    nextTier && pointsToNext > 0
      ? `${tier} · ${pointsToNext} pts to ${nextTier}`
      : tier

  return (
    <Link
      href="/player/journey"
      style={{
        display: 'block',
        background: 'white',
        borderRadius: 12,
        padding: '14px 16px',
        border: '0.5px solid rgba(0,0,0,0.06)',
        textDecoration: 'none',
        color: 'inherit',
        marginTop: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <h3
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 14,
            fontWeight: 500,
            margin: 0,
          }}
        >
          Journey rating
        </h3>
        <span style={{ fontSize: 11, color: '#0F6E56', fontWeight: 500 }}>
          View breakdown →
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 32,
            fontWeight: 500,
            color: '#111',
            lineHeight: 1,
          }}
        >
          {Math.round(rating)}
        </span>
        {deltaLabel && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: ratingDelta! > 0 ? '#0F6E56' : '#B45309',
            }}
          >
            {deltaLabel}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>{subtitle}</div>
    </Link>
  )
}
