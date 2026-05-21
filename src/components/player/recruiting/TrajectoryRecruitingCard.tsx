'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import TrajectorySparkline from '@/components/player/trajectory/TrajectorySparkline'
import TrajectoryChart from '@/components/player/journey-desktop/TrajectoryChart'
import {
  D1_MID_MAJOR_TARGET,
  deriveConfidenceTagline,
  formatDelta,
  peerUtrAtGraduation,
  utrTopPercentileVsPeers,
} from '@/lib/trajectory-copy'
import type { PlayerTrajectoryDataset } from '@/lib/utr-forecast'

type ViewMode = 'summary' | 'detail'

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

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode
  onChange: (v: ViewMode) => void
}) {
  const items: { id: ViewMode; label: string }[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'detail', label: 'Detail chart' },
  ]

  return (
    <div
      role="tablist"
      aria-label="Trajectory view"
      style={{
        display: 'inline-flex',
        gap: 2,
        padding: 3,
        borderRadius: 8,
        background: 'rgba(0,0,0,0.25)',
        border: '0.5px solid rgba(255,255,255,0.12)',
      }}
    >
      {items.map(item => {
        const active = view === item.id
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '5px 10px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Helvetica Neue, sans-serif',
              color: active ? '#0A2A22' : 'rgba(255,255,255,0.75)',
              background: active ? '#5DCAA5' : 'transparent',
              transition: 'background 0.15s',
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

function TrajectorySummaryBody({ data }: { data: PlayerTrajectoryDataset }) {
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
    <>
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
          marginBottom: 14,
        }}
      >
        <span style={{ width: 24, height: 1, background: '#5DCAA5' }} />
        {player.bracket} · class of {player.classYear}
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
        style={{
          fontFamily: 'Georgia, serif',
          fontStyle: 'italic',
          fontSize: 'clamp(13px, 2vw, 16px)',
          color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.4,
          margin: '14px 0 24px',
          maxWidth: 380,
        }}
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
            utrPercentile != null ? `Top ${utrPercentile}% vs peers` : undefined
          }
        />
        <StatColumn
          label="Vs peers"
          value={peerDelta != null ? formatDelta(peerDelta) : '—'}
          color={peerDelta != null && peerDelta >= 0 ? '#5DCAA5' : '#FAC775'}
          border
        />
        <StatColumn
          label="D1 mid-major"
          value={formatDelta(d1Delta)}
          color={d1Delta >= 0 ? '#5DCAA5' : '#FAC775'}
          border
        />
      </div>
    </>
  )
}

type TrajectoryRecruitingCardProps = {
  onReadyChange?: (ready: boolean) => void
}

export function TrajectoryRecruitingCard({
  onReadyChange,
}: TrajectoryRecruitingCardProps) {
  const searchParams = useSearchParams()
  const [data, setData] = useState<PlayerTrajectoryDataset | null>(null)
  const [missing, setMissing] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('summary')

  useEffect(() => {
    if (searchParams.get('view') === 'detail') {
      setView('detail')
    }
  }, [searchParams])

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

  useEffect(() => {
    onReadyChange?.(!loading)
  }, [loading, onReadyChange])

  if (loading) {
    return (
      <div
        style={{
          background: '#0A2A22',
          borderRadius: 20,
          padding: 24,
          color: 'rgba(255,255,255,0.6)',
          fontSize: 13,
          marginBottom: 14,
        }}
      >
        Loading trajectory…
      </div>
    )
  }

  if (!data) {
    return (
      <div
        style={{
          background: 'rgba(0,0,0,0.03)',
          border: '0.5px solid rgba(0,0,0,0.06)',
          borderRadius: 16,
          padding: '18px 20px',
          marginBottom: 14,
          fontSize: 14,
          color: '#666',
          lineHeight: 1.5,
        }}
      >
        {missing.includes('birth_date') && missing.includes('utr')
          ? 'Add your birth date and UTR in Profile settings to unlock your trajectory.'
          : missing.includes('birth_date')
            ? 'Add your birth date in Profile settings to see your UTR trajectory.'
            : missing.includes('utr')
              ? 'Link or sync your UTR to see your trajectory forecast.'
              : 'Complete setup to see your UTR trajectory.'}
      </div>
    )
  }

  return (
    <section style={{ marginBottom: 14 }}>
      <div
        style={{
          background: '#0A2A22',
          borderRadius: view === 'detail' ? '20px 20px 0 0' : 20,
          padding: 'clamp(16px, 3vw, 22px) clamp(18px, 4vw, 26px)',
          color: '#FFF',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: view === 'summary' ? 0 : 4,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.45)',
              fontFamily: 'Helvetica Neue, sans-serif',
            }}
          >
            UTR trajectory
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>

        {view === 'summary' ? <TrajectorySummaryBody data={data} /> : null}
      </div>

      {view === 'detail' ? (
        <div
          style={{
            border: '0.5px solid rgba(0,0,0,0.06)',
            borderTop: 'none',
            borderRadius: '0 0 20px 20px',
            overflow: 'hidden',
          }}
        >
          <TrajectoryChart embedded />
        </div>
      ) : null}
    </section>
  )
}
