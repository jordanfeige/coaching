'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, isAfter, subDays } from 'date-fns'
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
import { Download, Sparkles } from 'lucide-react'
import PDFExportButton from '@/components/PDFExportButton'

const TEAL = 'hsl(168,62%,36%)'
const BORDER = 'hsl(30,10%,88%)'
const TEXT_SEC = 'hsl(220,10%,45%)'
const TEXT_MUTED = 'hsl(220,10%,65%)'
const WARM_BG = 'hsl(40,20%,97%)'
const RED = 'hsl(0,70%,55%)'
const AMBER = 'hsl(38,92%,50%)'
const GREEN = 'hsl(145,60%,40%)'

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
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)
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
        <div className="space-y-2">
          {[...sortedSessions].reverse().map((session, index, arr) => {
            const previous = arr[index + 1]
            const delta =
              typeof session.overall_score === 'number' && typeof previous?.overall_score === 'number'
                ? session.overall_score - previous.overall_score
                : null
            const expanded = expandedSessionId === session.id
            return (
              <div key={session.id} className="rounded-xl border border-border bg-muted/20">
                <button
                  type="button"
                  onClick={() => setExpandedSessionId(expanded ? null : session.id)}
                  className="w-full px-4 py-3 text-left"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {sportEmoji[session.sport || player.sport || ''] || ''} {format(new Date(session.analyzed_at), 'MMM d, yyyy')}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{session.top_issue || 'No top issue recorded'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.rating && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{session.rating}</span>}
                      <span className="text-lg font-black" style={{ color: TEAL }}>{session.overall_score ?? '—'}</span>
                      {delta !== null && <span className="text-xs font-bold" style={{ color: delta >= 0 ? GREEN : RED }}>{delta >= 0 ? '+' : ''}{delta}</span>}
                    </div>
                  </div>
                </button>
                {expanded && (
                  <div className="border-t border-border px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {session.full_result?.technique_notes || session.biggest_win || 'No detailed summary saved.'}
                    </p>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-primary">
                        View full analysis
                      </summary>
                      <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-background p-3 text-xs text-muted-foreground">
                        {JSON.stringify(session.full_result || {}, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <a href={`/dashboard/video?player=${player.id}`} className="rounded-xl bg-primary px-3 py-2 text-center text-sm font-bold text-primary-foreground">
          Analyze video
        </a>
        <a href={`/dashboard/schedule?player=${player.id}`} className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-center text-sm font-semibold text-primary">
          Schedule lesson
        </a>
        <button type="button" onClick={() => onGenerateDrillPlan(issueRows[0]?.issue)} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground">
          Generate drill plan
        </button>
        {latest?.full_result ? (
          <PDFExportButton
            analysis={latest.full_result}
            playerName={player.name}
            sport={latest.sport || player.sport || 'tennis'}
            shotType={latest.shot_type || undefined}
            overallScore={latest.overall_score || 0}
            playerEmail={player.email || undefined}
          />
        ) : (
          <button type="button" className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted-foreground">
            <Download className="mr-1 inline size-3" />
            Export PDF report
          </button>
        )}
      </div>
    </div>
  )
}
