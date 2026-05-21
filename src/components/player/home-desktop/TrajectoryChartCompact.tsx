'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { brand, fonts } from '@/lib/brand'
import type { PlayerTrajectoryDataset } from '@/lib/utr-forecast'

const W = 460
const H = 130
const PAD = { l: 36, r: 16, t: 14, b: 22 }

function cx(age: number) {
  return PAD.l + ((age - 8) / 11) * (W - PAD.l - PAD.r)
}

function cy(utr: number) {
  return H - PAD.b - ((utr - 5) / 8) * (H - PAD.t - PAD.b)
}

function compactPath(points: { age: number; utr: number }[]): string {
  if (!points.length) return ''
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${cx(p.age)} ${cy(p.utr)}`)
    .join(' ')
}

type Props = {
  fallback?: ReactNode
}

export default function TrajectoryChartCompact({ fallback = null }: Props) {
  const [data, setData] = useState<PlayerTrajectoryDataset | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState<string[]>([])

  useEffect(() => {
    void fetch('/api/journey/trajectory')
      .then(r => r.json())
      .then(j => {
        setData(j.trajectory ?? null)
        setMissing(Array.isArray(j.missing) ? j.missing : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null
  if (!data) return <>{fallback}</>

  const { player, history, forecast } = data
  const end = forecast[forecast.length - 1]

  return (
    <section style={{ marginTop: 20 }}>
      <div
        style={{
          background: 'white',
          border: `1px solid ${brand.line}`,
          borderRadius: 16,
          padding: '16px 18px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 10,
          }}
        >
          <p
            style={{
              fontFamily: fonts.serif,
              fontSize: 15,
              fontWeight: 700,
              color: brand.ink,
              margin: 0,
              lineHeight: 1.35,
            }}
          >
            {player.currentUtr.toFixed(1)} today, forecast to{' '}
            {player.forecastUtrAtGraduation.toFixed(2)} by class of {player.classYear}.
          </p>
          <Link
            href="/player/journey#trajectory"
            style={{
              fontFamily: fonts.sans,
              fontSize: 12,
              fontWeight: 700,
              color: brand.tealDarkHex,
              whiteSpace: 'nowrap',
            }}
          >
            View full →
          </Link>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
          <path
            d={compactPath(history)}
            fill="none"
            stroke="#0F6E56"
            strokeWidth={2.25}
          />
          <path
            d={compactPath(forecast)}
            fill="none"
            stroke="#0F6E56"
            strokeWidth={2}
            strokeDasharray="6 4"
            opacity={0.75}
          />
          <circle
            cx={cx(player.currentAge)}
            cy={cy(player.currentUtr)}
            r={5}
            fill="white"
            stroke="#0F6E56"
            strokeWidth={2}
          />
          {end ? (
            <text
              x={cx(end.age) + 4}
              y={cy(end.utr) + 3}
              fontSize={9}
              fill="#0F6E56"
              fontFamily="Helvetica Neue, sans-serif"
            >
              you
            </text>
          ) : null}
        </svg>
      </div>
    </section>
  )
}
