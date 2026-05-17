'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'

type WaitlistEntry = {
  id: string
  email: string
  sport: string | null
  source: string | null
  created_at: string
}

type RecentSignup = {
  id: string
  email: string | null
  sport: string | null
  analyses_used: number
  created_at: string | null
}

type GrowthStats = {
  totalSignups: number
  signupsThisWeek: number
  totalAnalysesRun: number
  waitlistCount: number
  analysesToday: number
}

type SportsBreakdown = {
  tennis: number
  golf: number
  baseball: number
  basketball: number
}

const emptyStats: GrowthStats = {
  totalSignups: 0,
  signupsThisWeek: 0,
  totalAnalysesRun: 0,
  waitlistCount: 0,
  analysesToday: 0,
}

const emptySportsBreakdown: SportsBreakdown = {
  tennis: 0,
  golf: 0,
  baseball: 0,
  basketball: 0,
}

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [recentSignups, setRecentSignups] = useState<RecentSignup[]>([])
  const [stats, setStats] = useState<GrowthStats>(emptyStats)
  const [sportsBreakdown, setSportsBreakdown] = useState<SportsBreakdown>(emptySportsBreakdown)
  const [waitlistAvailable, setWaitlistAvailable] = useState(true)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/waitlist')
        const payload = await response.json()
        if (!response.ok || payload.error) throw new Error(payload.error || 'Could not load waitlist')
        setEntries(payload.entries || [])
        setRecentSignups(payload.recentSignups || [])
        setStats(payload.stats || emptyStats)
        setSportsBreakdown(payload.sportsBreakdown || emptySportsBreakdown)
        setWaitlistAvailable(payload.waitlistAvailable !== false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load waitlist')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function copyAllEmails() {
    await navigator.clipboard.writeText(entries.map(entry => entry.email).join(', '))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const statCards = [
    ['Total signups', stats.totalSignups],
    ['Signups this week', stats.signupsThisWeek],
    ['Total analyses run', stats.totalAnalysesRun],
    ['Waitlist count', stats.waitlistCount],
    ['Analyses today', stats.analysesToday],
  ]

  const sportRows = [
    ['🎾 Tennis', sportsBreakdown.tennis],
    ['⛳ Golf', sportsBreakdown.golf],
    ['⚾ Baseball', sportsBreakdown.baseball],
    ['🏀 Basketball', sportsBreakdown.basketball],
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Growth</p>
        <h1 className="font-heading mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Growth dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signups, analysis usage, and Pro launch interest.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!waitlistAvailable && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Waitlist table not found yet. Run the SQL comment in <code>src/app/api/waitlist/route.ts</code> to enable waitlist capture.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="font-heading mt-2 text-3xl font-bold text-foreground">{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-heading text-sm font-semibold text-foreground">Recent signups</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Sport</th>
                  <th className="px-5 py-3 font-semibold">Analyses used</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : recentSignups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">No player signups yet.</td>
                  </tr>
                ) : (
                  recentSignups.map(signup => (
                    <tr key={signup.id} className="border-b border-border last:border-b-0">
                      <td className="px-5 py-4 font-medium text-foreground">{signup.email || '—'}</td>
                      <td className="px-5 py-4 text-muted-foreground">{signup.sport || '—'}</td>
                      <td className="px-5 py-4 text-muted-foreground">{signup.analyses_used}</td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {signup.created_at ? format(new Date(signup.created_at), 'MMM d, yyyy') : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-heading text-sm font-semibold text-foreground">Sports breakdown</h2>
          <div className="mt-4 space-y-3">
            {sportRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
                <span className="text-sm font-medium text-foreground">{label}</span>
                <span className="text-sm font-bold text-primary">{value} users</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-heading text-sm font-semibold text-foreground">Waitlist</h2>
          <button
            type="button"
            onClick={copyAllEmails}
            disabled={entries.length === 0}
            className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary disabled:opacity-50"
          >
            {copied ? 'Copied!' : 'Copy all emails'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Sport</th>
                <th className="px-5 py-3 font-semibold">Source</th>
                <th className="px-5 py-3 font-semibold">Date joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                    {waitlistAvailable ? 'No waitlist signups yet.' : 'Waitlist table is not available yet.'}
                  </td>
                </tr>
              ) : (
                entries.map(entry => (
                  <tr key={entry.id} className="border-b border-border last:border-b-0">
                    <td className="px-5 py-4 font-medium text-foreground">{entry.email}</td>
                    <td className="px-5 py-4 text-muted-foreground">{entry.sport || '—'}</td>
                    <td className="px-5 py-4 text-muted-foreground">{entry.source || 'pricing'}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
