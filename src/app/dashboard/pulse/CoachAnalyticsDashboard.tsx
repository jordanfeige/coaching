'use client'

import { useMemo, useState } from 'react'
import { format, isAfter, subDays } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertCircle,
  Award,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'

interface Player {
  id: string
  name: string | null
  sport: string | null
  skill_level: string | null
  age: number | null
}

interface AnalysisIssue {
  area?: string
}

interface AnalysisResult {
  areas_to_improve?: Array<string | AnalysisIssue>
}

interface AnalysisSession {
  id?: string
  user_id?: string | null
  player_id?: string | null
  sport?: string | null
  analyzed_at?: string | null
  overall_score?: number | null
  top_issue?: string | null
  biggest_win?: string | null
  rating?: string | null
  full_result?: AnalysisResult | null
}

interface Props {
  players: Player[]
  sessions: AnalysisSession[]
  userSessions: AnalysisSession[]
}

interface PlayerSummary extends Player {
  sessions: number
  latestScore: number | null
  firstScore: number | null
  previousScore?: number | null
  trend: number
  totalImprovement: number
  topIssue: string | null
  biggestWin: string | null
  lastAnalyzed: string | null
  rating: string | null
  allSessions: AnalysisSession[]
}

const TEAL = 'hsl(168,62%,36%)'
const TEAL_LIGHT = 'hsl(168,62%,95%)'
const WARM_BG = 'hsl(40,20%,97%)'
const CARD = 'white'
const BORDER = 'hsl(30,10%,88%)'
const TEXT = 'hsl(220,20%,15%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const RED = 'hsl(0,70%,55%)'
const AMBER = 'hsl(38,92%,50%)'
const GREEN = 'hsl(145,60%,40%)'

const sportEmoji: Record<string, string> = {
  tennis: '🎾',
  golf: '⛳',
  baseball: '⚾',
  basketball: '🏀',
  pickleball: '🏓',
}

const scoreColors = [TEAL, '#185FA5', '#854F0B', '#534AB7', '#993C1D']

function getScore(session: AnalysisSession) {
  return typeof session.overall_score === 'number' ? session.overall_score : 0
}

function getSportLabel(sport: string | null | undefined) {
  if (!sport) return 'Unknown'
  return `${sportEmoji[sport] ?? ''} ${sport}`.trim()
}

function getPlayerName(player: Player) {
  return player.name || 'Unnamed player'
}

