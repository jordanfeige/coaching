'use client'

import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  PlayerTrajectoryDataset,
  TrajectoryPoint,
} from '@/lib/utr-forecast'

const AGE_MIN = 9
const AGE_MAX = 17
const Y_MIN = 5

type ChartRow = {
  age: number
  history: number | null
  forecast: number | null
  peers: number | null
  goal: number | null
}

type CompareMode =
  | { type: 'peer' }
  | { type: 'goal'; key: string; label: string }
  | { type: 'school'; id: string; name: string }

type SchoolProgram = {
  roster_avg_utr: number | null
  roster_min_utr: number | null
  roster_max_utr: number | null
}

function buildChartData(
  trajectory: PlayerTrajectoryDataset,
  overlayLine: TrajectoryPoint[] | null,
): ChartRow[] {
  const ages: number[] = []
  for (let a = AGE_MIN; a <= AGE_MAX; a += 1) ages.push(a)

  const historyByAge = new Map<number, number>()
  trajectory.history.forEach(p => {
    historyByAge.set(Math.round(p.age), p.utr)
  })

  const forecastByAge = new Map<number, number>()
  trajectory.forecast.forEach(p => {
    forecastByAge.set(Math.round(p.age), p.utr)
  })

  const peerByAge = new Map<number, number>()
  ;(trajectory.peerCohort ?? []).forEach(p => {
    peerByAge.set(Math.round(p.age), p.utr)
  })

  const goalByAge = new Map<number, number>()
  overlayLine?.forEach(p => {
    goalByAge.set(Math.round(p.age), p.utr)
  })

  const currentAge = Math.round(trajectory.player.currentAge)
  const currentUtr = trajectory.player.currentUtr

  const rows = ages.map(age => {
    let history: number | null = null
    if (age < currentAge) {
      history = historyByAge.get(age) ?? null
    } else if (age === currentAge) {
      history = currentUtr
    }

    let forecast: number | null = null
    if (age >= currentAge) {
      forecast =
        age === currentAge
          ? currentUtr
          : (forecastByAge.get(age) ?? null)
    }

    return {
      age,
      history,
      forecast,
      peers: peerByAge.get(age) ?? null,
      goal: goalByAge.get(age) ?? null,
    }
  })

  return rows
}

function yPercent(utr: number, yMax: number): string {
  const span = yMax - Y_MIN
  if (span <= 0) return '50%'
  return `${(1 - (utr - Y_MIN) / span) * 100}%`
}

function tooltipLabel(name: string, compare: CompareMode): string {
  if (name === 'history') return 'You'
  if (name === 'forecast') return 'You (projected)'
  if (name === 'peers') return 'Peers'
  if (name === 'goal') {
    return compare.type === 'goal' ? compare.label : 'Goal'
  }
  return name
}

type Props = {
  trajectory: PlayerTrajectoryDataset
  compare: CompareMode
  overlayLine: TrajectoryPoint[] | null
  schoolProgram: SchoolProgram | null
}

