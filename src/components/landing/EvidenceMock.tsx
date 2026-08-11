'use client'

import { useState } from 'react'
import { landing } from '@/components/landing/tokens'

const FLOW = [
  { label: '82 shots tracked', tone: 'neutral' as const },
  { label: '74 classified', tone: 'good' as const },
  { label: '8 unclassified', tone: 'muted' as const },
  { label: 'Tap “Backhand”', tone: 'accent' as const },
]

/**
 * Evidence interaction mock — inspectable metrics with coach correction.
 */
export function EvidenceMock() {
  const [correctionOpen, setCorrectionOpen] = useState(false)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.1fr',
        gap: 20,
        alignItems: 'stretch',
      }}
      className="landing-two-col"
    >
      <div
        style={{
          background: landing.surface,
          border: `1px solid ${landing.border}`,
          borderRadius: 14,
          padding: 20,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: landing.muted,
            marginBottom: 16,
          }}
        >
          From number to clip
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {FLOW.map((step, i) => (
            <div key={step.label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background:
                      step.tone === 'good'
                        ? landing.tealBright
                        : step.tone === 'accent'
                          ? landing.teal
                          : step.tone === 'muted'
                            ? landing.border
                            : landing.ink,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: step.tone === 'accent' ? 600 : 500,
                    color: landing.ink,
                  }}
                >
                  {step.label}
                </span>
              </div>
              {i < FLOW.length - 1 && (
                <div
                  style={{
                    width: 1,
                    height: 18,
                    background: landing.border,
                    marginLeft: 4.5,
                    marginTop: 4,
                    marginBottom: 4,
                  }}
                />
              )}
            </div>
          ))}
        </div>
        <p
          style={{
            marginTop: 20,
            fontSize: 13,
            color: landing.sub,
            lineHeight: 1.55,
          }}
        >
          Video evidence
        </p>
      </div>

      <div
        style={{
          background: '#0B1411',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            aspectRatio: '16 / 10',
            background:
              'linear-gradient(160deg, #163028 0%, #0B1411 55%, #1a2e24 100%)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '12px solid rgba(255,255,255,0.85)',
                borderTop: '8px solid transparent',
                borderBottom: '8px solid transparent',
                marginLeft: 3,
              }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              left: 12,
              bottom: 12,
              right: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
                background: 'rgba(0,0,0,0.45)',
                padding: '5px 9px',
                borderRadius: 6,
              }}
            >
              Backhand · middle-mid · 14:32
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              Clip 14 of 21
            </span>
          </div>
        </div>

        <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            type="button"
            onClick={() => setCorrectionOpen(o => !o)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: 13,
              fontWeight: 600,
              color: landing.tealBright,
              cursor: 'pointer',
            }}
          >
            Not right?
          </button>
          {correctionOpen && (
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {['Wrong player', 'Not a backhand', 'Not a shot'].map(opt => (
                <span
                  key={opt}
                  style={{
                    fontSize: 12,
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.75)',
                    background: 'rgba(255,255,255,0.04)',
                  }}
                >
                  {opt}
                </span>
              ))}
            </div>
          )}
          <p
            style={{
              margin: '12px 0 0',
              fontSize: 13,
              color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.5,
            }}
          >
            Playvia assists. The coach remains the authority.
          </p>
        </div>
      </div>
    </div>
  )
}
