'use client'

import Link from 'next/link'
import { ExposureMatchHistory } from '@/components/journey/ExposureMatchHistory'

type Props = {
  score: number
  max: number
  tier: string
}

export function ExposureRecruitingView({ score, max, tier }: Props) {
  return (
    <div>
      <div
        style={{
          background: 'linear-gradient(150deg, #063D31 0%, #0F6E56 70%, #0a4a3c 100%)',
          borderRadius: 14,
          padding: '18px 20px',
          marginBottom: 24,
          color: 'white',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.55)',
            marginBottom: 8,
          }}
        >
          Exposure score
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 48,
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            {score}
          </span>
          <span
            style={{
              fontFamily: 'Helvetica Neue, sans-serif',
              fontSize: 18,
              color: 'rgba(255,255,255,0.65)',
            }}
          >
            / {max}
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              fontWeight: 600,
              padding: '5px 10px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            {tier}
          </span>
        </div>
        <p
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.55)',
            marginTop: 12,
            marginBottom: 0,
            lineHeight: 1.5,
          }}
        >
          Based on match results, tournaments, and verified reels.{' '}
          <Link
            href="/player/journey"
            style={{ color: '#6EE7B7', fontWeight: 500, textDecoration: 'none' }}
          >
            View on Journey →
          </Link>
        </p>
      </div>

      <h2
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 15,
          fontWeight: 500,
          margin: '24px 0 12px',
        }}
      >
        Match history · last 12 months
      </h2>

      <ExposureMatchHistory />
    </div>
  )
}
