'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Target, TrendingUp } from 'lucide-react'
import AcademicFitPanel from '@/components/player/journey-desktop/AcademicFitPanel'
import { brand, fonts } from '@/lib/brand'
import {
  D1_MID_MAJOR_TARGET,
  climbPerYear,
  deriveJourneyTaglineParts,
  progressPctTowardTarget,
  utrTopPercentileVsPeers,
} from '@/lib/trajectory-copy'
import type { PlayerTrajectoryDataset } from '@/lib/utr-forecast'
import TrajectoryChartPlot from '@/components/player/journey-desktop/TrajectoryChartPlot'

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

const DASHBOARD_CSS = `
  .trajectory-dashboard-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px 20px;
  }
  .trajectory-dashboard-meta {
    text-align: right;
    font-family: Helvetica Neue, sans-serif;
    font-size: 11px;
    color: #888;
    letter-spacing: 0.06em;
  }
  @media (min-width: 480px) {
    .trajectory-bracket-row {
      display: grid !important;
    }
  }
  .trajectory-insights-row {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px clamp(18px, 4vw, 26px);
    font-size: 12px;
  }
  .trajectory-progress-row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 14px clamp(18px, 4vw, 26px);
    border-top: 0.5px solid rgba(0,0,0,0.05);
  }
  @media (min-width: 640px) {
    .trajectory-insights-row {
      flex-direction: row;
      gap: 20px;
    }
    .trajectory-progress-row {
      flex-direction: row;
      align-items: center;
      gap: 18px;
    }
  }
  @media (max-width: 639px) {
    .trajectory-dashboard-meta {
      width: 100%;
      text-align: left;
      order: 3;
    }
  }
`

function tp(row: SchoolRow) {
  const p = row.school_tennis_programs
  return Array.isArray(p) ? p[0] : p
}

type TrajectoryChartProps = {
  /** Nested under Recruiting hero — tighter spacing, no outer section margin */
  embedded?: boolean
}

