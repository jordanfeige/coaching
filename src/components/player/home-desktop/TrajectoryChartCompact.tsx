'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import TrajectorySparkline from '@/components/player/trajectory/TrajectorySparkline'
import {
  D1_MID_MAJOR_TARGET,
  deriveConfidenceTagline,
  formatDelta,
  peerUtrAtGraduation,
  utrTopPercentileVsPeers,
} from '@/lib/trajectory-copy'
import type { PlayerTrajectoryDataset } from '@/lib/utr-forecast'

type Props = {
  fallback?: ReactNode
  /** Called when load finishes: true if trajectory chart is shown, false if fallback. */
  onChartVisible?: (visible: boolean) => void
}

function StatColumn({
  label,
  value,
  subValue,
  color,
  border,
}: {
  label: string
  value: string
  subValue?: string
  color?: string
  border?: boolean
}) {
  return (
    <div
      style={{
        padding: '0 clamp(6px, 2vw, 12px)',
        borderLeft: border ? '0.5px solid rgba(255,255,255,0.15)' : 'none',
      }}
    >
      <div
        style={{
          fontSize: 'clamp(9px, 1.4vw, 10px)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.5)',
          marginBottom: 6,
          fontWeight: 500,
          fontFamily: 'Helvetica Neue, sans-serif',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 'clamp(18px, 3.5vw, 24px)',
          fontWeight: 500,
          color: color ?? '#FFF',
        }}
      >
        {value}
      </div>
      {subValue ? (
        <div
          style={{
            fontFamily: 'Helvetica Neue, sans-serif',
            fontSize: 'clamp(9px, 1.3vw, 11px)',
            color: 'rgba(255,255,255,0.45)',
            marginTop: 4,
            lineHeight: 1.3,
          }}
        >
          {subValue}
        </div>
      ) : null}
    </div>
  )
}

export default function TrajectoryChartCompact({
  fallback = null,
  onChartVisible,
}: Props) {
  const [data, setData] = useState<PlayerTrajectoryDataset | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch('/api/journey/trajectory')
      .then(r => r.json())
      .then(j => setData(j.trajectory ?? null))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (loading) return
    onChartVisible?.(Boolean(data))
  }, [loading, data, onChartVisible])

  if (loading) return null
  if (!data) return <>{fallback}</>

  const { player, history, forecast, peerCohort } = data
  const projectedUtr =
    forecast[forecast.length - 1]?.utr ?? player.forecastUtrAtGraduation
  const currentUtr = player.currentUtr
  const climbAmount = projectedUtr - currentUtr
  const peerAtGrad = peerUtrAtGraduation(peerCohort, player.graduationAge)
  const peerDelta = peerAtGrad != null ? projectedUtr - peerAtGrad : null
  const d1Delta = projectedUtr - D1_MID_MAJOR_TARGET
  const tagline = deriveConfidenceTagline(climbAmount, d1Delta)
  const utrPercentile = utrTopPercentileVsPeers(
    currentUtr,
    peerCohort,
    player.currentAge,
  )

  return (
    <section style={{ marginTop: 20 }}>
      <Link
        href="/player/recruiting?view=detail"
        className="trajectory-confidence-card block no-underline"
        style={{
          background: '#0A2A22',
          borderRadius: 20,
          padding:
            'clamp(20px, 4vw, 32px) clamp(20px, 4vw, 30px) clamp(20px, 4vw, 26px)',
          color: '#FFF',
          position: 'relative',
          overflow: 'hidden',
          display: 'block',
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#5DCAA5',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontFamily: 'Helvetica Neue, sans-serif',
            }}
          >
            <span style={{ width: 24, height: 1, background: '#5DCAA5' }} />
            {player.bracket} · class of {player.classYear}
          </div>

          <span
            className="trajectory-confidence-cta hidden sm:inline-flex"
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#5DCAA5',
              alignItems: 'center',
              gap: 4,
              padding: '8px 14px',
              border: '0.5px solid rgba(93,202,165,0.3)',
              borderRadius: 999,
            }}
          >
            Explore <span aria-hidden>→</span>
          </span>
          <span
            className="trajectory-confidence-cta-sm sm:hidden"
            style={{ fontSize: 18, color: '#5DCAA5', lineHeight: 1 }}
            aria-hidden
          >
            →
          </span>
        </div>

        <div className="flex items-baseline flex-wrap gap-1">
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 'clamp(56px, 14vw, 96px)',
              fontWeight: 500,
              lineHeight: 0.85,
              letterSpacing: '-0.04em',
              color: '#FFF',
            }}
          >
            {projectedUtr.toFixed(1)}
          </div>
          <div
            style={{
              fontSize: 'clamp(13px, 2vw, 18px)',
              color: 'rgba(255,255,255,0.5)',
              marginLeft: 4,
              fontWeight: 400,
              fontFamily: 'Helvetica Neue, sans-serif',
            }}
          >
            UTR projected
          </div>
        </div>

        <p
          className="trajectory-confidence-tagline"
          style={{
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            fontSize: 'clamp(13px, 2vw, 16px)',
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.4,
            margin: '14px 0 24px',
            maxWidth: 380,
          }}
          title={tagline}
        >
          {tagline}
        </p>

        <div
          style={{
            margin: '0 -8px 22px',
            height: 'clamp(60px, 10vw, 80px)',
            position: 'relative',
          }}
        >
          <TrajectorySparkline
            history={history}
            forecast={forecast}
            currentAge={player.currentAge}
            currentUtr={currentUtr}
            projectedUtr={projectedUtr}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 0,
            paddingTop: 20,
            borderTop: '0.5px solid rgba(255,255,255,0.15)',
          }}
        >
          <StatColumn
            label="Today"
            value={currentUtr.toFixed(1)}
            subValue={
              utrPercentile != null
                ? `Top ${utrPercentile}% vs peers`
                : undefined
            }
          />
          <StatColumn
            label="Vs peers"
            value={peerDelta != null ? formatDelta(peerDelta) : '—'}
            color={
              peerDelta != null && peerDelta >= 0 ? '#5DCAA5' : '#FAC775'
            }
            border
          />
          <StatColumn
            label="D1 mid-major"
            value={formatDelta(d1Delta)}
            color={d1Delta >= 0 ? '#5DCAA5' : '#FAC775'}
            border
          />
        </div>
      </Link>
      <style>{`
        @media (max-width: 639px) {
          .trajectory-confidence-tagline {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        }
        .trajectory-confidence-card:hover .trajectory-confidence-cta {
          border-color: rgba(93,202,165,0.55);
        }
      `}</style>
    </section>
  )
}
