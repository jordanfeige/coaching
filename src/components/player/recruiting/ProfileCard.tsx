import type { ReactNode } from 'react'

export type ProfileCardProps = {
  playerName: string
  playerInitials: string
  bracket: string
  classYear: number | null
  goalLabel: string
  location: string
  currentUtr: number | null
  journeyRating: number | null
  journeyTier: string
  projectedUtr: number | null
  collegeMatchCount: number
}

function formatStat(value: number | null, decimals = 1): string {
  if (value == null || Number.isNaN(value)) return '—'
  return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value))
}

function StatBlock({
  label,
  value,
  color,
  suffix,
}: {
  label: string
  value: string
  color?: string
  suffix?: ReactNode
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#888',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 18,
          fontWeight: 500,
          color: color ?? '#111',
          lineHeight: 1,
        }}
      >
        {value}
        {suffix}
      </div>
    </div>
  )
}

export function ProfileCard(props: ProfileCardProps) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 14,
        border: '0.5px solid rgba(0,0,0,0.06)',
        marginBottom: 14,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '20px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            background: '#0F6E56',
            color: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 500,
            fontFamily: 'Georgia, serif',
            flexShrink: 0,
          }}
        >
          {props.playerInitials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 22,
              fontWeight: 500,
              color: '#111',
              lineHeight: 1.1,
              margin: '0 0 4px',
            }}
          >
            {props.playerName}
          </h1>
          <div
            style={{
              fontSize: 12,
              color: '#666',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>
              <strong style={{ fontWeight: 500, color: '#111' }}>
                {props.bracket}
              </strong>
            </span>
            <span
              style={{
                width: 3,
                height: 3,
                background: '#D0D0D0',
                borderRadius: '50%',
              }}
            />
            <span>
              Class of{' '}
              <strong style={{ fontWeight: 500, color: '#111' }}>
                {props.classYear ?? '—'}
              </strong>
            </span>
            <span
              style={{
                width: 3,
                height: 3,
                background: '#D0D0D0',
                borderRadius: '50%',
              }}
            />
            <span>
              Goal:{' '}
              <strong style={{ fontWeight: 500, color: '#111' }}>
                {props.goalLabel}
              </strong>
            </span>
            {props.location ? (
              <>
                <span
                  style={{
                    width: 3,
                    height: 3,
                    background: '#D0D0D0',
                    borderRadius: '50%',
                  }}
                />
                <span>{props.location}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className="grid grid-cols-2 gap-[18px] px-[22px] py-[14px] sm:grid-cols-4"
        style={{
          background: '#FAFAF7',
          borderTop: '0.5px solid rgba(0,0,0,0.05)',
        }}
      >
        <StatBlock
          label="UTR"
          value={formatStat(props.currentUtr)}
          color="#0F6E56"
        />
        <StatBlock
          label="Journey rating"
          value={
            props.journeyRating != null ? String(props.journeyRating) : '—'
          }
          suffix={
            props.journeyTier !== '—' ? (
              <span
                style={{
                  fontSize: 11,
                  color: '#0F6E56',
                  marginLeft: 4,
                  fontFamily: 'Helvetica Neue, sans-serif',
                }}
              >
                {props.journeyTier}
              </span>
            ) : null
          }
        />
        <StatBlock
          label="Projected UTR"
          value={formatStat(props.projectedUtr)}
          color="#0F6E56"
        />
        <StatBlock
          label="College matches"
          value={String(props.collegeMatchCount)}
        />
      </div>
    </div>
  )
}
