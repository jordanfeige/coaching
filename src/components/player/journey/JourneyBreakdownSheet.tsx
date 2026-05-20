'use client'

import { useRef } from 'react'
import { X } from 'lucide-react'
import { playerJourneyMock } from '@/lib/player-journey-mock'
import type { BreakdownPillar } from '@/lib/player-journey-mock'

const TEAL = '#2D9B7F'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = '#F5F4F0'

const barColor = {
  good: TEAL,
  improve: '#D97706',
  missing: BORDER,
} as const

type Props = {
  open: boolean
  onClose: () => void
}

export default function JourneyBreakdownSheet({ open, onClose }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)
  const { breakdown, playerCard } = playerJourneyMock

  function onTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY
  }

  function onTouchMove(e: React.TouchEvent) {
    currentY.current = e.touches[0].clientY
    const delta = currentY.current - startY.current
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`
    }
  }

  function onTouchEnd() {
    const delta = currentY.current - startY.current
    if (delta > 80) onClose()
    else if (sheetRef.current) sheetRef.current.style.transform = ''
  }

  if (!open) return null

  return (
    <>
      <button
        type="button"
        aria-label="Close breakdown"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,.35)',
          zIndex: 60,
          border: 'none',
        }}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 70,
          maxHeight: '85vh',
          background: WARM_BG,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          boxShadow: '0 -8px 32px rgba(0,0,0,.12)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.2s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '10px 0 4px',
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: BORDER,
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '8px 18px 12px',
            borderBottom: `0.5px solid ${BORDER}`,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: TEXT,
                margin: 0,
              }}
            >
              {breakdown.headline}
            </h2>
            <p style={{ fontSize: 12, color: TEXT_MUTED, margin: '4px 0 0' }}>
              {breakdown.subhead}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'white',
              border: `0.5px solid ${BORDER}`,
              borderRadius: 8,
              padding: 6,
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: '14px 18px 28px' }}>
          <div
            style={{
              textAlign: 'center',
              marginBottom: 18,
              padding: '14px',
              background: 'white',
              borderRadius: 14,
              border: `0.5px solid ${BORDER}`,
            }}
          >
            <div style={{ fontSize: 40, fontWeight: 700, color: TEAL }}>
              {playerCard.readinessScore}
            </div>
            <div style={{ fontSize: 12, color: TEXT_MUTED }}>Overall readiness</div>
          </div>
          {breakdown.pillars.map((pillar: BreakdownPillar) => (
            <div
              key={pillar.key}
              style={{
                background: 'white',
                border: `0.5px solid ${BORDER}`,
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
                <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>
                  {pillar.label}
                </span>
                <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                  {pillar.weight} · {pillar.score}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: BORDER,
                  marginBottom: 10,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${pillar.score}%`,
                    height: '100%',
                    background: barColor[pillar.status],
                    borderRadius: 3,
                  }}
                />
              </div>
              {pillar.items.map(item => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    fontSize: 12,
                    padding: '4px 0',
                    borderTop: `0.5px solid ${BORDER}`,
                  }}
                >
                  <span style={{ color: TEXT_MUTED }}>{item.label}</span>
                  <span style={{ fontWeight: 600, color: TEXT, textAlign: 'right' }}>
                    {item.value}
                  </span>
                </div>
              ))}
              {pillar.items.some(i => i.note) && (
                <p style={{ fontSize: 11, color: TEXT_MUTED, margin: '8px 0 0' }}>
                  {pillar.items.find(i => i.note)?.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
