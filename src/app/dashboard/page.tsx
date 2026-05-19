'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { CalendarDays, Users, Video, Clock, ArrowRight, CheckCircle2, Circle, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'

export default function DashboardPage() {
  const [lessons, setLessons] = useState<any[]>([])
  const [playerCount, setPlayerCount] = useState(0)
  const [videoCount, setVideoCount] = useState(0)
  const [drillCount, setDrillCount] = useState(0)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: l } = await supabase
        .from('lessons')
        .select('*, players(name)')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(5)
      const { count: pc } = await supabase.from('players').select('*', { count: 'exact', head: true })
      const { count: vc } = await supabase.from('videos').select('*', { count: 'exact', head: true })
      const { count: dc } = await supabase.from('drills').select('*', { count: 'exact', head: true })
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('created_at').eq('id', user.id).maybeSingle()
        setCreatedAt(profile?.created_at ?? null)
      }
      setLessons(l || [])
      setPlayerCount(pc || 0)
      setVideoCount(vc || 0)
      setDrillCount(dc || 0)
      setLoading(false)
    }
    load()
  }, [])

  const stats = [
    { label: 'Players', value: playerCount, icon: Users, href: '/dashboard/players' },
    { label: 'Upcoming', value: lessons.length, icon: CalendarDays, href: '/dashboard/schedule' },
    { label: 'Videos', value: videoCount, icon: Video, href: '/dashboard/video' },
  ]

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const checklistItems = [
    {
      label: 'Add your first player',
      done: playerCount > 0,
      href: '/dashboard/players',
      cta: 'Add player →',
    },
    {
      label: 'Schedule a lesson',
      done: lessons.length > 0,
      href: '/dashboard/schedule',
      cta: 'Set availability →',
    },
    {
      label: 'Try the AI drill builder',
      done: drillCount > 0,
      href: '/dashboard/players',
      cta: 'Build drills →',
    },
    {
      label: 'Add a player reel',
      done: videoCount > 0,
      href: '/dashboard/video',
      cta: 'Upload video →',
    },
  ]
  const completedItems = checklistItems.filter(item => item.done).length
  const isNewCoach = playerCount === 0 || (createdAt ? Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000 : false)
  const showChecklist = !loading && isNewCoach && completedItems < checklistItems.length

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {greet}, Coach
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s a snapshot of Playvia today.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/25 hover:shadow-md"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <p className="font-heading text-3xl font-bold tabular-nums text-card-foreground">
              {loading ? '—' : value}
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Open <ArrowRight className="size-3" />
            </span>
          </Link>
        ))}
      </div>

      {showChecklist && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">Get started with Playvia</h2>
              <p className="mt-1 text-sm text-muted-foreground">{completedItems}/4 complete</p>
            </div>
            <div className="h-2 w-full rounded-full bg-muted sm:w-44">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${(completedItems / checklistItems.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {checklistItems.map(item => {
              const Icon = item.done ? CheckCircle2 : Circle
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
                >
                  <span className="flex items-center gap-3 text-sm font-semibold text-foreground">
                    <Icon className={`size-5 ${item.done ? 'text-primary' : 'text-muted-foreground/50'}`} />
                    {item.label}
                  </span>
                  {!item.done && <span className="text-xs font-bold text-primary">{item.cta}</span>}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Schedule', href: '/dashboard/schedule', icon: CalendarDays },
          { label: 'Players', href: '/dashboard/players', icon: Users },
          { label: 'Pulse', href: '/dashboard/analytics', icon: TrendingUp },
          { label: 'Video', href: '/dashboard/video', icon: Video },
        ].map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm transition-all hover:border-primary/30 hover:bg-muted/30"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
              <Icon className="size-5" />
            </div>
            <span className="font-medium text-card-foreground">{label}</span>
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-heading text-sm font-semibold text-foreground">Upcoming lessons</h2>
          <Link href="/dashboard/schedule" className="text-xs font-semibold text-primary hover:underline">
            Full schedule
          </Link>
        </div>
        <div>
          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : lessons.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              No upcoming lessons.{' '}
              <Link href="/dashboard/schedule" className="font-medium text-primary hover:underline">
                Open schedule
              </Link>
            </div>
          ) : (
            lessons.map(lesson => (
              <Link key={lesson.id} href={`/dashboard/lessons/${lesson.id}`}>
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-muted/40">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                      {lesson.players?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{lesson.players?.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3 shrink-0" />
                        {format(new Date(lesson.starts_at), 'EEE, MMM d • h:mm a')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {lesson.status}
                  </Badge>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
