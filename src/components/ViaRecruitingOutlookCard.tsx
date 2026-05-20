'use client'

import ViaBlob from '@/components/ViaBlob'
import type { RecruitingOutlook } from '@/lib/recruiting-outlook'

const TEAL = '#085041'
const TEAL_MID = '#0F6E56'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'

const IMPACT_COLORS = {
  positive: { bg: '#E1F5EE', text: '#0F6E56', dot: '#1D9E75' },
  neutral: { bg: WARM_BG, text: TEXT_MUTED, dot: TEXT_MUTED },
  negative: { bg: '#FEF2F2', text: '#A32D2D', dot: '#DC2626' },
  watch: { bg: '#FEF9E6', text: '#92400E', dot: '#D97706' },
} as const

const PRIORITY_COLORS = {
  critical: '#DC2626',
  important: '#D97706',
  nice_to_have: TEAL_MID,
} as const

type Props = {
  outlook: RecruitingOutlook
  title?: string
  generatedAt?: string | null
  compact?: boolean
}

export default function ViaRecruitingOutlookCard({
  outlook,
  title = 'Via — recruiting outlook',
  generatedAt,
  compact = false,
}: Props) {
  return (
    <div
      style={{
        background: '#E1F5EE',
        border: '0.5px solid #9FE1CB',
        borderRadius: 14,
        padding: compact ? '12px 14px' : '14px 16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <ViaBlob size={compact ? 20 : 22} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: TEAL,
          }}
        >
          {title}
        </span>
        {outlook.confidence && (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(8,80,65,.12)',
              fontSize: 10,
              color: TEAL_MID,
              fontWeight: 500,
              textTransform: 'capitalize',
            }}
          >
            {outlook.confidence} confidence
          </span>
        )}
        {generatedAt && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              color: TEAL_MID,
            }}
          >
            {generatedAt}
          </span>
        )}
      </div>

      <p
        style={{
          fontSize: compact ? 13 : 14,
          color: '#04342C',
          lineHeight: 1.65,
          margin: '0 0 12px',
          fontWeight: 500,
        }}
      >
        {outlook.snapshot}
      </p>

      {outlook.confidence_note && (
        <p
          style={{
            fontSize: 11,
            color: TEAL_MID,
            lineHeight: 1.5,
            margin: '0 0 12px',
          }}
        >
          {outlook.confidence_note}
        </p>
      )}

      {outlook.factors.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '.07em',
              marginBottom: 8,
            }}
          >
            Key factors
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {outlook.factors.map((factor, i) => {
              const impact = factor.impact || 'neutral'
              const colors =
                IMPACT_COLORS[impact] || IMPACT_COLORS.neutral
              return (
                <div
                  key={`${factor.label}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 9,
                    background: colors.bg,
                    border: `0.5px solid ${BORDER}`,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: colors.dot,
                      flexShrink: 0,
                      marginTop: 5,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: colors.text,
                      }}
                    >
                      {factor.label}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: TEXT,
                        lineHeight: 1.45,
                        marginTop: 2,
                      }}
                    >
                      {factor.value}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {outlook.actions.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '.07em',
              marginBottom: 8,
            }}
          >
            Next actions
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {outlook.actions.map((action, i) => (
              <div
                key={`${action.title}-${i}`}
                style={{
                  padding: '9px 11px',
                  borderRadius: 9,
                  background: 'white',
                  border: `0.5px solid ${BORDER}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  {action.priority && (
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background:
                          PRIORITY_COLORS[action.priority] ||
                          TEAL_MID,
                        flexShrink: 0,
                        marginTop: 5,
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: TEXT,
                        lineHeight: 1.4,
                      }}
                    >
                      {action.title}
                    </div>
                    {action.detail && (
                      <div
                        style={{
                          fontSize: 11,
                          color: TEXT_MUTED,
                          lineHeight: 1.45,
                          marginTop: 3,
                        }}
                      >
                        {action.detail}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