export default function TrajectoryChart({ embedded = false }: TrajectoryChartProps) {
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
        setMissing(Array.isArray(tJson.missing) ? tJson.missing : [])
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
    if (compare.type === 'peer') {
      return data.peerCohort?.length ? data.peerCohort : null
    }
    if (compare.type === 'goal') {
      const line = goalTracks[compare.key] ?? data.goalTrack
      return line?.length ? line : null
    }
    return null
  }, [compare, data, goalTracks])

  if (loading) {
    return (
      <section style={{ marginTop: embedded ? 0 : 24 }}>
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
      <section id="trajectory" style={{ marginTop: embedded ? 0 : 24 }}>
        <div
          style={{
            background: brand.paper,
            border: `1px solid ${brand.line}`,
            borderRadius: 16,
            padding: '18px 20px',
          }}
        >
          <p
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: brand.sub,
              margin: 0,
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
          </p>
          <Link
            href="/player/settings"
            style={{
              display: 'inline-block',
              marginTop: 12,
              fontFamily: fonts.sans,
              fontSize: 13,
              fontWeight: 700,
              color: brand.tealDarkHex,
            }}
          >
            Open profile settings →
          </Link>
        </div>
      </section>
    )
  }

  const { player, forecast, peerCohort } = data
  const projectedUtr =
    forecast[forecast.length - 1]?.utr ?? player.forecastUtrAtGraduation
  const currentUtr = player.currentUtr
  const utrPercentile = utrTopPercentileVsPeers(
    currentUtr,
    peerCohort,
    player.currentAge,
  )
  const d1Delta = projectedUtr - D1_MID_MAJOR_TARGET
  const progressTarget =
    compare.type === 'goal' && overlayLine?.length
      ? overlayLine[overlayLine.length - 1].utr
      : D1_MID_MAJOR_TARGET
  const progressLabel =
    compare.type === 'goal'
      ? compare.label
      : 'D1 mid-major'
  const pct = progressPctTowardTarget(projectedUtr, progressTarget)
  const pace = climbPerYear(
    currentUtr,
    projectedUtr,
    player.currentAge,
    player.graduationAge,
  )
  const { peerPhrase, suffix } = deriveJourneyTaglineParts(
    player.bracket,
    projectedUtr,
    peerCohort ?? [],
    player.graduationAge,
  )

  const filteredSchools = schools
    .filter(s =>
      schoolQuery.trim()
        ? s.name.toLowerCase().includes(schoolQuery.trim().toLowerCase())
        : true,
    )
    .slice(0, 40)

  const schoolTp = selectedSchool ? tp(selectedSchool) : null

  return (
    <section id="trajectory" style={{ marginTop: embedded ? 0 : 24 }}>
      <style>{DASHBOARD_CSS}</style>
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
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 'clamp(16px, 3vw, 22px) clamp(18px, 4vw, 26px) 0' }}>
            <div className="trajectory-dashboard-header">
              <div
                className="flex items-start gap-4 sm:gap-5"
                style={{ flex: '1 1 auto', minWidth: 0 }}
              >
                <div style={{ flex: '1 1 0', minWidth: 72 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#888',
                      marginBottom: 6,
                      fontFamily: fonts.sans,
                    }}
                  >
                    Today
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 'clamp(24px, 5vw, 32px)',
                      fontWeight: 500,
                      color: '#444',
                      lineHeight: 1,
                    }}
                  >
                    {currentUtr.toFixed(1)}
                  </div>
                  {utrPercentile != null ? (
                    <div
                      style={{
                        fontFamily: fonts.sans,
                        fontSize: 11,
                        color: brand.sub,
                        marginTop: 6,
                        lineHeight: 1.3,
                      }}
                    >
                      Top {utrPercentile}% vs peers
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    width: 1,
                    alignSelf: 'stretch',
                    background: 'rgba(0,0,0,0.08)',
                    margin: '6px 0',
                    flexShrink: 0,
                  }}
                />

                <div style={{ flex: '1 1 0', minWidth: 100 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#854F0B',
                      marginBottom: 6,
                      fontFamily: fonts.sans,
                    }}
                  >
                    Projected · {player.classYear}
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 'clamp(40px, 9vw, 54px)',
                      fontWeight: 500,
                      color: '#0F6E56',
                      lineHeight: 0.9,
                      letterSpacing: '-0.04em',
                    }}
                  >
                    {projectedUtr.toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="trajectory-dashboard-meta">
                <div style={{ fontWeight: 600, color: brand.ink }}>
                  Class of {player.classYear}
                </div>
                <div style={{ marginTop: 4 }}>
                  {player.bracket} · year {player.yearInBracket}
                </div>
              </div>
            </div>

            <p
              style={{
                fontFamily: fonts.serif,
                fontStyle: 'italic',
                fontSize: 14,
                color: '#444',
                lineHeight: 1.5,
                padding: '14px 0 16px',
                margin: 0,
              }}
            >
              <span style={{ color: '#0F6E56', fontWeight: 500 }}>
                {peerPhrase.charAt(0).toUpperCase() + peerPhrase.slice(1)}
              </span>
              {suffix}
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
                    width: 'min(320px, 100%)',
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
                        setCompare({
                          type: 'school',
                          id: s.ipeds_id,
                          name: s.name,
                        })
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
          </div>

          <TrajectoryChartPlot
            trajectory={data}
            compare={compare}
            overlayLine={overlayLine}
            schoolProgram={schoolTp}
          />

          <div className="trajectory-insights-row">
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#444',
                fontFamily: fonts.sans,
              }}
            >
              <TrendingUp size={16} color="#0F6E56" aria-hidden />
              <span>
                <strong style={{ fontWeight: 500 }}>{pace}/yr</strong> bracket
                pace
              </span>
            </div>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#444',
                fontFamily: fonts.sans,
              }}
            >
              <Target
                size={16}
                color={d1Delta >= 0 ? '#0F6E56' : '#854F0B'}
                aria-hidden
              />
              <span>
                <strong style={{ fontWeight: 500 }}>
                  {d1Delta >= 0
                    ? `+${d1Delta.toFixed(1)}`
                    : `−${Math.abs(d1Delta).toFixed(1)}`}
                </strong>{' '}
                {d1Delta >= 0 ? 'above' : 'from'} D1 mid-major
              </span>
            </div>
          </div>

          <div className="trajectory-progress-row">
            <div
              style={{
                flex: 1,
                height: 4,
                background: '#F0F0EC',
                borderRadius: 99,
                position: 'relative',
                overflow: 'hidden',
                minWidth: 120,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #0F6E56, #5DCAA5)',
                  borderRadius: 99,
                  transition: 'width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
              />
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#888',
                whiteSpace: 'nowrap',
                fontFamily: fonts.sans,
              }}
            >
              {Math.round(pct)}% of the way to {progressLabel}
            </div>
            {!embedded ? (
              <Link
                href="/player/recruiting/colleges"
                style={{
                  fontSize: 12,
                  color: '#0F6E56',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontFamily: fonts.sans,
                  padding: 0,
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                }}
              >
                Explore →
              </Link>
            ) : null}
          </div>

          <p
            style={{
              fontFamily: fonts.serif,
              fontSize: 11,
              fontStyle: 'italic',
              color: brand.muted,
              margin: 0,
              padding: '0 clamp(18px, 4vw, 26px) 16px',
            }}
          >
            Forecast uses bracket growth rates · Not a guarantee of recruitment
            outcomes
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
