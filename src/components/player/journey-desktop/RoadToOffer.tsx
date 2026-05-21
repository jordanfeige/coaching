'use client'

type GoalThreshold = {
  utr: number
  gpa: number
  qualityWinsPerYear: number
}

const GOAL_THRESHOLDS: Record<
  string,
  { name: string; threshold: GoalThreshold }
> = {
  recruited_college: {
    name: 'D1 mid-major average',
    threshold: { utr: 11.3, gpa: 3.7, qualityWinsPerYear: 10 },
  },
  scholarship_smaller: {
    name: 'D2/D3 scholarship average',
    threshold: { utr: 10.0, gpa: 3.5, qualityWinsPerYear: 7 },
  },
  win_highest_level: {
    name: 'National prospect',
    threshold: { utr: 11.8, gpa: 3.5, qualityWinsPerYear: 15 },
  },
  improve_have_fun: {
    name: 'D3 / club average',
    threshold: { utr: 9.0, gpa: 3.3, qualityWinsPerYear: 4 },
  },
}

export type RoadToOfferProps = {
  goalKey: string
  classYear: number
  currentUtr: number
  currentGpa: number | null
  qualityWinsLast12Mo: number
}

function deriveTagline(opts: {
  utrGap: number
  gpaGap: number | null
  qwGap: number
}): string {
  const { utrGap, gpaGap, qwGap } = opts
  const closeOnUtr = utrGap <= 0
  const closeOnGpa = gpaGap == null || gpaGap <= 0
  const closeOnQw = qwGap <= 0

  if (closeOnUtr && closeOnGpa && closeOnQw) {
    return "You're at or above goal on every metric — strong recruiting position."
  }
  if (closeOnUtr && closeOnGpa) {
    return 'Strong on UTR and GPA. Quality wins are the biggest opportunity to close the gap.'
  }
  if (closeOnUtr && closeOnQw) {
    return 'Strong on UTR and quality wins. Academic readiness is the biggest opportunity.'
  }
  if (closeOnGpa && closeOnQw) {
    return 'Strong on academics and exposure. UTR climb is the biggest opportunity.'
  }
  if (qwGap > 5) {
    return 'Solid foundation — quality wins are the biggest lever to accelerate.'
  }
  return 'Each gap is closeable with focused work — your trajectory is climbing.'
}

function GapBlock({
  label,
  gap,
  target,
  pct,
  color,
  missing,
}: {
  label: string
  gap: number
  target: string
  pct: number
  color: string
  missing?: boolean
}) {
  let gapLabel = 'At goal'
  if (missing) gapLabel = '—'
  else if (gap > 0) gapLabel = `−${gap.toFixed(1)}`
  else if (gap < 0) gapLabel = `+${Math.abs(gap).toFixed(1)}`

  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.02)',
        borderRadius: 8,
        padding: '10px 12px',
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: '#888',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
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
          color: missing ? '#888' : '#111',
          lineHeight: 1,
          marginBottom: 4,
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
          flexWrap: 'wrap',
        }}
      >
        {gapLabel}
        <span
          style={{
            fontSize: 10,
            color: '#888',
            fontFamily: 'Helvetica Neue, sans-serif',
            fontStyle: missing ? 'italic' : 'normal',
          }}
        >
          {missing ? 'add GPA' : `from ${target}`}
        </span>
      </div>
      <div
        style={{
          height: 3,
          background: 'rgba(0,0,0,0.08)',
          borderRadius: 99,
          overflow: 'hidden',
          marginTop: 6,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: 99,
          }}
        />
      </div>
    </div>
  )
}

export function RoadToOffer({
  goalKey,
  classYear,
  currentUtr,
  currentGpa,
  qualityWinsLast12Mo,
}: RoadToOfferProps) {
  const goal = GOAL_THRESHOLDS[goalKey] ?? GOAL_THRESHOLDS.recruited_college
  const { threshold } = goal

  const utrGap = threshold.utr - currentUtr
  const utrPct = Math.max(
    0,
    Math.min(100, (currentUtr / threshold.utr) * 100),
  )

  const gpaGap =
    currentGpa != null ? threshold.gpa - currentGpa : null
  const gpaPct =
    currentGpa != null
      ? Math.max(0, Math.min(100, (currentGpa / threshold.gpa) * 100))
      : 0

  const qwGap = threshold.qualityWinsPerYear - qualityWinsLast12Mo
  const qwPct = Math.max(
    0,
    Math.min(100, (qualityWinsLast12Mo / threshold.qualityWinsPerYear) * 100),
  )

  const tagline = deriveTagline({ utrGap, gpaGap, qwGap })

  return (
    <div
      style={{
        background: '#FFFEFB',
        border: '0.5px solid #0F6E56',
        borderLeft: '3px solid #0F6E56',
        borderRadius: 14,
        padding: '16px 18px',
        marginBottom: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 500,
            color: '#0F6E56',
            background: '#E1F5EE',
            padding: '3px 8px',
            borderRadius: 99,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Your goal
        </span>
        <span
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 14,
            fontWeight: 500,
            color: '#111',
          }}
        >
          {goal.name}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#888' }}>
          By class of {classYear}
        </span>
      </div>

      <p
        style={{
          fontFamily: 'Georgia, serif',
          fontStyle: 'italic',
          fontSize: 12,
          color: '#666',
          margin: '0 0 14px',
          lineHeight: 1.5,
        }}
      >
        {tagline}
      </p>

      <style>{`
        .road-to-offer-gaps {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }
        @media (min-width: 640px) {
          .road-to-offer-gaps {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
      <div className="road-to-offer-gaps">
        <GapBlock
          label="UTR gap"
          gap={utrGap}
          target={threshold.utr.toFixed(1)}
          pct={utrPct}
          color="#0F6E56"
        />
        <GapBlock
          label="GPA gap"
          gap={gpaGap ?? 0}
          target={threshold.gpa.toFixed(1)}
          pct={gpaPct}
          color="#0F6E56"
          missing={currentGpa == null}
        />
        <GapBlock
          label="Quality wins"
          gap={qwGap}
          target={`need ${threshold.qualityWinsPerYear}/yr`}
          pct={qwPct}
          color="#BA7517"
        />
      </div>
    </div>
  )
}
