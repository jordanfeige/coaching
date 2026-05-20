'use client'

import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { playerJourneyMock, type MomentumTrend } from '@/lib/player-journey-mock'

const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <TrendingUp size={12} color="#16A34A" />
  if (trend === 'down') return <TrendingDown size={12} color="#DC2626" />
  return <Minus size={12} color={TEXT_MUTED} />
}

export default function JourneyMomentumStrip() {
  const { momentum } = playerJourneyMock

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          color: TEXT_MUTED,
          marginBottom: 8,
        }}
      >
        Momentum
      </div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 2,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {momentum.map(item => {
          const trend = item.trend as MomentumTrend
          return (
          <div
            key={item.id}
            style={{
              flex: '0 0 auto',
              minWidth: 100,
              background: 'white',
              border: `0.5px solid ${BORDER}`,
              borderRadius: 12,
              padding: '10px 12px',
            }}
          >
            <div style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 4 }}>
              {item.label}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>
                {item.value}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                  fontSize: 10,
                  fontWeight: 600,
                  color:
                    trend === 'up'
                      ? '#16A34A'
                      : trend === 'down'
                        ? '#DC2626'
                        : TEXT_MUTED,
                }}
              >
                <TrendIcon trend={trend} />
                {item.delta}
              </span>
            </div>
          </div>
        )})}
      </div>
    </div>
  )
}
