'use client'

import { Info } from 'lucide-react'
import { playerJourneyMock } from '@/lib/player-journey-mock'
import { fonts } from '@/lib/brand'

const TEAL = '#2D9B7F'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'

const confidenceColor = {
  high: '#16A34A',
  medium: '#D97706',
  low: '#DC2626',
} as const

type Props = {
  onOpenBreakdown: () => void
}

export default function JourneyPlayerCard({ onOpenBreakdown }: Props) {
  const { playerCard, player } = playerJourneyMock
  const confColor = confidenceColor[playerCard.confidence]

  return (
    <div
      style={{
        background: 'white',
        border: `0.5px solid ${BORDER}`,
        borderRadius: 16,
        padding: '18px 18px 16px',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: TEXT_MUTED,
              marginBottom: 4,
            }}
          >
            {playerCard.readinessLabel}
          </div>
          <h1
            style={{
              fontFamily: fonts.serif,
              fontSize: 22,
              fontWeight: 400,
              color: TEXT,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {player.fullName}
          </h1>
          <p style={{ fontSize: 12, color: TEXT_MUTED, margin: '4px 0 0' }}>
            Class of {player.gradYear} · {player.target}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenBreakdown}
          aria-label="View score breakdown"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <span
            style={{
              fontSize: 36,
              fontWeight: 600,
              color: TEAL,
              lineHeight: 1,
              fontFamily: fonts.sans,
            }}
          >
            {playerCard.readinessScore}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 10,
              color: TEXT_MUTED,
              fontWeight: 600,
            }}
          >
            Breakdown
            <Info size={12} />
          </span>
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'rgba(45,155,127,.12)',
            color: '#085041',
          }}
        >
          {playerCard.tier}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'rgba(255,255,255,.8)',
            border: `0.5px solid ${BORDER}`,
            color: confColor,
          }}
        >
          {playerCard.confidence} confidence
        </span>
      </div>

      <p
        style={{
          fontSize: 13,
          color: TEXT,
          lineHeight: 1.55,
          margin: '0 0 14px',
        }}
      >
        {playerCard.summary}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}
      >
        {[
          { label: 'UTR', value: playerCard.utr.toFixed(2) },
          { label: 'Technique', value: String(playerCard.techniqueScore) },
          { label: 'GPA', value: playerCard.gpa.toFixed(1) },
        ].map(stat => (
          <div
            key={stat.label}
            style={{
              background: '#F5F4F0',
              borderRadius: 10,
              padding: '10px 8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 2 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
