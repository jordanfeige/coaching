'use client'

import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { brand } from '@/lib/brand'
import type { JourneyCategory, JourneyEvent } from '@/lib/journey-types'
import { ViaAnchor } from './ViaAnchor'
import { Bar } from './Bar'
import { ExposureSignalsList } from './ExposureSignalsList'
import { ExposureMatchHistory } from './ExposureMatchHistory'
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

  const handleClose = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, handleClose])

  if (!open) return null

  const filteredEvents =
    focusedCat != null
      ? breakdown.events.filter(e => e.category === focusedCat.key)
      : breakdown.events

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={focusedCat ? focusedCat.label : 'Score breakdown'}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <button
        type="button"
        aria-label="Close breakdown"
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
          border: 'none',
          cursor: 'pointer',
        }}
      />
      <aside
        className="journey-breakdown-drawer-panel"
        style={{
          position: 'relative',
          width: 'min(65vw, 560px)',
          maxWidth: '100vw',
          height: '100%',
          background: TOKENS.CREAM,
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'journeyBreakdownIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <style>{`
          @keyframes journeyBreakdownIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          @media (max-width: 1023px) {
            .journey-breakdown-drawer-panel {
              width: 100vw !important;
            }
          }
        `}</style>

        <div
          style={{
            flexShrink: 0,
            borderBottom: `1px solid ${TOKENS.LINE}`,
            padding: '20px 22px 16px',
            background: TOKENS.CREAM,
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
                  fontSize: 18,
                  fontWeight: 500,
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
                  lineHeight: 1.5,
                }}
              >
                {focusedCat ? focusedCat.tagline : breakdown.weightsVersion}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: brand.lineSoft,
                borderRadius: 8,
                width: 36,
                height: 36,
                padding: 0,
                cursor: 'pointer',
                flexShrink: 0,
                color: brand.ink,
              }}
            >
              <X size={18} strokeWidth={2} aria-hidden />
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

        <div style={{ overflowY: 'auto', padding: '14px 22px 28px', flex: 1 }}>
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
              {focusedCat.key === 'exposure' &&
              focusedCat.exposureSignals?.length ? (
                <ExposureSignalsList signals={focusedCat.exposureSignals} />
              ) : null}
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

              {focusedCat.key === 'exposure' ? (
                <section style={{ marginTop: 32 }}>
                  <h3
                    style={{
                      fontFamily: FONTS.serif,
                      fontSize: 15,
                      fontWeight: 500,
                      margin: '0 0 14px',
                      color: TOKENS.INK,
                    }}
                  >
                    Match history · last 12 months
                  </h3>
                  <ExposureMatchHistory />
                </section>
              ) : null}

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
      </aside>
    </div>
  )
}
