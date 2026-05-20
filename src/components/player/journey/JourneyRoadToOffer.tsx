'use client'

import { Check } from 'lucide-react'
import { playerJourneyMock } from '@/lib/player-journey-mock'
import type { JourneyRoadMilestone } from '@/lib/player-journey-mock'

const TEAL = '#2D9B7F'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'

function dotStyle(status: JourneyRoadMilestone['status']) {
  if (status === 'done') {
    return {
      background: TEAL,
      border: `2px solid ${TEAL}`,
      color: 'white',
    }
  }
  if (status === 'current') {
    return {
      background: 'white',
      border: `2px solid ${TEAL}`,
      color: TEAL,
    }
  }
  return {
    background: 'white',
    border: `2px solid ${BORDER}`,
    color: TEXT_MUTED,
  }
}

export default function JourneyRoadToOffer() {
  const { roadToOffer } = playerJourneyMock

  return (
    <div
      style={{
        background: 'white',
        border: `0.5px solid ${BORDER}`,
        borderRadius: 16,
        padding: '16px 16px 8px',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          color: TEXT_MUTED,
          marginBottom: 12,
        }}
      >
        Road to offer
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {roadToOffer.map((step, index) => {
          const isLast = index === roadToOffer.length - 1
          return (
            <div
              key={step.id}
              style={{
                display: 'flex',
                gap: 12,
                paddingBottom: isLast ? 8 : 16,
                position: 'relative',
              }}
            >
              {!isLast && (
                <div
                  style={{
                    position: 'absolute',
                    left: 11,
                    top: 24,
                    bottom: 0,
                    width: 2,
                    background:
                      step.status === 'done' ? 'rgba(45,155,127,.35)' : BORDER,
                  }}
                />
              )}
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  zIndex: 1,
                  ...dotStyle(step.status),
                }}
              >
                {step.status === 'done' ? (
                  <Check size={12} strokeWidth={3} />
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 700 }}>
                    {index + 1}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: step.status === 'upcoming' ? TEXT_MUTED : TEXT,
                    }}
                  >
                    {step.label}
                  </span>
                  <span style={{ fontSize: 10, color: TEXT_MUTED, flexShrink: 0 }}>
                    {step.timeframe}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: TEXT_MUTED,
                    margin: '2px 0 0',
                    lineHeight: 1.45,
                  }}
                >
                  {step.detail}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
