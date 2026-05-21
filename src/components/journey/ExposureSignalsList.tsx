'use client'

import { Check } from 'lucide-react'
import type { JourneyExposureSignal } from '@/lib/journey-types'
import { FONTS, TOKENS } from '@/components/journey/JourneyTokens'

type Props = {
  signals: JourneyExposureSignal[]
  /** Compact grid for Exposure sub-score card */
  compact?: boolean
}

function VerifiedBadge({ verified, sourceLabel }: { verified: boolean; sourceLabel: string }) {
  if (verified) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          fontFamily: FONTS.sans,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: TOKENS.TEAL_DARK,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: 'rgba(45,155,127,0.15)',
          }}
        >
          <Check size={9} strokeWidth={3} color={TOKENS.TEAL_DARK} />
        </span>
        verified
      </span>
    )
  }

  return (
    <span
      style={{
        fontFamily: FONTS.sans,
        fontSize: 9,
        fontWeight: 600,
        color: TOKENS.MUTED,
      }}
    >
      {sourceLabel}
    </span>
  )
}

export function ExposureSignalsList({ signals, compact = false }: Props) {
  if (!signals.length) return null

  if (compact) {
    return (
      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: `1px solid ${TOKENS.LINE}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontFamily: FONTS.sans,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: TOKENS.MUTED,
            }}
          >
            Schedule · 12 mo
          </span>
          <VerifiedBadge verified sourceLabel="UTR API" />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px 10px',
          }}
        >
          {signals.map(sig => (
            <div key={sig.key}>
              <div
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: 10,
                  color: TOKENS.MUTED,
                  lineHeight: 1.3,
                }}
              >
                {sig.label}
              </div>
              <div
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: 13,
                  fontWeight: 700,
                  color: TOKENS.INK,
                  lineHeight: 1.2,
                }}
              >
                {sig.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 16 }}>
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
        Schedule strength · last 12 months
      </div>
      {signals.map(sig => (
        <div
          key={sig.key}
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
              alignItems: 'flex-start',
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
              {sig.label}
            </span>
            <span
              style={{
                fontFamily: FONTS.sans,
                fontSize: 14,
                fontWeight: 700,
                color: TOKENS.INK,
              }}
            >
              {sig.value}
            </span>
          </div>
          <div style={{ marginTop: 4 }}>
            <VerifiedBadge verified={sig.verified} sourceLabel={sig.sourceLabel} />
          </div>
        </div>
      ))}
    </div>
  )
}
