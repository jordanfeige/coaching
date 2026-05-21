'use client'

import {
  INK,
  LINE,
  LINE_SOFT,
  SUB,
  TEAL_DARK,
  WARM,
  MUTED,
  sans,
  serif,
} from '@/lib/player-home-tokens'

export type HomeStat = {
  label: string
  value: string
  delta: string | null
  positive: boolean | null
  source: string
}

type Props = {
  stats: HomeStat[]
}

export default function PlayerHomeQuickStats({ stats }: Props) {
  if (stats.length === 0) return null

  return (
    <section
      className="player-home-stats"
      style={{
        marginTop: 16,
        background: 'white',
        border: `1px solid ${LINE}`,
        borderRadius: 16,
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)`,
      }}
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          style={{
            padding: '14px 16px',
            borderRight:
              i < stats.length - 1 ? `1px solid ${LINE_SOFT}` : 'none',
          }}
        >
          <div
            style={{
              fontFamily: sans,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: SUB,
              marginBottom: 6,
            }}
          >
            {s.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span
              style={{
                fontFamily: serif,
                fontSize: 22,
                fontWeight: 700,
                color: INK,
                letterSpacing: '-0.5px',
                lineHeight: 1,
              }}
            >
              {s.value}
            </span>
            {s.delta && (
              <span
                style={{
                  fontFamily: sans,
                  fontSize: 11,
                  fontWeight: 700,
                  color: s.positive ? TEAL_DARK : WARM,
                }}
              >
                {s.delta}
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 10.5,
              color: MUTED,
              marginTop: 4,
              letterSpacing: '0.02em',
            }}
          >
            {s.source}
          </div>
        </div>
      ))}
    </section>
  )
}
