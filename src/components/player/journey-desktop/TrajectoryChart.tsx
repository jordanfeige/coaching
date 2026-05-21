'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import AcademicFitPanel from '@/components/player/journey-desktop/AcademicFitPanel'
import { brand, fonts } from '@/lib/brand'
import type { PlayerTrajectoryDataset } from '@/lib/utr-forecast'
import {
  BRACKET_AGES,
  CHART,
  pathFromPoints,
  xForAge,
  yForUtr,
} from '@/lib/trajectory-chart-math'

type SchoolRow = {
  ipeds_id: string
  name: string
  state: string | null
  sat_25th: number | null
  sat_75th: number | null
  school_tennis_programs:
    | {
        roster_avg_utr: number | null
        roster_min_utr: number | null
        roster_max_utr: number | null
      }
    | {
        roster_avg_utr: number | null
        roster_min_utr: number | null
        roster_max_utr: number | null
      }[]
}

type CompareMode =
  | { type: 'peer' }
  | { type: 'goal'; key: string; label: string }
  | { type: 'school'; id: string; name: string }

const GOAL_OPTIONS = [
  { key: 'recruited_college', label: 'Recruited college' },
  { key: 'scholarship_smaller', label: 'Scholarship / smaller program' },
  { key: 'win_highest_level', label: 'Win at highest level' },
  { key: 'improve_have_fun', label: 'Improve & have fun' },
] as const

function tp(row: SchoolRow) {
  const p = row.school_tennis_programs
  return Array.isArray(p) ? p[0] : p
}

