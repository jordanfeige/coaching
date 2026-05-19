'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, isAfter, subDays } from 'date-fns'
import { useRouter } from 'next/navigation'
import {
  CartesianGrid,
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
import { ChevronDown, Loader, Sparkles } from 'lucide-react'
import type { AnalysisPDF } from '@/lib/generateAnalysisPDF'

const TEAL = 'hsl(168,62%,36%)'
const BORDER = 'hsl(30,10%,88%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'
const RED = 'hsl(0,70%,55%)'
const RED_LIGHT = 'hsl(0,70%,95%)'
const AMBER = 'hsl(38,92%,50%)'
const AMBER_LIGHT = 'hsl(38,92%,95%)'
const GREEN = 'hsl(145,60%,40%)'
const GREEN_LIGHT = 'hsl(145,60%,95%)'

type Player = {
  id: string
  name: string
  sport?: string | null
  skill_level?: string | null
  age?: number | null
  email?: string | null
}

type AnalysisIssue = {
  area?: string
  severity?: 'critical' | 'moderate' | 'minor' | string
  what_i_see?: string
  simple_cue?: string
}

type AnalysisSession = {
  id: string
  sport?: string | null
  shot_type?: string | null
  overall_score?: number | null
  rating?: string | null
  top_issue?: string | null
  biggest_win?: string | null
  checkpoint_scores?: Record<string, number> | null
  full_result?: {
    areas_to_improve?: AnalysisIssue[]
    strengths?: Array<{ area?: string; what_i_see?: string }>
    technique_notes?: string
    overall_rating?: string
    confidence?: string
    biggest_win?: string
    priority_focus?: string
  } | null
  analyzed_at: string
}

type IssueStatus = 'Persistent' | 'Improving' | 'Monitoring' | 'Fixed'

const sportEmoji: Record<string, string> = {
  tennis: '🎾',
  golf: '⛳',
  baseball: '⚾',
  basketball: '🏀',
  pickleball: '🏓',
}

function severityRank(severity?: string) {
  if (severity === 'critical') return 3
  if (severity === 'moderate') return 2
  if (severity === 'minor') return 1
  return 0
}

function cardClass(extra = '') {
  return `rounded-2xl border border-border bg-card p-5 shadow-sm ${extra}`
}

export default function PlayerAnalyticsPanel({
  player,
  sessions,
  onGenerateDrillPlan,
}: {
  player: Player
  sessions: AnalysisSession[]
  onGenerateDrillPlan: (focus?: string) => void
}) {
  const [summary, setSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(a.analyzed_at).getTime() - new Date(b.analyzed_at).getTime()),
    [sessions],
  )
  const latest = sortedSessions[sortedSessions.length - 1]
  const first = sortedSessions[0]
  const latestScore = latest?.overall_score ?? null
  const firstScore = first?.overall_score ?? null
  const totalDelta =
    typeof latestScore === 'number' && typeof firstScore === 'number'
      ? latestScore - firstScore
      : null
  const sessionsThisMonth = sortedSessions.filter(session =>
    isAfter(new Date(session.analyzed_at), subDays(new Date(), 30)),
  ).length

  const chartData = sortedSessions.map(session => ({
    date: session.analyzed_at,
    label: format(new Date(session.analyzed_at), 'MMM d'),
    score: session.overall_score ?? 0,
  }))

  const radarData = Object.entries(latest?.checkpoint_scores || {}).map(([checkpoint, score]) => ({
    checkpoint,
    score,
  }))

  const issueRows = useMemo(() => {
    const byIssue = new Map<string, { issue: string; sessions: Array<{ index: number; severity: string }> }>()
    sortedSessions.forEach((session, index) => {
      session.full_result?.areas_to_improve?.forEach(issue => {
        if (!issue.area) return
        const existing = byIssue.get(issue.area) || { issue: issue.area, sessions: [] }
        existing.sessions.push({ index, severity: issue.severity || 'moderate' })
        byIssue.set(issue.area, existing)
      })
    })

    return [...byIssue.values()].map(row => {
      const lastTwoIndexes = new Set([sortedSessions.length - 1, sortedSessions.length - 2].filter(index => index >= 0))
      const inLastTwo = row.sessions.filter(session => lastTwoIndexes.has(session.index))
      let status: IssueStatus = 'Monitoring'
      if (row.sessions.length > 1 && inLastTwo.length === 0) {
        status = 'Fixed'
      } else if (inLastTwo.some(session => session.severity === 'critical')) {
        status = 'Persistent'
      } else if (
        row.sessions.length > 1 &&
        severityRank(row.sessions[row.sessions.length - 1].severity) <
          severityRank(row.sessions[0].severity)
      ) {
        status = 'Improving'
      }
      return { ...row, count: row.sessions.length, status }
    }).sort((a, b) => {
      const order: Record<IssueStatus, number> = { Persistent: 0, Improving: 1, Monitoring: 2, Fixed: 3 }
      return order[a.status] - order[b.status]
    })
  }, [sortedSessions])

  useEffect(() => {
    let cancelled = false
    async function loadSummary() {
      if (sortedSessions.length === 0) return
      setSummaryLoading(true)
      try {
        const response = await fetch('/api/player-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player, sessions: sortedSessions }),
        })
        const data = (await response.json()) as { summary?: string }
        if (!cancelled) setSummary(data.summary || '')
      } catch {
        if (!cancelled) setSummary('Could not generate a player summary right now.')
      } finally {
        if (!cancelled) setSummaryLoading(false)
      }
    }
    loadSummary()
    return () => {
      cancelled = true
    }
  }, [player, sortedSessions])

  async function handleDownloadPDF() {
    if (!latest?.full_result) return
    setDownloading(true)
    try {
      const { AnalysisPDFDocument } = await import('@/lib/generateAnalysisPDF')
      const { pdf } = await import('@react-pdf/renderer')
      const analyzedAt = latest.analyzed_at
        ? format(new Date(latest.analyzed_at), 'MMMM d, yyyy')
        : format(new Date(), 'MMMM d, yyyy')
      const blob = await pdf(
        <AnalysisPDFDocument
          analysis={latest.full_result as AnalysisPDF}
          playerName={player.name}
          sport={latest.sport || player.sport || 'tennis'}
          shotType={latest.shot_type || undefined}
          overallScore={latest.overall_score || 0}
          analyzedAt={analyzedAt}
        />,
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `playvia-${player.name.toLowerCase().replace(/\s+/g, '-')}-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  async function handleEmailPDF() {
    if (!latest?.full_result || !player.email) return
    setEmailing(true)
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'analysis_pdf',
          to: player.email,
          playerName: player.name,
          sport: latest.sport || player.sport || 'tennis',
          shotType: latest.shot_type || undefined,
          overallScore: latest.overall_score || 0,
          analyzedAt: latest.analyzed_at
            ? format(new Date(latest.analyzed_at), 'MMMM d, yyyy')
            : format(new Date(), 'MMMM d, yyyy'),
          analysis: latest.full_result,
        }),
      })
      if (!response.ok) throw new Error('Email request failed')
      setEmailSent(true)
      window.setTimeout(() => setEmailSent(false), 3000)
    } finally {
      setEmailing(false)
    }
  }

  const quickActions = [
    {
      label: 'Analyze video',
      icon: '📹',
      primary: true,
      disabled: false,
      onClick: () => router.push(`/dashboard/video?player=${player.id}`),
    },
    {
      label: 'Schedule lesson',
      icon: '📅',
      primary: false,
      disabled: false,
      onClick: () => router.push(`/dashboard/schedule?player=${player.id}`),
    },
    {
      label: 'Generate drills',
      icon: '🏋️',
      primary: false,
      disabled: false,
      onClick: () => onGenerateDrillPlan(issueRows[0]?.issue),
    },
    {
      label: downloading ? 'Preparing PDF...' : 'Download PDF',
      icon: '📄',
      primary: false,
      disabled: !latest?.full_result || downloading,
      onClick: handleDownloadPDF,
    },
    {
      label: emailSent ? 'Email sent' : emailing ? 'Sending email...' : 'Email report',
      icon: '✉️',
      primary: false,
      disabled: !latest?.full_result || !player.email || emailing || emailSent,
      onClick: handleEmailPDF,
    },
  ]

  if (sortedSessions.length === 0) {
    return (
      <div className={cardClass('text-center')}>
        <p className="text-sm text-muted-foreground">No analyses yet for {player.name}.</p>
        <a
          href={`/dashboard/video?player=${player.id}`}
          className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Analyze video
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 24,
        }}
      >
        {quickActions.map(action => (
          <button
            key={action.label}
            onClick={action.onClick}
            disabled={action.disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: action.disabled ? 'not-allowed' : 'pointer',
              fontFamily: 'Arial, sans-serif',
              border: action.primary ? 'none' : `1px solid ${BORDER}`,
              background: action.primary ? TEAL : 'white',
              color: action.primary ? 'white' : TEXT_SEC,
              opacity: action.disabled ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
            onMouseEnter={event => {
              if (!action.primary && !action.disabled) {
                event.currentTarget.style.background = WARM_BG
                event.currentTarget.style.borderColor = TEAL
              }
            }}
            onMouseLeave={event => {
              if (!action.primary && !action.disabled) {
                event.currentTarget.style.background = 'white'
                event.currentTarget.style.borderColor = BORDER
              }
            }}
            type="button"
          >
            {downloading && action.label.includes('PDF') ? <Loader size={13} className="animate-spin" /> : <span>{action.icon}</span>}
            {action.label}
          </button>
        ))}
      </div>

      <div className={cardClass()}>
        <div className="mb-4">
          <h3 className="font-heading text-base font-semibold text-foreground">Score history</h3>
          <p className="text-xs text-muted-foreground">Technique score across saved sessions</p>
        </div>
        {chartData.length < 2 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Not enough data for a trend chart yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: TEXT_MUTED }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: TEXT_MUTED }} />
              <Tooltip
                formatter={value => [`${value}`, 'Score']}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.date
                    ? format(new Date(payload[0].payload.date), 'MMM d, yyyy')
                    : ''
                }
                contentStyle={{ borderRadius: 12, border: `1px solid ${BORDER}`, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="score" stroke={TEAL} strokeWidth={3} dot={{ r: 4, fill: TEAL }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={cardClass()}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score change</p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {firstScore ?? '—'} → {latestScore ?? '—'}
          </p>
          <p className={`mt-1 text-sm font-semibold ${totalDelta && totalDelta > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
            {totalDelta === null ? 'No trend yet' : `${totalDelta > 0 ? '+' : ''}${totalDelta} points`}
          </p>
        </div>
        <div className={cardClass()}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total sessions</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{sortedSessions.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Tracked analyses</p>
        </div>
        <div className={cardClass()}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">This month</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{sessionsThisMonth}</p>
          <p className="mt-1 text-sm text-muted-foreground">Recent sessions</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className={cardClass()}>
          <h3 className="font-heading text-base font-semibold text-foreground">Checkpoint radar</h3>
          <p className="mb-4 text-xs text-muted-foreground">Latest session checkpoint scores</p>
          {radarData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No checkpoint data saved yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={BORDER} />
                <PolarAngleAxis dataKey="checkpoint" tick={{ fontSize: 10, fill: TEXT_SEC }} />
                <Radar name="Score" dataKey="score" stroke={TEAL} fill={TEAL} fillOpacity={0.28} />
                <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${BORDER}`, fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={cardClass()}>
          <h3 className="font-heading text-base font-semibold text-foreground">Issues tracker</h3>
          <p className="mb-4 text-xs text-muted-foreground">Patterns across all sessions</p>
          {issueRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recurring issues found.</p>
          ) : (
            <div className="space-y-2">
              {issueRows.map(row => {
                const color = row.status === 'Persistent' ? RED : row.status === 'Improving' ? GREEN : row.status === 'Fixed' ? TEAL : AMBER
                const emoji = row.status === 'Persistent' ? '🔴' : row.status === 'Improving' ? '📈' : row.status === 'Fixed' ? '✅' : '👀'
                return (
                  <div key={row.issue} className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{row.issue}</p>
                      <span className="rounded-full px-2 py-1 text-[11px] font-bold" style={{ background: WARM_BG, color }}>
                        {emoji} {row.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Flagged {row.count} time{row.count === 1 ? '' : 's'}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className={cardClass()}>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <h3 className="font-heading text-base font-semibold text-foreground">AI player summary</h3>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {summaryLoading ? 'Generating player summary...' : summary || 'No summary available.'}
        </p>
      </div>

      <div className={cardClass()}>
        <h3 className="font-heading mb-4 text-base font-semibold text-foreground">Session history</h3>
        <div>
          {[...sortedSessions].reverse().map((session, index, sessionsNewestFirst) => {
            const prev = sessionsNewestFirst[index + 1]
            const delta =
              typeof session.overall_score === 'number' && typeof prev?.overall_score === 'number'
                ? session.overall_score - prev.overall_score
                : null
            const isExpanded = expandedSession === session.id
            return (
              <div
                key={session.id}
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  overflow: 'hidden',
                  marginBottom: 8,
                  background: 'white',
                }}
              >
                <div
                  onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>
                    {sportEmoji[session.sport || player.sport || ''] || '🎯'}
                  </span>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(220,20%,15%)' }}>
                      {format(new Date(session.analyzed_at), 'MMMM d, yyyy')}
                    </div>
                    {session.top_issue && (
                      <div style={{ fontSize: 11, color: TEXT_SEC, marginTop: 2 }}>
                        Top issue: {session.top_issue}
                      </div>
                    )}
                  </div>

                  {session.rating && (
                    <span
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 999,
                        fontWeight: 600,
                        background: WARM_BG,
                        border: `1px solid ${BORDER}`,
                        color: TEXT_SEC,
                        textTransform: 'capitalize',
                      }}
                    >
                      {session.rating}
                    </span>
                  )}

                  <div style={{ textAlign: 'right', minWidth: 48 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: TEAL }}>
                      {session.overall_score ?? '—'}
                    </div>
                    {delta !== null && (
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: delta > 0 ? GREEN : delta < 0 ? RED : TEXT_MUTED,
                        }}
                      >
                        {delta > 0 ? '+' : ''}{delta}
                      </div>
                    )}
                  </div>

                  <ChevronDown
                    size={16}
                    color={TEXT_MUTED}
                    style={{
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.2s',
                      flexShrink: 0,
                    }}
                  />
                </div>

                {isExpanded && session.full_result && (
                  <div
                    style={{
                      borderTop: `1px solid ${BORDER}`,
                      padding: '14px 16px',
                      background: WARM_BG,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    {session.full_result.biggest_win && (
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: GREEN_LIGHT,
                          border: '1px solid hsl(145,60%,70%)',
                          fontSize: 12,
                          color: GREEN,
                          lineHeight: 1.5,
                        }}
                      >
                        <strong>Biggest win:</strong> {session.full_result.biggest_win}
                      </div>
                    )}

                    {session.full_result.areas_to_improve?.slice(0, 2).map((issue, issueIndex) => (
                      <div
                        key={`${issue.area || 'issue'}-${issueIndex}`}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: issue.severity === 'critical' ? RED_LIGHT : AMBER_LIGHT,
                          border: `1px solid ${
                            issue.severity === 'critical'
                              ? 'hsl(0,70%,75%)'
                              : 'hsl(38,92%,70%)'
                          }`,
                          fontSize: 12,
                          color: issue.severity === 'critical' ? RED : AMBER,
                          lineHeight: 1.5,
                        }}
                      >
                        <strong>{issue.area}:</strong> {issue.what_i_see}
                        {issue.simple_cue && (
                          <span
                            style={{
                              marginLeft: 8,
                              padding: '1px 6px',
                              background: 'rgba(255,255,255,0.6)',
                              borderRadius: 4,
                              fontSize: 11,
                            }}
                          >
                            Cue: &quot;{issue.simple_cue}&quot;
                          </span>
                        )}
                      </div>
                    ))}

                    {session.full_result.priority_focus && (
                      <div
                        style={{
                          fontSize: 12,
                          color: TEXT_SEC,
                          fontStyle: 'italic',
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: 'white',
                          border: `1px solid ${BORDER}`,
                        }}
                      >
                        <strong style={{ color: 'hsl(220,20%,15%)', fontStyle: 'normal' }}>
                          Priority:
                        </strong>{' '}
                        {session.full_result.priority_focus}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
