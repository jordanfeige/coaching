'use client'

import type { JourneyEvent } from '@/lib/journey-types'
import { TOKENS, FONTS } from '@/components/journey/JourneyTokens'

type Props = {
  events: JourneyEvent[]
}

export default function JourneyRecentChanges({ events }: Props) {
  if (events.length === 0) return null

  return (
    <section style={{ marginTop: 28 }}>
      <div
        style={{
          fontFamily: FONTS.sans,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: TOKENS.MUTED,
          marginBottom: 10,
        }}
      >
        Recent changes
      </div>
      <div
        style={{
          background: 'white',
          border: `1px solid ${TOKENS.LINE}`,
          borderRadius: 12,
          padding: '4px 14px',
        }}
      >
        {events.map((ev, i) => (
          <div
            key={`${ev.date}-${ev.label}-${i}`}
            style={{
              display: 'flex',
              gap: 12,
              padding: '10px 0',
              borderBottom:
                i < events.length - 1 ? `1px solid ${TOKENS.LINE_SOFT}` : 'none',
            }}
          >
            <div
              style={{
                fontFamily: FONTS.sans,
                fontSize: 10,
                fontWeight: 600,
                color: TOKENS.MUTED,
                width: 52,
                flexShrink: 0,
              }}
            >
              {ev.date}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: 12,
                  fontWeight: 600,
                  color: TOKENS.INK,
                }}
              >
                {ev.label}
              </div>
              <div
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: 11,
                  color: TOKENS.SUB,
                }}
              >
                {ev.change}
              </div>
            </div>
            <div
              style={{
                fontFamily: FONTS.sans,
                fontSize: 12,
                fontWeight: 700,
                color: TOKENS.TEAL_DARK,
                flexShrink: 0,
              }}
            >
              {ev.delta}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
