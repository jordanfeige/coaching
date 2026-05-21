'use client'

import { brand, fonts } from '@/lib/brand'

type Props = {
  playerGpa: number | null
  playerSat: number | null
  schoolSat25: number | null
  schoolSat75: number | null
}

function satStatus(
  sat: number | null,
  lo: number | null,
  hi: number | null,
): { label: string; pct: number } {
  if (sat == null || lo == null || hi == null) {
    return { label: '—', pct: 0 }
  }
  if (sat >= hi) return { label: 'Above range', pct: 92 }
  if (sat >= lo) return { label: 'In range', pct: 72 }
  return { label: 'Below range', pct: 28 }
}

function gpaStatus(gpa: number | null): { label: string; pct: number } {
  if (gpa == null) return { label: '—', pct: 0 }
  if (gpa >= 3.8) return { label: 'Above range', pct: 90 }
  if (gpa >= 3.2) return { label: 'In range', pct: 68 }
  return { label: 'Below range', pct: 32 }
}

function MetricBar({
  label,
  valueLabel,
  status,
  pct,
}: {
  label: string
  valueLabel: string
  status: string
  pct: number
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: fonts.sans,
          fontSize: 11,
          marginBottom: 6,
        }}
      >
        <span style={{ fontWeight: 700, color: brand.ink }}>{label}</span>
        <span style={{ color: brand.sub }}>{status}</span>
      </div>
      <div style={{ fontFamily: fonts.sans, fontSize: 12, color: brand.sub, marginBottom: 6 }}>
        {valueLabel}
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: brand.lineSoft,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: brand.tealHex,
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  )
}

export default function AcademicFitPanel({
  playerGpa,
  playerSat,
  schoolSat25,
  schoolSat75,
}: Props) {
  const hasAcademics = playerGpa != null || playerSat != null
  const sat = satStatus(playerSat, schoolSat25, schoolSat75)
  const gpa = gpaStatus(playerGpa)

  const combined =
    !hasAcademics
      ? '—'
      : sat.label === 'Above range' || gpa.label === 'Above range'
        ? 'Above range'
        : sat.label === 'Below range' || gpa.label === 'Below range'
          ? 'Below range'
          : 'In range'

  return (
    <div
      style={{
        background: brand.paper,
        border: `1px solid ${brand.line}`,
        borderRadius: 14,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        height: 'fit-content',
      }}
    >
      <div>
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: brand.muted,
          }}
        >
          Academic fit
        </div>
        <div
          style={{
            fontFamily: fonts.serif,
            fontSize: 18,
            fontWeight: 700,
            color: brand.ink,
            marginTop: 4,
          }}
        >
          {combined}
        </div>
      </div>

      {!hasAcademics ? (
        <p style={{ fontFamily: fonts.sans, fontSize: 12, color: brand.sub, margin: 0 }}>
          Add your academics in your profile to see fit.
        </p>
      ) : (
        <>
          <MetricBar
            label="SAT"
            valueLabel={
              playerSat != null
                ? `You: ${playerSat}${
                    schoolSat25 != null && schoolSat75 != null
                      ? ` · Range ${schoolSat25}–${schoolSat75}`
                      : ''
                  }`
                : 'SAT not set'
            }
            status={sat.label}
            pct={sat.pct}
          />
          <MetricBar
            label="GPA"
            valueLabel={
              playerGpa != null ? `You: ${playerGpa.toFixed(2)} · Scale 0.0–4.0` : 'GPA not set'
            }
            status={gpa.label}
            pct={gpa.pct}
          />
        </>
      )}

      <p
        style={{
          fontFamily: fonts.sans,
          fontSize: 10,
          color: brand.muted,
          lineHeight: 1.45,
          margin: 0,
        }}
      >
        Combined fit factors into the school&apos;s overall match score in your
        College Matches.
      </p>
    </div>
  )
}
