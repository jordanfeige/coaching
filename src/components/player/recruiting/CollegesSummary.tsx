import Link from 'next/link'

export type CollegesSummaryProps = {
  reachCount: number
  reachLabel: string
  targetCount: number
  targetLabel: string
  safetyCount: number
  safetyLabel: string
  totalCount: number
}

function Bucket({
  label,
  labelColor,
  count,
  sub,
}: {
  label: string
  labelColor: string
  count: number
  sub: string
}) {
  return (
    <Link
      href="/player/recruiting/colleges"
      style={{
        flex: 1,
        background: 'rgba(0,0,0,0.025)',
        borderRadius: 8,
        padding: '10px 11px',
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: 4,
          color: labelColor,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 20,
          fontWeight: 500,
          lineHeight: 1,
          marginBottom: 3,
          color: '#111',
        }}
      >
        {count}
      </div>
      <div
        style={{
          fontSize: 9,
          color: '#888',
          fontFamily: 'Georgia, serif',
          fontStyle: 'italic',
        }}
      >
        {sub}
      </div>
    </Link>
  )
}

export function CollegesSummary(props: CollegesSummaryProps) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 12,
        padding: '14px 16px',
        border: '0.5px solid rgba(0,0,0,0.06)',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <h2
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 14,
            fontWeight: 500,
            margin: 0,
          }}
        >
          College matches
        </h2>
        <Link
          href="/player/recruiting/colleges"
          style={{
            fontSize: 11,
            color: '#0F6E56',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          See all {props.totalCount} →
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <Bucket
          label="Reach"
          labelColor="#534AB7"
          count={props.reachCount}
          sub={props.reachLabel}
        />
        <Bucket
          label="Target"
          labelColor="#0F6E56"
          count={props.targetCount}
          sub={props.targetLabel}
        />
        <Bucket
          label="Safety"
          labelColor="#666"
          count={props.safetyCount}
          sub={props.safetyLabel}
        />
      </div>
    </div>
  )
}