export default function TrajectoryChart() {
  const [data, setData] = useState<PlayerTrajectoryDataset | null>(null)
  const [goalTracks, setGoalTracks] = useState<
    Record<string, { age: number; utr: number }[]>
  >({})
  const [schools, setSchools] = useState<SchoolRow[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState<string[]>([])
  const [compare, setCompare] = useState<CompareMode>({ type: 'peer' })
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [schoolQuery, setSchoolQuery] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [tRes, sRes] = await Promise.all([
          fetch('/api/journey/trajectory'),
          fetch('/api/journey/trajectory/schools'),
        ])
        const tJson = await tRes.json()
        const sJson = await sRes.json()
        setData(tJson.trajectory ?? null)
        const tracks: Record<string, { age: number; utr: number }[]> = {}
        for (const [key, rows] of Object.entries(tJson.goalTracks ?? {})) {
          tracks[key] = (rows as { age: number; utr: number }[]).map(r => ({
            age: r.age,
            utr: r.utr,
          }))
        }
        setGoalTracks(tracks)
        setSchools(sJson.schools ?? [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const selectedSchool = useMemo(() => {
    if (compare.type !== 'school') return null
    return schools.find(s => s.ipeds_id === compare.id) ?? null
  }, [compare, schools])

  const overlayLine = useMemo(() => {
    if (!data) return null
    if (compare.type === 'peer') return data.peerCohort
    if (compare.type === 'goal') {
      return goalTracks[compare.key] ?? data.goalTrack
    }
    return null
  }, [compare, data, goalTracks])

  if (loading) {
    return (
      <section style={{ marginTop: 24 }}>
        <div
          style={{
            background: 'white',
            border: `1px solid ${brand.line}`,
            borderRadius: 18,
            padding: 24,
            fontFamily: fonts.sans,
            fontSize: 13,
            color: brand.sub,
          }}
        >
          Loading trajectory…
        </div>
      </section>
    )
  }

  if (!data) {
    return (
      <section id="trajectory" style={{ marginTop: 24 }}>
        <div
          style={{
            background: brand.paper,
            border: `1px solid ${brand.line}`,
            borderRadius: 16,
            padding: '18px 20px',
          }}
        >
          <p style={{ fontFamily: fonts.sans, fontSize: 14, color: brand.sub, margin: 0 }}>
            {missing.includes('birth_date') && missing.includes('utr')
              ? 'Add your birth date and UTR in Journey setup to see your UTR trajectory.'
              : missing.includes('birth_date')
                ? 'Add your birth date in Journey setup (class year step) to see your UTR trajectory.'
                : missing.includes('utr')
                  ? 'Add or sync your UTR in Journey setup to see your trajectory.'
                  : 'Complete Journey setup to see your UTR trajectory.'}
          </p>
        </div>
      </section>
    )
  }

  const { player, history, forecast } = data
  const headline = `You're at ${player.currentUtr.toFixed(1)}, forecast to ${player.forecastUtrAtGraduation.toFixed(2)} by class of ${player.classYear}.`

  const filteredSchools = schools
    .filter(s =>
      schoolQuery.trim()
        ? s.name.toLowerCase().includes(schoolQuery.trim().toLowerCase())
        : true,
    )
    .slice(0, 40)

  const todayX = xForAge(player.currentAge)
  const todayY = yForUtr(player.currentUtr)
  const forecastEnd = forecast[forecast.length - 1]

  const schoolTp = selectedSchool ? tp(selectedSchool) : null

  return (
    <section id="trajectory" style={{ marginTop: 24 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedSchool ? '1fr 200px' : '1fr',
          gap: 18,
          alignItems: 'start',
        }}
      >
        <div
          style={{
            background: 'white',
            border: `1px solid ${brand.line}`,
            borderRadius: 18,
            padding: '24px 28px 18px',
          }}
        >
          <p
            style={{
              fontFamily: fonts.serif,
              fontSize: 17,
              fontWeight: 700,
              color: brand.ink,
              margin: '0 0 14px',
              lineHeight: 1.35,
            }}
          >
            {headline}
          </p>

          <div style={{ position: 'relative', marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setDropdownOpen(v => !v)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 10,
                border: `1px solid ${brand.line}`,
                background: brand.paper,
                fontFamily: fonts.sans,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Compare to:{' '}
              {compare.type === 'peer'
                ? 'Top-of-bracket peers'
                : compare.type === 'goal'
                  ? compare.label
                  : compare.name}
              <ChevronDown size={14} />
            </button>

            {dropdownOpen ? (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  zIndex: 20,
                  marginTop: 6,
                  width: 320,
                  maxHeight: 360,
                  overflow: 'auto',
                  background: 'white',
                  border: `1px solid ${brand.line}`,
                  borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                  padding: 10,
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: brand.muted,
                    marginBottom: 6,
                  }}
                >
                  YOUR GOALS
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCompare({ type: 'peer' })
                    setDropdownOpen(false)
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    padding: '8px 6px',
                    fontFamily: fonts.sans,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Top-of-bracket peers
                </button>
                {GOAL_OPTIONS.map(g => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => {
                      setCompare({ type: 'goal', key: g.key, label: g.label })
                      setDropdownOpen(false)
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      padding: '8px 6px',
                      fontFamily: fonts.sans,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {g.label}
                  </button>
                ))}
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: brand.muted,
                    margin: '10px 0 6px',
                  }}
                >
                  SCHOOLS
                </div>
                <input
                  value={schoolQuery}
                  onChange={e => setSchoolQuery(e.target.value)}
                  placeholder="Search schools"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: `1px solid ${brand.line}`,
                    fontSize: 12,
                    marginBottom: 6,
                  }}
                />
                {filteredSchools.map(s => (
                  <button
                    key={s.ipeds_id}
                    type="button"
                    onClick={() => {
                      setCompare({ type: 'school', id: s.ipeds_id, name: s.name })
                      setDropdownOpen(false)
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      padding: '6px',
                      fontFamily: fonts.sans,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <svg
            viewBox={`0 0 ${CHART.width} ${CHART.height}`}
            style={{ width: '100%', height: 'auto' }}
            role="img"
            aria-label="UTR trajectory chart"
          >
            {BRACKET_AGES.map(age => (
              <line
                key={age}
                x1={xForAge(age)}
                y1={CHART.padT}
                x2={xForAge(age)}
                y2={CHART.height - CHART.padB}
                stroke={brand.lineSoft}
                strokeDasharray="4 4"
              />
            ))}

            {[6, 9, 12].map(utr => (
              <g key={utr}>
                <line
                  x1={CHART.padL}
                  y1={yForUtr(utr)}
                  x2={CHART.width - CHART.padR}
                  y2={yForUtr(utr)}
                  stroke={brand.lineSoft}
                />
                <text
                  x={8}
                  y={yForUtr(utr) + 4}
                  fontSize={10}
                  fill={brand.muted}
                  fontFamily="Helvetica Neue, sans-serif"
                >
                  {utr}
                </text>
              </g>
            ))}

            {compare.type === 'school' && schoolTp ? (
              <>
                {schoolTp.roster_min_utr != null && schoolTp.roster_max_utr != null ? (
                  <rect
                    x={CHART.padL}
                    y={yForUtr(schoolTp.roster_max_utr)}
                    width={CHART.width - CHART.padL - CHART.padR}
                    height={
                      yForUtr(schoolTp.roster_min_utr) -
                      yForUtr(schoolTp.roster_max_utr)
                    }
                    fill="rgba(217, 119, 6, 0.12)"
                  />
                ) : null}
                {schoolTp.roster_min_utr != null ? (
                  <line
                    x1={CHART.padL}
                    y1={yForUtr(schoolTp.roster_min_utr)}
                    x2={CHART.width - CHART.padR}
                    y2={yForUtr(schoolTp.roster_min_utr)}
                    stroke="#D97706"
                    strokeDasharray="6 4"
                    strokeWidth={1.5}
                  />
                ) : null}
                {schoolTp.roster_max_utr != null ? (
                  <line
                    x1={CHART.padL}
                    y1={yForUtr(schoolTp.roster_max_utr)}
                    x2={CHART.width - CHART.padR}
                    y2={yForUtr(schoolTp.roster_max_utr)}
                    stroke="#D97706"
                    strokeDasharray="6 4"
                    strokeWidth={1.5}
                  />
                ) : null}
                {schoolTp.roster_avg_utr != null ? (
                  <line
                    x1={CHART.padL}
                    y1={yForUtr(schoolTp.roster_avg_utr)}
                    x2={CHART.width - CHART.padR}
                    y2={yForUtr(schoolTp.roster_avg_utr)}
                    stroke="#D97706"
                    strokeWidth={2}
                    strokeDasharray="8 4"
                  />
                ) : null}
              </>
            ) : overlayLine ? (
              <path
                d={pathFromPoints(overlayLine)}
                fill="none"
                stroke="#D97706"
                strokeWidth={2}
                strokeDasharray="8 4"
              />
            ) : null}

            <path
              d={pathFromPoints(history)}
              fill="none"
              stroke="#0F6E56"
              strokeWidth={2.75}
            />
            <path
              d={pathFromPoints(forecast)}
              fill="none"
              stroke="#0F6E56"
              strokeWidth={2.5}
              strokeDasharray="8 5"
              opacity={0.7}
            />

            <circle
              cx={todayX}
              cy={todayY}
              r={6}
              fill="white"
              stroke="#0F6E56"
              strokeWidth={2.5}
            />
            <text
              x={todayX}
              y={todayY - 12}
              textAnchor="middle"
              fontSize={11}
              fontStyle="italic"
              fill={brand.sub}
              fontFamily="Georgia, serif"
            >
              today
            </text>

            {forecastEnd ? (
              <text
                x={xForAge(forecastEnd.age) + 6}
                y={yForUtr(forecastEnd.utr) + 4}
                fontSize={11}
                fontWeight="700"
                fill="#0F6E56"
                fontFamily="Helvetica Neue, sans-serif"
              >
                you
              </text>
            ) : null}
          </svg>

          <p
            style={{
              fontFamily: fonts.serif,
              fontSize: 11,
              fontStyle: 'italic',
              color: brand.muted,
              margin: '12px 0 0',
            }}
          >
            Forecast uses bracket growth rates · Not a guarantee of recruitment outcomes
          </p>
        </div>

        {selectedSchool ? (
          <AcademicFitPanel
            playerGpa={data.academics.gpa}
            playerSat={data.academics.sat}
            schoolSat25={selectedSchool.sat_25th}
            schoolSat75={selectedSchool.sat_75th}
          />
        ) : null}
      </div>
    </section>
  )
}
