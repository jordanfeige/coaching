import { landing } from '@/components/landing/tokens'

export function ObservationPanel() {
  return (
    <div
      style={{
        background: landing.surface,
        border: `1px solid ${landing.border}`,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '22px 24px',
          background: landing.tealTint,
          borderBottom: `1px solid rgba(15,110,86,0.12)`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: landing.teal,
            marginBottom: 8,
          }}
        >
          A pattern worth discussing
        </div>
        <p
          style={{
            fontFamily: landing.fontSerif,
            fontSize: 22,
            lineHeight: 1.35,
            margin: '0 0 8px',
            color: landing.ink,
            letterSpacing: '-0.02em',
          }}
        >
          13 of 21 backhands (62%) were hit from the middle third.
        </p>
        <p style={{ fontSize: 15, color: landing.sub, margin: 0 }}>
          Forehands: 12 of 34 (35%).
        </p>
      </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 0,
          }}
          className="landing-two-col"
        >
          <div style={{ padding: '20px 24px' }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: landing.muted,
                marginBottom: 10,
              }}
            >
              What Playvia measured
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.65, color: landing.sub, margin: 0 }}>
              An observable concentration of backhand origins in the middle third of
              the court during this practice segment — relative to forehand origins
              in the same window.
            </p>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: landing.muted,
                marginBottom: 10,
              }}
            >
              What Playvia did not determine
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.65, color: landing.sub, margin: 0 }}>
              Whether those were good or bad decisions.
            </p>
            <p
              style={{
                marginTop: 14,
                fontSize: 14,
                fontWeight: 600,
                color: landing.ink,
              }}
            >
              That&apos;s the coach&apos;s call.
            </p>
          </div>
        </div>
    </div>
  )
}