export default function CoachAnalyticsDashboard({
  players,
  sessions,
  userSessions,
}: Props) {
  const [selectedSport, setSelectedSport] = useState('all')
  const [selectedPlayer, setSelectedPlayer] = useState('all')
  const [timeRange, setTimeRange] = useState(30)
  const [now] = useState(() => new Date())

  const allSessions = useMemo(
    () => [...sessions, ...userSessions],
    [sessions, userSessions],
  )

  const filteredSessions = useMemo(() => {
    const cutoff = subDays(now, timeRange)
    return allSessions.filter(session => {
      const analyzedAt = session.analyzed_at
      if (!analyzedAt || !isAfter(new Date(analyzedAt), cutoff)) return false

      return (
        (selectedSport === 'all' || session.sport === selectedSport) &&
        (selectedPlayer === 'all' ||
          session.player_id === selectedPlayer ||
          session.user_id === selectedPlayer)
      )
    })
  }, [allSessions, now, selectedPlayer, selectedSport, timeRange])

  const playerSummaries = useMemo<PlayerSummary[]>(() => {
    return players
      .map(player => {
        const playerSessions = allSessions
          .filter(session => session.player_id === player.id)
          .sort(
            (a, b) =>
              new Date(a.analyzed_at ?? 0).getTime() -
              new Date(b.analyzed_at ?? 0).getTime(),
          )

        if (playerSessions.length === 0) {
          return {
            ...player,
            sessions: 0,
            latestScore: null,
            firstScore: null,
            trend: 0,
            totalImprovement: 0,
            topIssue: null,
            biggestWin: null,
            lastAnalyzed: null,
            rating: null,
            allSessions: [],
          }
        }

        const latest = playerSessions[playerSessions.length - 1]
        const first = playerSessions[0]
        const previous = playerSessions[playerSessions.length - 2]
        const latestScore = getScore(latest)
        const firstScore = getScore(first)
        const previousScore = previous ? getScore(previous) : latestScore

        return {
          ...player,
          sessions: playerSessions.length,
          latestScore,
          firstScore,
          previousScore,
          trend: latestScore - previousScore,
          totalImprovement: latestScore - firstScore,
          topIssue: latest.top_issue ?? null,
          biggestWin: latest.biggest_win ?? null,
          lastAnalyzed: latest.analyzed_at ?? null,
          rating: latest.rating ?? null,
          allSessions: playerSessions,
        }
      })
      .filter(player => player.latestScore !== null)
  }, [players, allSessions])

  const visiblePlayerSummaries = useMemo(() => {
    return playerSummaries.filter(player => {
      const matchesSport =
        selectedSport === 'all' ||
        player.sport === selectedSport ||
        player.allSessions.some(session => session.sport === selectedSport)
      const matchesPlayer = selectedPlayer === 'all' || player.id === selectedPlayer
      return matchesSport && matchesPlayer
    })
  }, [playerSummaries, selectedPlayer, selectedSport])

  const commonIssues = useMemo(() => {
    const issueCounts: Record<string, number> = {}

    filteredSessions.forEach(session => {
      if (session.top_issue) {
        issueCounts[session.top_issue] = (issueCounts[session.top_issue] ?? 0) + 1
      }

      session.full_result?.areas_to_improve?.forEach(issue => {
        const area = typeof issue === 'string' ? issue : issue.area
        if (area) issueCounts[area] = (issueCounts[area] ?? 0) + 1
      })
    })

    return Object.entries(issueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([issue, count]) => ({ issue, count }))
  }, [filteredSessions])

  const sports = useMemo(() => {
    return Array.from(
      new Set(
        allSessions
          .map(session => session.sport)
          .concat(players.map(player => player.sport))
          .filter((sport): sport is string => Boolean(sport)),
      ),
    ).sort()
  }, [allSessions, players])

  const scoreDistribution = useMemo(() => {
    const bands = [
      { range: '0-49', min: 0, max: 49, count: 0 },
      { range: '50-64', min: 50, max: 64, count: 0 },
      { range: '65-79', min: 65, max: 79, count: 0 },
      { range: '80-100', min: 80, max: 100, count: 0 },
    ]

    filteredSessions.forEach(session => {
      const score = getScore(session)
      const band = bands.find(item => score >= item.min && score <= item.max)
      if (band) band.count += 1
    })

    return bands.map(({ range, count }) => ({ range, count }))
  }, [filteredSessions])

  const sportBreakdown = useMemo(() => {
    const sportCounts: Record<string, number> = {}

    filteredSessions.forEach(session => {
      const sport = session.sport || 'unknown'
      sportCounts[sport] = (sportCounts[sport] ?? 0) + 1
    })

    return Object.entries(sportCounts).map(([sport, count]) => ({
      sport: getSportLabel(sport),
      sessions: count,
    }))
  }, [filteredSessions])

  const totalSessions = filteredSessions.length
  const avgScore =
    totalSessions > 0
      ? Math.round(
          filteredSessions.reduce((acc, session) => acc + getScore(session), 0) /
            totalSessions,
        )
      : 0
  const mostImproved = [...visiblePlayerSummaries].sort(
    (a, b) => b.totalImprovement - a.totalImprovement,
  )[0]
  const needsAttention = visiblePlayerSummaries.filter(
    player => player.trend < -5 || (player.latestScore !== null && player.latestScore < 55),
  )

  const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16 }

  return (
    <div style={{ color: TEXT, fontFamily: 'Arial, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Analytics</h1>
        <p style={{ fontSize: 14, color: TEXT_SEC, marginTop: 4 }}>
          Technique trends and performance insights across your roster
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[7, 30, 90].map(days => (
          <button
            key={days}
            onClick={() => setTimeRange(days)}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              border: `1px solid ${timeRange === days ? TEAL : BORDER}`,
              background: timeRange === days ? TEAL_LIGHT : CARD,
              color: timeRange === days ? TEAL : TEXT_SEC,
              cursor: 'pointer',
            }}
            type="button"
          >
            Last {days} days
          </button>
        ))}
        <select
          onChange={event => setSelectedSport(event.target.value)}
          value={selectedSport}
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 12,
            border: `1px solid ${BORDER}`,
            background: CARD,
            color: TEXT,
          }}
        >
          <option value="all">All sports</option>
          {sports.map(sport => (
            <option key={sport} value={sport}>
              {getSportLabel(sport)}
            </option>
          ))}
        </select>
        <select
          onChange={event => setSelectedPlayer(event.target.value)}
          value={selectedPlayer}
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 12,
            border: `1px solid ${BORDER}`,
            background: CARD,
            color: TEXT,
          }}
        >
          <option value="all">All players</option>
          {players.map(player => (
            <option key={player.id} value={player.id}>
              {getPlayerName(player)}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: 'Players with reels',
            value: visiblePlayerSummaries.length,
            icon: <Users size={18} />,
            color: TEAL,
          },
          {
            label: 'Total sessions',
            value: totalSessions,
            icon: <Target size={18} />,
            color: '#185FA5',
          },
          {
            label: 'Avg technique score',
            value: avgScore,
            icon: <Award size={18} />,
            color: '#854F0B',
          },
          {
            label: 'Need attention',
            value: needsAttention.length,
            icon: <AlertCircle size={18} />,
            color: RED,
          },
        ].map(stat => (
          <div key={stat.label} style={{ ...card, padding: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 12, color: TEXT_SEC }}>{stat.label}</span>
              <span style={{ color: stat.color }}>{stat.icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ ...card, padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>
            Player scorecard
          </h2>
          {visiblePlayerSummaries.length === 0 ? (
            <p style={{ fontSize: 13, color: TEXT_SEC }}>No players have been analyzed yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...visiblePlayerSummaries]
                .sort((a, b) => (b.latestScore ?? 0) - (a.latestScore ?? 0))
                .map(player => (
                  <div
                    key={player.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: WARM_BG,
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: TEAL_LIGHT,
                        color: TEAL,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {player.name?.charAt(0) || '?'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>
                        {getPlayerName(player)}
                      </div>
                      <div style={{ fontSize: 11, color: TEXT_SEC }}>
                        {getSportLabel(player.sport)} · {player.sessions} session
                        {player.sessions !== 1 ? 's' : ''}
                        {player.lastAnalyzed &&
                          ` · ${format(new Date(player.lastAnalyzed), 'MMM d')}`}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: TEAL }}>
                        {player.latestScore}
                      </div>
                      {player.trend !== 0 && (
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: player.trend > 0 ? GREEN : RED,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            justifyContent: 'flex-end',
                          }}
                        >
                          {player.trend > 0 ? (
                            <TrendingUp size={12} />
                          ) : (
                            <TrendingDown size={12} />
                          )}
                          {player.trend > 0 ? '+' : ''}
                          {player.trend}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div style={{ ...card, padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>
            Most common issues
          </h2>
          <p style={{ fontSize: 12, color: TEXT_SEC, margin: '0 0 16px' }}>
            Technique areas flagged most across your roster
          </p>
          {commonIssues.length === 0 ? (
            <p style={{ fontSize: 13, color: TEXT_SEC }}>No issues data yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {commonIssues.map(({ issue, count }, index) => (
                <div key={issue}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: TEXT,
                        fontWeight: index === 0 ? 700 : 400,
                      }}
                    >
                      {index === 0 && '⚠️ '}
                      {issue}
                    </span>
                    <span style={{ fontSize: 11, color: TEXT_SEC, whiteSpace: 'nowrap' }}>
                      {count} time{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: BORDER }}>
                    <div
                      style={{
                        height: 4,
                        borderRadius: 2,
                        background: index === 0 ? RED : index <= 2 ? AMBER : TEAL,
                        width: `${(count / commonIssues[0].count) * 100}%`,
                        transition: 'width 0.5s',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {commonIssues.length > 0 && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 10,
                background: TEAL_LIGHT,
                border: '1px solid hsl(168,62%,70%)',
              }}
            >
              <p style={{ fontSize: 12, color: TEAL, margin: 0 }}>
                <strong>Coach insight:</strong> &quot;{commonIssues[0].issue}&quot; is your
                roster&apos;s most common issue. Consider adding a dedicated group drill for
                this in your next session.
              </p>
            </div>
          )}
        </div>
      </div>

      {visiblePlayerSummaries.length > 0 && (
        <div style={{ ...card, padding: 20, marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>
            Score trends
          </h2>
          <p style={{ fontSize: 12, color: TEXT_SEC, margin: '0 0 16px' }}>
            Technique score over time for the top roster entries
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: TEXT_SEC }}
                tickFormatter={value => format(new Date(value), 'MMM d')}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: TEXT_SEC }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: `1px solid ${BORDER}`,
                  fontSize: 12,
                  fontFamily: 'Arial, sans-serif',
                }}
              />
              <Legend />
              {visiblePlayerSummaries.slice(0, 5).map((player, index) => (
                <Line
                  key={player.id}
                  data={player.allSessions.map(session => ({
                    date: session.analyzed_at,
                    score: getScore(session),
                  }))}
                  type="monotone"
                  dataKey="score"
                  name={getPlayerName(player)}
                  stroke={scoreColors[index % scoreColors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {filteredSessions.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ ...card, padding: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>
              Score distribution
            </h2>
            <p style={{ fontSize: 12, color: TEXT_SEC, margin: '0 0 16px' }}>
              Session count by technique score band
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: TEXT_SEC }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: TEXT_SEC }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: `1px solid ${BORDER}`,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill={TEAL} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {sportBreakdown.length > 0 && (
            <div style={{ ...card, padding: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>
                Roster mix
              </h2>
              <p style={{ fontSize: 12, color: TEXT_SEC, margin: '0 0 16px' }}>
                Reels by sport
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={sportBreakdown}>
                  <PolarGrid stroke={BORDER} />
                  <PolarAngleAxis dataKey="sport" tick={{ fontSize: 11, fill: TEXT_SEC }} />
                  <Radar
                    name="Sessions"
                    dataKey="sessions"
                    stroke={TEAL}
                    fill={TEAL}
                    fillOpacity={0.25}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: `1px solid ${BORDER}`,
                      fontSize: 12,
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {mostImproved && mostImproved.totalImprovement > 0 && (
          <div style={{ ...card, padding: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>
              🏆 Most improved
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: TEAL_LIGHT,
                  color: TEAL,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {mostImproved.name?.charAt(0) || '?'}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  {getPlayerName(mostImproved)}
                </div>
                <div style={{ fontSize: 12, color: TEXT_SEC }}>
                  {getSportLabel(mostImproved.sport)}
                </div>
                <div style={{ fontSize: 13, color: GREEN, fontWeight: 600, marginTop: 4 }}>
                  +{mostImproved.totalImprovement} points ({mostImproved.firstScore} →{' '}
                  {mostImproved.latestScore})
                </div>
              </div>
            </div>
          </div>
        )}

        {needsAttention.length > 0 && (
          <div style={{ ...card, padding: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>
              ⚠️ Needs attention
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {needsAttention.slice(0, 3).map(player => (
                <div
                  key={player.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>
                      {getPlayerName(player)}
                    </div>
                    <div style={{ fontSize: 11, color: TEXT_SEC }}>
                      {player.topIssue || 'Check recent analysis'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: RED }}>
                      {player.latestScore}
                    </div>
                    {player.trend < 0 && (
                      <div style={{ fontSize: 11, color: RED }}>{player.trend} pts</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
