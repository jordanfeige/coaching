'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

const STEPS = [
  { key: 'class-year', label: 'Class year' },
  { key: 'utr', label: 'UTR' },
  { key: 'academics', label: 'Academics' },
  { key: 'tournaments', label: 'Tournaments' },
  { key: 'targeting', label: 'Targeting' },
] as const

type StepKey = (typeof STEPS)[number]['key']

type Props = {
  step: StepKey
  title: string
  subtitle?: string
  children: ReactNode
  onContinue?: () => void
  continueDisabled?: boolean
  continueLabel?: string
}

export function WizardShell({
  step,
  title,
  subtitle,
  children,
  onContinue,
  continueDisabled,
  continueLabel = 'Continue →',
}: Props) {
  const stepIndex = STEPS.findIndex(s => s.key === step)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F4F0',
        padding: '20px 16px 60px',
        fontFamily: 'Georgia, serif',
      }}
    >
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Link
            href="/player"
            style={{
              fontFamily: 'Helvetica Neue, sans-serif',
              fontSize: 20,
              fontWeight: 700,
              color: '#111827',
              textDecoration: 'none',
            }}
          >
            Play<span style={{ color: '#2D9B7F', fontStyle: 'italic' }}>via</span>
          </Link>
          <div
            style={{
              fontFamily: 'Helvetica Neue, sans-serif',
              fontSize: 11,
              color: '#6B7280',
              fontWeight: 600,
            }}
          >
            Step {stepIndex + 1} of {STEPS.length}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i <= stepIndex ? '#2D9B7F' : '#E5E7EB',
              }}
            />
          ))}
        </div>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: '#111827',
            margin: '0 0 8px',
            letterSpacing: '-0.4px',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontStyle: 'italic',
              fontSize: 14,
              color: '#6B7280',
              margin: '0 0 20px',
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>
        )}

        {children}

        {onContinue && (
          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onContinue}
              disabled={continueDisabled}
              style={{
                padding: '12px 24px',
                background: continueDisabled ? '#D1D5DB' : '#0F6E56',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontFamily: 'Helvetica Neue, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                cursor: continueDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              {continueLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function SelectCard({
  selected,
  onClick,
  title,
  subtitle,
}: {
  selected: boolean
  onClick: () => void
  title: string
  subtitle?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '14px 16px',
        textAlign: 'left',
        background: 'white',
        border: selected ? '2px solid #2D9B7F' : '1px solid #E5E7EB',
        borderRadius: 12,
        cursor: 'pointer',
        marginBottom: 8,
      }}
    >
      <div
        style={{
          fontFamily: 'Helvetica Neue, sans-serif',
          fontSize: 14,
          fontWeight: 700,
          color: '#111827',
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontFamily: 'Helvetica Neue, sans-serif',
            fontSize: 12,
            color: '#6B7280',
            marginTop: 4,
          }}
        >
          {subtitle}
        </div>
      )}
    </button>
  )
}
