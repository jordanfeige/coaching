'use client'

import ViaBlob from '@/components/ViaBlob'
import type { ViaSuggestedSchool } from '@/lib/recruiting-outlook'

const SCHOOL_COLORS = {
  reach: {
    bg: '#EEEDFE',
    border: '#AFA9EC',
    dot: '#534AB7',
    text: '#26215C',
    sub: '#534AB7',
  },
  target: {
    bg: '#E1F5EE',
    border: '#9FE1CB',
    dot: '#0F6E56',
    text: '#04342C',
    sub: '#0F6E56',
  },
  likely: {
    bg: '#E6F1FB',
    border: '#85B7EB',
    dot: '#185FA5',
    text: '#042C53',
    sub: '#185FA5',
  },
} as const

type Props = {
  schools: ViaSuggestedSchool[]
  onVerify?: (school: ViaSuggestedSchool) => void
  onDismiss?: (school: ViaSuggestedSchool) => void
  verifying?: string | null
  readOnly?: boolean
}

export default function ViaSchoolSuggestionsCard({
  schools,
  onVerify,
  onDismiss,
  verifying,
  readOnly = false,
}: Props) {
  if (schools.length === 0) return null

  return (
    <div
      style={{
        background: 'white',
        border: '0.5px solid hsl(30,10%,88%)',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 10,
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
        <ViaBlob size={18} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#085041',
          }}
        >
          Via school suggestions
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 10,
            color: '#0F6E56',
            fontStyle: 'italic',
          }}
        >
          Via suggested — coach verify
        </span>
      </div>

      {schools.map((school, i) => {
        const c = SCHOOL_COLORS[school.type] || SCHOOL_COLORS.target
        const key = `${school.school}-${i}`
        const busy = verifying === school.school
        return (
          <div
            key={key}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: c.bg,
              border: `0.5px dashed ${c.border}`,
              marginBottom: i < schools.length - 1 ? 8 : 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                marginBottom: school.why ? 6 : 0,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: c.dot,
                  flexShrink: 0,
                  marginTop: 5,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: c.text,
                  }}
                >
                  {school.school}
                </div>
                <div style={{ fontSize: 11, color: c.sub, marginTop: 2 }}>
                  {school.division}
                  {school.location ? ` · ${school.location}` : ''}
                  {' · '}
                  {school.type.charAt(0).toUpperCase() +
                    school.type.slice(1)}
                </div>
              </div>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(8,80,65,.1)',
                  border: '0.5px solid rgba(8,80,65,.2)',
                  fontSize: 9,
                  color: '#085041',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                Via suggested
              </span>
            </div>
            {school.why && (
              <p
                style={{
                  fontSize: 11,
                  color: c.sub,
                  lineHeight: 1.45,
                  margin: '0 0 8px 14px',
                }}
              >
                {school.why}
              </p>
            )}
            {!readOnly && (onVerify || onDismiss) && (
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  marginLeft: 14,
                }}
              >
                {onVerify && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onVerify(school)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 8,
                      background: busy ? '#ccc' : '#085041',
                      border: 'none',
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: busy ? 'default' : 'pointer',
                    }}
                  >
                    {busy ? 'Adding...' : 'Add to targets'}
                  </button>
                )}
                {onDismiss && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDismiss(school)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 8,
                      background: 'white',
                      border: '0.5px solid hsl(30,10%,88%)',
                      color: 'hsl(220,10%,45%)',
                      fontSize: 11,
                      cursor: busy ? 'default' : 'pointer',
                    }}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
