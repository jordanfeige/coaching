'use client'

import type { TendencyBarRow } from '@/lib/film-room/tendency-display'

function tinyLabel(text: string) {
  return (
    <p
      style={{
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--color-text-secondary, #6B7280)',
        margin: '0 0 12px',
      }}
    >
      {text}
    </p>
  )
}

export function TendencyBars({
  sectionTitle,
  rows,
}: {
  sectionTitle: string
  rows: TendencyBarRow[]
}) {
  if (rows.length === 0) return null

  return (
    <section style={{ marginBottom: 24 }}>
      {tinyLabel(sectionTitle)}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map(row => (
          <div key={row.key}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--color-text-primary, #111827)' }}>
                {row.label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: row.color,
                }}
              >
                {row.value}
              </span>
            </div>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: 'var(--color-background-secondary, #F3F4F6)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(0, row.strength))}%`,
                  background: row.color,
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
