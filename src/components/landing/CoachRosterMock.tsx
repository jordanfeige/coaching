import { landing } from '@/components/landing/tokens'

const PLAYERS = [
  {
    name: 'Olivia',
    shots: '82 shots',
    move: '14.2 km',
    note: '62% of backhands from middle third',
  },
  {
    name: 'Marcus',
    shots: '71 shots',
    move: '11.8 km',
    note: 'Serve volume up vs last practice',
  },
  {
    name: 'Noah',
    shots: '64 shots',
    move: '9.4 km',
    note: 'More time in the back third',
  },
]

export function CoachRosterMock() {
  return (
    <div>
      <div
        className="landing-coach-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {PLAYERS.map(p => (
          <div
            key={p.name}
            style={{
              background: landing.surface,
              border: `1px solid ${landing.border}`,
              borderRadius: 14,
              padding: 16,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: landing.tealTint,
                color: landing.teal,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
                marginBottom: 12,
              }}
            >
              {p.name[0]}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: landing.ink }}>
              {p.name}
            </div>
            <div style={{ fontSize: 12, color: landing.muted, marginTop: 4 }}>
              {p.shots} · {p.move}
            </div>
            <p
              style={{
                margin: '10px 0 0',
                fontSize: 13,
                lineHeight: 1.45,
                color: landing.sub,
              }}
            >
              {p.note}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          flexWrap: 'wrap',
          padding: '14px 16px',
          borderRadius: 12,
          background: landing.surface,
          border: `1px solid ${landing.border}`,
        }}
      >
        {['Practice', 'Match', 'Practice', 'Match'].map((label, i) => (
          <div key={`${label}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 8,
                background: i % 2 === 0 ? landing.tealTint : landing.borderSoft,
                color: i % 2 === 0 ? landing.teal : landing.sub,
              }}
            >
              {label}
            </span>
            {i < 3 && (
              <span style={{ color: landing.muted, fontSize: 14 }}>→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
