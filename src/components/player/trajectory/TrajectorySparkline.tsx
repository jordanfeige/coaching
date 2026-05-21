'use client'

import { useId } from 'react'
import type { TrajectoryPoint } from '@/lib/utr-forecast'

type Props = {
  history: TrajectoryPoint[]
  forecast: TrajectoryPoint[]
  currentAge: number
  currentUtr: number
  projectedUtr: number
}

const W = 580
const H = 70
const AGE_MIN = 9
const AGE_MAX = 17
const UTR_MIN = 4
const UTR_MAX = 12

function xFor(age: number): number {
  return ((age - AGE_MIN) / (AGE_MAX - AGE_MIN)) * W
}

function yFor(utr: number): number {
  return ((UTR_MAX - utr) / (UTR_MAX - UTR_MIN)) * (H - 10) + 5
}

export default function TrajectorySparkline({
  history,
  forecast,
  currentAge,
  currentUtr,
  projectedUtr,
}: Props) {
  const gradId = useId().replace(/:/g, '')

  if (!history.length || !forecast.length) return null

  const histPath = history
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.age).toFixed(1)} ${yFor(p.utr).toFixed(1)}`)
    .join(' ')

  const fcastPoints =
    forecast[0]?.age === history[history.length - 1]?.age
      ? forecast
      : [history[history.length - 1], ...forecast]

  const fcastPath = fcastPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.age).toFixed(1)} ${yFor(p.utr).toFixed(1)}`)
    .join(' ')

  const ribbon = [...history, ...fcastPoints.slice(1)]
  const fillPath = `M ${xFor(ribbon[0].age).toFixed(1)} ${H - 5} ${ribbon
    .map(p => `L ${xFor(p.age).toFixed(1)} ${yFor(p.utr).toFixed(1)}`)
    .join(' ')} L ${xFor(ribbon[ribbon.length - 1].age).toFixed(1)} ${H - 5} Z`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: '100%', display: 'block' }}
      role="img"
      aria-label="Trajectory sparkline"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5DCAA5" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#5DCAA5" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradId})`} />
      <path d={histPath} stroke="#5DCAA5" strokeWidth={2.5} fill="none" />
      <path
        d={fcastPath}
        stroke="#5DCAA5"
        strokeWidth={2}
        fill="none"
        strokeDasharray="5 4"
        opacity={0.7}
      />
      <circle
        cx={xFor(currentAge)}
        cy={yFor(currentUtr)}
        r={5}
        fill="#0A2A22"
        stroke="#5DCAA5"
        strokeWidth={2}
      />
      <text
        x={W}
        y={14}
        textAnchor="end"
        fontSize={10}
        fill="#5DCAA5"
        fontWeight={500}
        fontFamily="Helvetica Neue, sans-serif"
      >
        {projectedUtr.toFixed(1)}
      </text>
    </svg>
  )
}