export default function TrajectoryChartPlot({
  trajectory,
  compare,
  overlayLine,
  schoolProgram,
}: Props) {
  const { player, forecast, peerCohort } = trajectory
  const projectedUtr =
    forecast[forecast.length - 1]?.utr ?? player.forecastUtrAtGraduation
  const currentAge = Math.round(player.currentAge)
  const currentUtr = player.currentUtr
  const peerEndUtr =
    peerCohort?.length && peerCohort[peerCohort.length - 1]
      ? peerCohort[peerCohort.length - 1].utr
      : null

  const chartData = useMemo(
    () => buildChartData(trajectory, overlayLine),
    [trajectory, overlayLine],
  )

  const yMax = useMemo(() => {
    const values = [
      projectedUtr,
      currentUtr,
      peerEndUtr,
      ...chartData.flatMap(d =>
        [d.history, d.forecast, d.peers, d.goal].filter(
          (v): v is number => v != null,
        ),
      ),
      schoolProgram?.roster_max_utr ?? null,
    ].filter((v): v is number => v != null)
    const peak = values.length ? Math.max(...values) : 12
    return Math.max(12, Math.ceil(peak + 0.5))
  }, [chartData, projectedUtr, currentUtr, peerEndUtr, schoolProgram])

  const showPeers =
    compare.type === 'peer' && (trajectory.peerCohort?.length ?? 0) > 0
  const showGoal = compare.type === 'goal' && (overlayLine?.length ?? 0) > 0

  const youLabelTop = yPercent(projectedUtr, yMax)
  const peersLabelTop =
    peerEndUtr != null ? yPercent(peerEndUtr, yMax) : '22%'

  return (
    <div
      style={{
        borderTop: '0.5px solid rgba(0,0,0,0.06)',
        borderBottom: '0.5px solid rgba(0,0,0,0.06)',
        background: '#FAFAF7',
      }}
    >
      <div
        className="trajectory-bracket-row"
        style={{
          display: 'none',
          gridTemplateColumns: '60px 1fr 1fr 1fr 1fr',
          padding: '10px 50px 8px 8px',
          fontSize: 'clamp(9px, 1.6vw, 10px)',
          fontWeight: 500,
          color: '#999',
          letterSpacing: '0.15em',
          fontFamily: 'Helvetica Neue, sans-serif',
        }}
      >
        <div />
        <div style={{ textAlign: 'center' }}>12U</div>
        <div style={{ textAlign: 'center' }}>14U</div>
        <div style={{ textAlign: 'center' }}>16U</div>
        <div style={{ textAlign: 'center' }}>18U</div>
      </div>

      <div
        className="trajectory-chart-plot-wrap"
        style={{
          position: 'relative',
          width: '100%',
          height: 'clamp(220px, 38vw, 320px)',
          paddingTop: 12,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 12, right: 60, bottom: 8, left: 4 }}
          >
            <CartesianGrid stroke="rgba(0,0,0,0.04)" vertical={false} />

            {compare.type === 'school' &&
            schoolProgram?.roster_min_utr != null &&
            schoolProgram?.roster_max_utr != null ? (
              <ReferenceArea
                y1={schoolProgram.roster_min_utr}
                y2={schoolProgram.roster_max_utr}
                fill="rgba(186, 117, 23, 0.1)"
                strokeOpacity={0}
              />
            ) : null}

            {compare.type === 'school' &&
            schoolProgram?.roster_avg_utr != null ? (
              <ReferenceLine
                y={schoolProgram.roster_avg_utr}
                stroke="#BA7517"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                strokeOpacity={0.55}
              />
            ) : null}

            <XAxis
              dataKey="age"
              type="number"
              domain={[AGE_MIN, AGE_MAX]}
              ticks={[9, 10, 11, 12, 13, 14, 15, 16, 17]}
              tick={{ fill: '#999', fontSize: 11 }}
              axisLine={{ stroke: '#DDD' }}
              tickLine={false}
              label={{
                value: 'Age',
                position: 'insideBottom',
                offset: -2,
                style: {
                  fill: '#999',
                  fontSize: 10,
                  fontStyle: 'italic',
                },
              }}
            />
            <YAxis
              type="number"
              domain={[Y_MIN, yMax]}
              ticks={(() => {
                const ticks: number[] = []
                for (let t = 5; t <= yMax; t += 2) ticks.push(t)
                return ticks
              })()}
              tick={{ fill: '#999', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={50}
              label={{
                value: 'UTR',
                angle: -90,
                position: 'insideLeft',
                offset: 18,
                style: {
                  fill: '#999',
                  fontSize: 10,
                  fontStyle: 'italic',
                },
              }}
            />
            <Tooltip
              cursor={{
                stroke: '#0F6E56',
                strokeWidth: 1,
                strokeDasharray: '2 3',
                strokeOpacity: 0.5,
              }}
              contentStyle={{
                background: '#FFFEFB',
                border: '0.5px solid #0F6E56',
                borderRadius: 6,
                fontSize: 12,
                padding: '8px 12px',
              }}
              labelStyle={{
                fontSize: 10,
                color: '#888',
                fontWeight: 500,
                letterSpacing: 0.5,
              }}
              formatter={(value, name) => {
                if (value == null || typeof value !== 'number') return null
                return [
                  Number(value).toFixed(1),
                  tooltipLabel(String(name), compare),
                ]
              }}
              labelFormatter={age => `AGE ${age}`}
            />

            {showPeers ? (
              <Line
                type="monotone"
                dataKey="peers"
                stroke="#BA7517"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                strokeOpacity={0.75}
                dot={false}
                activeDot={{ r: 4, fill: '#BA7517' }}
                isAnimationActive={false}
                connectNulls
              />
            ) : null}

            {showGoal ? (
              <Line
                type="monotone"
                dataKey="goal"
                stroke="#BA7517"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                strokeOpacity={0.75}
                dot={false}
                activeDot={{ r: 4, fill: '#BA7517' }}
                isAnimationActive={false}
                connectNulls
              />
            ) : null}

            <Line
              type="monotone"
              dataKey="history"
              stroke="#0F6E56"
              strokeWidth={3}
              dot={{ r: 3.5, fill: '#0F6E56', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#0F6E56' }}
              isAnimationActive={false}
              connectNulls={false}
            />

            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#0F6E56"
              strokeWidth={2.5}
              strokeDasharray="6 5"
              strokeOpacity={0.85}
              dot={false}
              activeDot={{ r: 5, fill: '#0F6E56' }}
              isAnimationActive={false}
              connectNulls={false}
            />

            <ReferenceDot
              x={currentAge}
              y={currentUtr}
              r={7}
              fill="#FAFAF7"
              stroke="#0F6E56"
              strokeWidth={2.5}
              ifOverflow="visible"
              label={{
                value: 'today',
                position: 'top',
                offset: 14,
                style: {
                  fill: '#888',
                  fontSize: 10,
                  fontStyle: 'italic',
                  fontFamily: 'Georgia, serif',
                },
              }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div
          aria-hidden
          style={{
            position: 'absolute',
            right: 6,
            top: youLabelTop,
            transform: 'translateY(-50%)',
            fontFamily: 'Georgia, serif',
            fontSize: 11,
            fontWeight: 500,
            color: '#0F6E56',
            pointerEvents: 'none',
          }}
        >
          you · {projectedUtr.toFixed(1)}
        </div>
        {showPeers && peerEndUtr != null ? (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              right: 6,
              top: peersLabelTop,
              transform: 'translateY(-50%)',
              fontFamily: 'Georgia, serif',
              fontSize: 10,
              fontStyle: 'italic',
              color: '#854F0B',
              pointerEvents: 'none',
            }}
          >
            peers
          </div>
        ) : null}
      </div>
    </div>
  )
}
