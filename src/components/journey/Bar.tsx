'use client'

import { TOKENS } from './JourneyTokens'

type Props = {
  value: number
  color?: string
  trackColor?: string
  height?: number
}

export function Bar({
  value,
  color = TOKENS.TEAL,
  trackColor = TOKENS.LINE_SOFT,
  height = 6,
}: Props) {
  const pct = Math.min(100, Math.max(0, value * 100))

  return (
    <div
      style={{
        height,
        borderRadius: height,
        background: trackColor,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: height,
          background: color,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  )
}
