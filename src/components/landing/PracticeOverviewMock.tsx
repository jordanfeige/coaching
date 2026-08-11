'use client'

import { landing } from '@/components/landing/tokens'

const SHOT_MIX = [
  { label: 'Forehand', value: 34, pct: 41 },
  { label: 'Backhand', value: 21, pct: 26 },
  { label: 'Volley', value: 9, pct: 11 },
  { label: 'Serve', value: 10, pct: 12 },
  { label: 'Unclassified', value: 8, pct: 10 },
]

const STATS = [
  { label: 'Shots Tracked', value: '82' },
  { label: 'Court Movement', value: '14.2 km' },
  { label: 'Backhands', value: '21' },
  { label: 'Forehands', value: '34' },
]

function CourtMap() {
  return (
    <svg viewBox="0 0 280 160" width="100%" height="100%" aria-hidden>
      <rect x="8" y="8" width="264" height="144" rx="4" fill="#0F1F18" stroke="rgba(255,255,255,0.12)" />
      <rect x="28" y="18" width="224" height="124" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
      <line x1="140" y1="18" x2="140" y2="142" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <line x1="28" y1="80" x2="252" y2="80" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
      <rect x="88" y="48" width="104" height="64" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
      {/* Shot origins — denser in middle third */}
      {[
        [118, 62], [132, 70], [145, 58], [138, 78], [126, 84],
        [150, 90], [122, 96], [142, 66], [134, 88], [148, 74],
        [128, 72], [140, 94], [116, 80],
        [72, 56], [84, 98], [98, 64],
        [188, 60], [202, 92], [176, 70], [210, 78],
        [56, 110], [64, 48], [220, 52], [230, 108],
      ].map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i < 13 ? 3.2 : 2.4}
          fill={i < 13 ? 'rgba(29,158,117,0.85)' : 'rgba(255,255,255,0.35)'}
        />
      ))}
    </svg>
  )
}

/** Example Practice Overview — first-mile product proof for the hero. */
export function PracticeOverviewMock() {
  return (
    <div className="landing-product-shell" aria-label="Example Practice Overview">
      <div className="landing-product-chrome">
        <span className="landing-dot" />
        <span className="landing-dot" />
        <span className="landing-dot" />
        <span
          style={{
            marginLeft: 8,
            fontSize: 11,
            color: 'rgba(255,255,255,0.45)',
            fontWeight: 500,
          }}
        >
          Practice Overview · Example
        </span>
      </div>

      <div style={{ padding: 18 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#fff',
                letterSpacing: '-0.02em',
              }}
            >
              Junior Advanced · Court 1
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
              28 min analyzed of 1h 47m
            </div>
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: landing.tealBright,
              background: 'rgba(29,158,117,0.12)',
              padding: '5px 9px',
              borderRadius: 6,
            }}
          >
            Demo data
          </div>
        </div>

        <div className="landing-product-stats" style={{ marginBottom: 16 }}>
          {STATS.map(stat => (
            <div
              key={stat.label}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10,
                padding: '10px 8px',
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#fff',
                  letterSpacing: '-0.03em',
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="landing-product-split" style={{ marginBottom: 14 }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
                marginBottom: 10,
              }}
            >
              Shot Mix
            </div>
            {SHOT_MIX.map(row => (
              <div key={row.label} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    marginBottom: 3,
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{row.label}</span>
                  <span style={{ color: 'rgba(255,255,255,0.45)' }}>{row.value}</span>
                </div>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${row.pct}%`,
                      height: '100%',
                      background:
                        row.label === 'Unclassified'
                          ? 'rgba(255,255,255,0.28)'
                          : landing.tealBright,
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              padding: 10,
              minHeight: 160,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
                marginBottom: 6,
                paddingLeft: 2,
              }}
            >
              Shot origin
            </div>
            <CourtMap />
          </div>
        </div>

        <div
          style={{
            borderRadius: 12,
            border: '1px solid rgba(29,158,117,0.25)',
            background: 'rgba(29,158,117,0.08)',
            padding: '12px 14px',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: landing.tealBright,
              marginBottom: 6,
            }}
          >
            A pattern worth discussing
          </div>
          <div style={{ fontSize: 14, color: '#fff', lineHeight: 1.45, fontWeight: 500 }}>
            13 of 21 backhands were hit from the middle third.
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              fontWeight: 600,
              color: landing.tealBright,
            }}
          >
            View evidence →
          </div>
        </div>
      </div>
    </div>
  )
}
