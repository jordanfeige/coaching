import { landing } from '@/components/landing/tokens'

export function HonestAiPanel() {
  const cells = [
    { value: '82', label: 'Shots tracked', emphasize: false },
    { value: '74', label: 'Classified', emphasize: true },
    { value: '8', label: 'Unclassified', emphasize: false },
  ]

  return (
    <div>
      <div
        className="landing-honest-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {cells.map(cell => (
          <div
            key={cell.label}
            style={{
              background: cell.emphasize ? landing.tealTint : landing.surface,
              border: `1px solid ${cell.emphasize ? 'rgba(15,110,86,0.2)' : landing.border}`,
              borderRadius: 14,
              padding: '28px 20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: landing.fontSerif,
                fontSize: cell.value.length > 2 ? 48 : 56,
                letterSpacing: '-0.04em',
                color: cell.emphasize ? landing.teal : landing.ink,
                lineHeight: 1,
              }}
            >
              {cell.value}
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                fontWeight: 500,
                color: landing.sub,
              }}
            >
              {cell.label}
            </div>
          </div>
        ))}
      </div>
      <p
        style={{
          fontFamily: landing.fontSerif,
          fontSize: 22,
          lineHeight: 1.35,
          color: landing.ink,
          margin: '0 0 10px',
          letterSpacing: '-0.02em',
          maxWidth: 640,
        }}
      >
        We&apos;d rather show you 74 reliable shots than pretend we know all 82.
      </p>
      <p style={{ fontSize: 14, color: landing.muted, margin: 0 }}>
        Confidence is part of the product.
      </p>
    </div>
  )
}
