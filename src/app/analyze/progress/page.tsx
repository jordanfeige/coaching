'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Lock, Video } from 'lucide-react'
import {
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
import { createClient } from '@/lib/supabase'
import { SmartBrandMark } from '@/components/brand/SmartBrandMark'

type Sport = 'all' | 'tennis' | 'golf' | 'baseball' | 'basketball' | 'pickleball'
type Severity = 'critical' | 'moderate' | 'minor'

type AnalysisIssue = {
  area?: string
  severity?: Severity
  what_i_see?: string
  consequence?: string
}

type AnalysisResult = {
  areas_to_improve?: Array<AnalysisIssue | string>
}

type AnalysisSession = {
  id: string
  sport: string
  shot_type: string | null
  overall_score: number | null
  rating: string | null
  top_issue: string | null
  biggest_win: string | null
  checkpoint_scores: Record<string, number> | null
  full_result: AnalysisResult | null
  video_id: string | null
  analyzed_at: string
}

type IssueStatus = 'Persistent' | 'Improving' | 'Fixed' | 'Monitoring'

type IssueSummary = {
  area: string
  count: number
  status: IssueStatus
  lastSeenIndexFromNewest: number
}

const TEAL = 'hsl(168, 62%, 36%)'
const WARM_BG = 'hsl(40, 20%, 97%)'
const SPORTS: Array<{ value: Sport; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'golf', label: 'Golf' },
  { value: 'baseball', label: 'Baseball' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'pickleball', label: 'Pickleball' },
]
const SPORT_EMOJI: Record<string, string> = {
  tennis: '🎾',
  golf: '⛳',
  baseball: '⚾',
  basketball: '🏀',
  pickleball: '🏓',
}
const STATUS_ORDER: Record<IssueStatus, number> = {
  Persistent: 0,
  Improving: 1,
  Fixed: 2,
  Monitoring: 3,
}
const SEVERITY_RANK: Record<string, number> = {
  minor: 1,
  moderate: 2,
  critical: 3,
}

function cardClass(extra = '') {
  return `rounded-3xl border border-border bg-card p-5 shadow-sm ${extra}`
}

function issueArea(issue: AnalysisIssue | string) {
  return typeof issue === 'string' ? issue : issue.area || 'Technique issue'
}

function issueSeverity(issue: AnalysisIssue | string) {
  return typeof issue === 'string' ? 'moderate' : issue.severity || 'moderate'
}

function weekKey(date: Date) {
  const day = date.getDay()
  const diff = (day + 6) % 7
  const monday = new Date(date)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - diff)
  return monday.toISOString().slice(0, 10)
}

function currentStreak(sessions: AnalysisSession[]) {
  if (!sessions.length) return 0
  const weeks = new Set(sessions.map(session => weekKey(new Date(session.analyzed_at))))
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  let streak = 0

  while (weeks.has(weekKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 7)
  }

  return streak
}

function issueStatus(records: Array<{ sessionIndex: number; severity: string }>, sessionCount: number): IssueStatus {
  const inMostRecent = records.some(record => record.sessionIndex === sessionCount - 1)
  const inPrevious = records.some(record => record.sessionIndex === sessionCount - 2)
  const lastTwoCritical = [sessionCount - 1, sessionCount - 2].every(index =>
    records.some(record => record.sessionIndex === index && record.severity === 'critical')
  )

  if (lastTwoCritical) return 'Persistent'
  if (!inMostRecent && !inPrevious && records.length > 0) return 'Fixed'
  if (records.length === 1) return 'Monitoring'

  const first = records[0]
  const latest = records[records.length - 1]
  if ((SEVERITY_RANK[latest.severity] || 2) < (SEVERITY_RANK[first.severity] || 2)) return 'Improving'
  return inMostRecent ? 'Persistent' : 'Monitoring'
}

