'use client'

import { useEffect } from 'react'
import type { JourneyCategory, JourneyEvent } from '@/lib/journey-types'
import { ViaAnchor } from './ViaAnchor'
import { Bar } from './Bar'
import { TOKENS, FONTS, CATEGORY_COLORS } from './JourneyTokens'

type BreakdownData = {
  total: number
  categories: JourneyCategory[]
  events: JourneyEvent[]
  weightsVersion: string
}

type Props = {
  open: boolean
  focus: string | null
  breakdown: BreakdownData
  onClose: () => void
}

export function BreakdownSheet({ open, focus, breakdown, onClose }: Props) {
  const isAll = focus === 'all' || focus === null
  const focusedCat = !isAll
    ? breakdown.categories.find(c => c.key === focus)
    : null

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  const filteredEvents =
    focusedCat != null
      ? breakdown.events.filter(e => e.category === focusedCat.key)
      : breakdown.events

  return (
    <>
      <button
        type="button"
        aria-label="Close breakdown"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(17,24,39,0.45)',
          zIndex: 80,
          border: 'none',
          cursor: 'pointer',
        }}
      />
      <div
        role="dialog"
        aria-modal
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 0,
          width: '100%',
          maxWidth: 540,
          maxHeight: '92vh',
          zIndex: 90,
          background: TOKENS.CREAM,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          boxShadow: '0 -12px 48px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'journeySheetUp 0.28s ease',
        }}
      >
        <style>{`
          @keyframes journeySheetUp {
            from { transform: translateX(-50%) translateY(100%); }
            to { transform: translateX(-50%) translateY(0); }
          }
        `}</style>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '10px 0 6px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: TOKENS.LINE,
            }}
          />
        </div>

        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            background: TOKENS.CREAM,
            borderBottom: `1px solid ${TOKENS.LINE}`,
            padding: '8px 18px 14px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: FONTS.serif,
                  fontSize: 20,
                  fontWeight: 700,
                  color: TOKENS.INK,
                  margin: 0,
                }}
              >
                {focusedCat ? focusedCat.label : 'Score breakdown'}
              </h2>
              <p
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: 12,
                  color: TOKENS.SUB,
                  margin: '4px 0 0',
                }}
              >
                {focusedCat ? focusedCat.tagline : breakdown.weightsVersion}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'white',
                border: `1px solid ${TOKENS.LINE}`,
                borderRadius: 8,
                padding: '6px 10px',
                fontFamily: FONTS.sans,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                color: TOKENS.SUB,
              }}
            >
              Close
            </button>
          </div>
          {!focusedCat && (
            <div
              style={{
                textAlign: 'center',
                marginTop: 14,
                padding: '12px',
                background: 'white',
                borderRadius: 14,
                border: `1px solid ${TOKENS.LINE}`,
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.serif,
                  fontSize: 44,
                  fontWeight: 700,
                  color: TOKENS.TEAL_DARK,
                  lineHeight: 1,
                }}
              >
                {breakdown.total}
              </div>
              <div
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: 11,
                  color: TOKENS.MUTED,
                  marginTop: 4,
                }}
              >
                Journey Rating (sum of weighted categories)
              </div>
            </div>
          )}
        </div>

        <div style={{ overflowY: 'auto', padding: '14px 18px 28px', flex: 1 }}>
          {focusedCat ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <span style={{ fontSize: 28 }}>{focusedCat.icon}</span>
                <span
                  style={{
                    fontFamily: FONTS.serif,
                    fontSize: 36,
                    fontWeight: 700,
                    color: CATEGORY_COLORS[focusedCat.key]?.color || TOKENS.INK,
                  }}
                >
                  {focusedCat.pct}%
                </span>
                <span
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 13,
                    color: TOKENS.SUB,
                  }}
                >
                  · {focusedCat.score} / {focusedCat.weight} pts
                </span>
              </div>
              <Bar
                value={focusedCat.pct / 100}
                color={CATEGORY_COLORS[focusedCat.key]?.color}
              />
              <p
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: 12,
                  color: TOKENS.SUB,
                  margin: '12px 0 16px',
                  lineHeight: 1.5,
                }}
              >
                {focusedCat.gap}
              </p>
              <div
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: TOKENS.MUTED,
                  marginBottom: 8,
                }}
              >
                Inputs
              </div>
              {focusedCat.inputs.map(inp => (
                <div
                  key={inp.name}
                  style={{
                    background: 'white',
                    border: `1px solid ${TOKENS.LINE}`,
                    borderRadius: 10,
                    padding: '10px 12px',
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONTS.sans,
                        fontSize: 12,
                        fontWeight: 600,
                        color: TOKENS.INK,
                      }}
                    >
                      {inp.name}
                    </span>
                    <span
                      style={{
                        fontFamily: FONTS.sans,
                        fontSize: 12,
                        fontWeight: 700,
                        color: TOKENS.INK,
                      }}
                    >
                      {inp.value}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: 4,
                      fontFamily: FONTS.sans,
                      fontSize: 10,
                      color: TOKENS.MUTED,
                    }}
                  >
                    <span>
                      {inp.source}
                      {inp.verified ? ' · ✓ verified' : ' · unverified'}
                    </span>
                    <span>{inp.date}</span>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {focusedCat.viaPrompts.map(p => (
                  <ViaAnchor
                    key={p}
                    prompt={p}
                    context={`category:${focusedCat.key}`}
                    color={CATEGORY_COLORS[focusedCat.key]?.color}
                  />
                ))}
              </div>
            </>
          ) : (
            breakdown.categories.map(cat => {
              const colors = CATEGORY_COLORS[cat.key]
              return (
                <div
                  key={cat.key}
                  style={{
                    background: 'white',
                    border: `1px solid ${TOKENS.LINE}`,
                    borderRadius: 12,
                    padding: '12px 14px',
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONTS.sans,
                        fontSize: 13,
                        fontWeight: 700,
                        color: TOKENS.INK,
                      }}
                    >
                      {cat.icon} {cat.label}
                    </span>
                    <span
                      style={{
                        fontFamily: FONTS.sans,
                        fontSize: 12,
                        color: TOKENS.SUB,
                      }}
                    >
                      {cat.weight}% · {cat.score} pts
                    </span>
                  </div>
                  <Bar value={cat.pct / 100} color={colors?.color} />
                  <div
                    style={{
                      fontFamily: FONTS.sans,
                      fontSize: 11,
                      color: TOKENS.MUTED,
                      marginTop: 6,
                    }}
                  >
                    {cat.pct}% · {cat.gap}
                  </div>
                </div>
              )
            })
          )}

          {filteredEvents.length > 0 && (
            <>
              <div
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: TOKENS.MUTED,
                  margin: '18px 0 10px',
                }}
              >
                Recent changes
              </div>
              {filteredEvents.map((ev, i) => (
                <div
                  key={`${ev.date}-${i}`}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom:
                      i < filteredEvents.length - 1
                        ? `1px solid ${TOKENS.LINE_SOFT}`
                        : 'none',
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
            </>
          )}
        </div>
      </div>
    </>
  )
}
