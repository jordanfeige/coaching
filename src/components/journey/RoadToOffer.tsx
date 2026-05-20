'use client'

import type { JourneyMilestone } from '@/lib/journey-types'
import { ViaAnchor } from './ViaAnchor'
import { Bar } from './Bar'
import { TOKENS, FONTS } from './JourneyTokens'

type Props = {
  milestones: JourneyMilestone[]
}

export function RoadToOffer({ milestones }: Props) {
  return (
    <div
      style={{
        background: 'white',
        border: `1px solid ${TOKENS.LINE}`,
        borderRadius: 16,
        padding: '16px',
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
          marginBottom: 14,
        }}
      >
        Road to offer
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {milestones.map((ms, index) => {
          const isLast = index === milestones.length - 1
          const done = ms.status === 'done'
          const active = ms.status === 'active'
          const locked = ms.status === 'locked'

          return (
            <div
              key={ms.label}
              style={{
                display: 'flex',
                gap: 12,
                paddingBottom: isLast ? 0 : 18,
                position: 'relative',
              }}
            >
              {!isLast && (
                <div
                  style={{
                    position: 'absolute',
                    left: 11,
                    top: 26,
                    bottom: 0,
                    width: 2,
                    background: done ? TOKENS.TEAL_TINT : TOKENS.LINE_SOFT,
                  }}
                />
              )}
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  flexShrink: 0,
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FONTS.sans,
                  fontSize: 10,
                  fontWeight: 800,
                  background: done
                    ? TOKENS.TEAL
                    : active
                      ? 'white'
                      : TOKENS.LINE_SOFT,
                  border: `2px solid ${done ? TOKENS.TEAL : active ? TOKENS.TEAL_DARK : TOKENS.LINE}`,
                  color: done ? 'white' : active ? TOKENS.TEAL_DARK : TOKENS.MUTED,
                }}
              >
                {done ? '✓' : index + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONTS.serif,
                      fontSize: 14,
                      fontWeight: 700,
                      color: locked ? TOKENS.MUTED : TOKENS.INK,
                    }}
                  >
                    {ms.label}
                  </span>
                  {active && (
                    <span
                      style={{
                        fontFamily: FONTS.sans,
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: TOKENS.TEAL_TINT,
                        color: TOKENS.TEAL_DARK,
                      }}
                    >
                      You are here
                    </span>
                  )}
                  {done && ms.completedAt && (
                    <span
                      style={{
                        fontFamily: FONTS.sans,
                        fontSize: 10,
                        color: TOKENS.MUTED,
                      }}
                    >
                      {ms.completedAt}
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 12,
                    color: TOKENS.SUB,
                    margin: '0 0 8px',
                    lineHeight: 1.45,
                  }}
                >
                  {ms.detail}
                </p>
                {active && ms.progress != null && (
                  <>
                    <Bar value={ms.progress} color={TOKENS.TEAL} height={5} />
                    {ms.pointsToUnlock != null && (
                      <div
                        style={{
                          fontFamily: FONTS.sans,
                          fontSize: 10,
                          color: TOKENS.MUTED,
                          marginTop: 6,
                        }}
                      >
                        {ms.pointsToUnlock} points to unlock
                      </div>
                    )}
                    {ms.viaPrompts && ms.viaPrompts.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                          marginTop: 10,
                        }}
                      >
                        {ms.viaPrompts.map(p => (
                          <ViaAnchor
                            key={p}
                            prompt={p}
                            context={`milestone:${ms.label}`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
