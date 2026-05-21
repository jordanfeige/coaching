import Link from 'next/link'

export type ExposureSummaryProps = {
  qualityWins: number
  topEvent: string
  exposureScore: number
  exposureMax: number
}

function Stat({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.025)',
        borderRadius: 8,
        padding: '10px 11px',
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: '#888',
          fontWeight: 500,
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
      </div>
    </div>
  )
}

export function ExposureSummary(props: ExposureSummaryProps) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 12,
        padding: '14px 16px',
        border: '0.5px solid rgba(0,0,0,0.06)',
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
          Exposure
        </h2>
        <Link
          href="/player/recruiting/exposure"
          style={{
            fontSize: 11,
            color: '#0F6E56',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Match history →
        </Link>
      </div>

      <div
        className="grid grid-cols-3 gap-2"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}
      >
        <Stat
          label="Quality wins"
          value={String(props.qualityWins)}
          color="#0F6E56"
        />
        <Stat label="Top event" value={props.topEvent} color="#534AB7" />
        <Stat
          label="Exposure score"
          value={`${props.exposureScore} / ${props.exposureMax}`}
        />
      </div>
    </div>
  )
}