function aggregateIssues(sessions: AnalysisSession[]): IssueSummary[] {
  const map = new Map<string, Array<{ sessionIndex: number; severity: string }>>()

  sessions.forEach((session, sessionIndex) => {
    const issues = Array.isArray(session.full_result?.areas_to_improve)
      ? session.full_result.areas_to_improve
      : []

    for (const issue of issues) {
      const area = issueArea(issue)
      const records = map.get(area) || []
      records.push({ sessionIndex, severity: issueSeverity(issue) })
      map.set(area, records)
    }
  })

  return [...map.entries()]
    .map(([area, records]) => {
      const lastSeenIndex = Math.max(...records.map(record => record.sessionIndex))
      return {
        area,
        count: records.length,
        status: issueStatus(records, sessions.length),
        lastSeenIndexFromNewest: sessions.length - 1 - lastSeenIndex,
      }
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.count - a.count)
}

function statusLabel(summary: IssueSummary) {
  if (summary.status === 'Fixed') return '✅ Fixed'
  if (summary.status === 'Improving') return '📈 Improving'
  if (summary.status === 'Persistent') return '🔴 Persistent'
  return '🟡 Monitoring'
}

function lastSeenLabel(indexFromNewest: number) {
  if (indexFromNewest === 0) return 'Most recent session'
  if (indexFromNewest === 1) return '1 session ago'
  return `${indexFromNewest} sessions ago`
}

export default function ProgressPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [sessions, setSessions] = useState<AnalysisSession[]>([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [sportFilter, setSportFilter] = useState<Sport>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProgress() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const [{ data: profile }, { data, error }] = await Promise.all([
        supabase.from('profiles').select('is_subscribed').eq('id', user.id).maybeSingle(),
        supabase
          .from('analysis_sessions')
          .select('id, sport, shot_type, overall_score, rating, top_issue, biggest_win, checkpoint_scores, full_result, video_id, analyzed_at')
          .eq('user_id', user.id)
          .order('analyzed_at', { ascending: true }),
      ])

      if (error || !data?.length) {
        router.replace('/analyze?message=Run%20your%20first%20analysis%20to%20start%20tracking%20progress.')
        return
      }

      setIsSubscribed(Boolean(profile?.is_subscribed))
      setSessions(data as AnalysisSession[])
      setLoading(false)
    }

    queueMicrotask(() => {
      void loadProgress()
    })
  }, [router, supabase])

  const filteredSessions = useMemo(
    () => sportFilter === 'all' ? sessions : sessions.filter(session => session.sport === sportFilter),
    [sessions, sportFilter]
  )

  const chartData = useMemo(
    () => filteredSessions.map((session, index) => ({
      index,
      date: format(new Date(session.analyzed_at), 'MMM d'),
      score: session.overall_score ?? 0,
      topIssue: session.top_issue || 'Technique report',
      locked: !isSubscribed && index >= 3,
    })),
    [filteredSessions, isSubscribed]
  )

  const scoreStats = useMemo(() => {
    const scores = filteredSessions.map(session => session.overall_score).filter((score): score is number => typeof score === 'number')
    const avg = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0
    const best = scores.length ? Math.max(...scores) : 0
    return { scores, avg, best }
  }, [filteredSessions])

  const radarData = useMemo(() => {
    const first = filteredSessions[0]?.checkpoint_scores || {}
    const latest = filteredSessions[filteredSessions.length - 1]?.checkpoint_scores || {}
    const keys = Array.from(new Set([...Object.keys(first), ...Object.keys(latest)]))
    return keys.map(key => ({
      checkpoint: key,
      latest: latest[key] ?? 0,
      first: first[key] ?? 0,
    }))
  }, [filteredSessions])

  const issues = useMemo(() => aggregateIssues(filteredSessions), [filteredSessions])
  const newestSessions = useMemo(() => [...filteredSessions].reverse(), [filteredSessions])
  const lockedStartPercent = filteredSessions.length > 3 ? `${(3 / filteredSessions.length) * 100}%` : '100%'
  const firstScore = scoreStats.scores[0] ?? 0
  const latestScore = scoreStats.scores[scoreStats.scores.length - 1] ?? 0
  const scoreChange = latestScore - firstScore

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading progress…
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: WARM_BG }}>
      <nav className="border-b border-border bg-background/95 px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <SmartBrandMark variant="sidebar" />
          <Link href="/analyze" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            New analysis
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        <section className="space-y-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-5xl">Your Progress</h1>
            <p className="mt-2 text-sm text-muted-foreground">Technique score over time</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {SPORTS.map(sport => (
              <button
                key={sport.value}
                type="button"
                onClick={() => setSportFilter(sport.value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  sportFilter === sport.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                }`}
              >
                {sport.label}
              </button>
            ))}
          </div>
        </section>

        <section className={cardClass()}>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Sessions: {filteredSessions.length}</span>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-foreground">Avg score: {scoreStats.avg}</span>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-foreground">Best score: {scoreStats.best}</span>
          </div>

          {filteredSessions.length < 2 ? (
            <div className="flex h-72 items-center justify-center rounded-2xl bg-muted/30 text-sm text-muted-foreground">
              Keep analyzing to see your trend
            </div>
          ) : (
            <div className="relative h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 88%)" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value) => [`${value}`, 'Score']}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload
                      return item ? `${item.date} · ${item.topIssue}` : ''
                    }}
                  />
                  <Line type="monotone" dataKey="score" stroke={TEAL} strokeWidth={3} dot={{ r: 5, fill: TEAL }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
              {!isSubscribed && filteredSessions.length > 3 && (
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 rounded-r-2xl bg-background/55 backdrop-blur-[2px]"
                  style={{ left: lockedStartPercent }}
                />
              )}
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className={cardClass()}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Score change</p>
            <p className="mt-2 font-heading text-2xl font-bold text-foreground">
              {firstScore} → {latestScore} ({scoreChange >= 0 ? '+' : ''}{scoreChange} points)
            </p>
          </div>
          <div className={cardClass()}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Total sessions</p>
            <p className="mt-2 font-heading text-2xl font-bold text-foreground">{filteredSessions.length} analyses</p>
          </div>
          <div className={cardClass()}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Current streak</p>
            <p className="mt-2 font-heading text-2xl font-bold text-foreground">{currentStreak(filteredSessions)} weeks in a row</p>
          </div>
        </section>

        <section className={cardClass()}>
          <h2 className="font-heading text-xl font-bold text-foreground">Checkpoint Radar</h2>
          {radarData.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Run another analysis to build checkpoint scores.</p>
          ) : (
            <div className="mt-4 h-96">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="checkpoint" tick={{ fontSize: 11 }} />
                  <Radar name="Latest session" dataKey="latest" stroke={TEAL} fill={TEAL} fillOpacity={0.28} />
                  {filteredSessions.length > 1 && (
                    <Radar name="First session" dataKey="first" stroke="#94a3b8" fill="transparent" strokeDasharray="5 5" />
                  )}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className={cardClass()}>
          <h2 className="font-heading text-xl font-bold text-foreground">Technique Issues</h2>
          <div className="mt-4 space-y-3">
            {issues.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recurring issues yet.</p>
            ) : (
              issues.map(issue => (
                <div key={issue.area} className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{issue.area}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Last seen: {lastSeenLabel(issue.lastSeenIndexFromNewest)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-background px-3 py-1 text-xs font-bold text-muted-foreground">Times flagged: {issue.count}</span>
                    <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-foreground">{statusLabel(issue)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className={cardClass()}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-xl font-bold text-foreground">Session History</h2>
            {!isSubscribed && filteredSessions.length > 3 && (
              <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                Upgrade to unlock full history
              </div>
            )}
          </div>
          <div className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {newestSessions.map(session => {
              const originalIndex = filteredSessions.findIndex(item => item.id === session.id)
              const locked = !isSubscribed && originalIndex >= 3
              const previous = originalIndex > 0 ? filteredSessions[originalIndex - 1]?.overall_score : null
              const delta = typeof previous === 'number' && typeof session.overall_score === 'number'
                ? session.overall_score - previous
                : null
              const expanded = expandedId === session.id

              return (
                <div key={session.id} className="relative bg-card">
                  {locked && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                      <div className="rounded-2xl border border-primary/20 bg-card p-4 text-center shadow-sm">
                        <Lock className="mx-auto mb-2 size-5 text-primary" />
                        <p className="text-sm font-semibold text-foreground">Upgrade to Pro to see your full history and unlimited tracking</p>
                        <Link href="/pricing" className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
                          Upgrade
                        </Link>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : session.id)}
                    className={`w-full p-4 text-left ${locked ? 'blur-sm' : ''}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {format(new Date(session.analyzed_at), 'MMM d, yyyy')} · {SPORT_EMOJI[session.sport] || '🎯'}{' '}
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">{session.rating || 'rated'}</span>
                          {session.video_id && <Video className="ml-2 inline size-4 text-muted-foreground" />}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{session.top_issue || 'Technique report'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-heading text-2xl font-black text-primary">{session.overall_score ?? 0}</p>
                        {typeof delta === 'number' && (
                          <p className={delta >= 0 ? 'text-xs font-bold text-primary' : 'text-xs font-bold text-destructive'}>
                            {delta >= 0 ? '↑' : '↓'} {delta >= 0 ? '+' : ''}{delta}
                          </p>
                        )}
                      </div>
                    </div>
                    {expanded && (
                      <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                        {session.biggest_win && (
                          <p><span className="font-semibold text-foreground">Biggest win: </span>{session.biggest_win}</p>
                        )}
                        {session.top_issue && (
                          <p className="mt-2"><span className="font-semibold text-foreground">Top issue: </span>{session.top_issue}</p>
                        )}
                      </div>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
