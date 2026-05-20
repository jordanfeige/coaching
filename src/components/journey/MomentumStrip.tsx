'use client'

import { TOKENS, FONTS } from './JourneyTokens'

type Momentum = {
  fastestMover: { name: string; delta: string; window: string }
  utrPercentile: number
  statement: string
}

type Props = {
  momentum: Momentum
  classYear: string
}

export function MomentumStrip({ momentum, classYear }: Props) {
  return (
    <div
      style={{
        background: TOKENS.PAPER,
        border: `1px solid ${TOKENS.LINE}`,
        borderRadius: 16,
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          fontFamily: FONTS.sans,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: TOKENS.MUTED,
          marginBottom: 10,
        }}
      >
        Momentum · {classYear}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 2,
        }}
      >
        <div
          style={{
            flex: '0 0 auto',
            minWidth: 130,
            background: TOKENS.TEAL_TINT,
            border: `1px solid rgba(45,155,127,0.25)`,
            borderRadius: 12,
            padding: '10px 12px',
          }}
        >
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: 10,
              color: TOKENS.TEAL_DARK,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Fastest mover ({momentum.fastestMover.window})
          </div>
          <div
            style={{
              fontFamily: FONTS.serif,
              fontSize: 18,
              fontWeight: 700,
              color: TOKENS.TEAL_DARK,
            }}
          >
            {momentum.fastestMover.name}{' '}
            <span style={{ color: TOKENS.TEAL }}>{momentum.fastestMover.delta}</span>
          </div>
        </div>
        <div
          style={{
            flex: '0 0 auto',
            minWidth: 100,
            background: 'white',
            border: `1px solid ${TOKENS.LINE}`,
            borderRadius: 12,
            padding: '10px 12px',
          }}
        >
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: 10,
              color: TOKENS.MUTED,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            UTR percentile
          </div>
          <div
            style={{
              fontFamily: FONTS.serif,
              fontSize: 18,
              fontWeight: 700,
              color: TOKENS.INK,
            }}
          >
            Top {momentum.utrPercentile}%
          </div>
        </div>
      </div>
      <p
        style={{
          fontFamily: FONTS.sans,
          fontSize: 12,
          color: TOKENS.SUB,
          margin: '12px 0 0',
          lineHeight: 1.5,
        }}
      >
        {momentum.statement}
      </p>
    </div>
  )
}
