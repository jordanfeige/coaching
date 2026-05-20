'use client'

import { TOKENS, FONTS } from './JourneyTokens'
import type { Difficulty } from '@/lib/journey-types'

type Props = {
  level: Difficulty
}

export function DifficultyMeter({ level }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3].map(n => (
        <span
          key={n}
          style={{
            fontSize: 12,
            lineHeight: 1,
            opacity: n <= level ? 1 : 0.25,
            filter: n <= level ? 'none' : 'grayscale(1)',
          }}
          aria-hidden
        >
          ⚡
        </span>
      ))}
      <span
        style={{
          fontFamily: FONTS.sans,
          fontSize: 10,
          color: TOKENS.MUTED,
          marginLeft: 4,
          fontWeight: 600,
        }}
      >
        Lvl {level}
      </span>
    </div>
  )
}
