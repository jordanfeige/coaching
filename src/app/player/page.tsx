'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getLinkedPlayersForUser, type LinkedPlayer } from '@/lib/linked-player'
import PlayerSidebar from '@/components/layout/PlayerSidebar'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BookOpen, CalendarDays, Clock, Dumbbell, Video } from 'lucide-react'
import { format } from 'date-fns'
import { calendarEvent } from '@/lib/calendar'

function lessonStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'completed') return 'secondary'
  if (status === 'cancelled') return 'destructive'
  return 'outline'
}

export default function PlayerDashboardPage() {
  const [players, setPlayers] = useState<LinkedPlayer[]>([])
  const [drillCount, setDrillCount] = useState(0)
  const [videoCount, setVideoCount] = useState(0)
  const [nextLesson, setNextLesson] = useState<any>(null)
  const [journalEntries, setJournalEntries] = useState<any[]>([])
  const [lessonHistory, setLessonHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const linked = await getLinkedPlayersForUser(supabase, user.id)
    if (!linked.length) {
      setLoading(false)
      return
    }

    setPlayers(linked)
    const playerIds = linked.map(p => p.id)

    const [{ count: dc }, { count: vc }, { data: lessons }, { data: entries }, { data: allLessons }] =
      await Promise.all([
        supabase.from('drills').select('*', { count: 'exact', head: true }).in('player_id', playerIds),
        supabase.from('videos').select('*', { count: 'exact', head: true }).in('player_id', playerIds),
        supabase
          .from('lessons')
          .select('id, starts_at, duration_mins, status')
          .in('player_id', playerIds)
          .eq('status', 'scheduled')
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true })
          .limit(1),
        supabase
          .from('journal_entries')
          .select('*')
          .in('player_id', playerIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('lessons')
          .select('*')
          .in('player_id', playerIds)
          .order('starts_at', { ascending: false }),
      ])

    setDrillCount(dc ?? 0)
    setVideoCount(vc ?? 0)
    setNextLesson(lessons?.[0] ?? null)
    setJournalEntries(entries || [])
    setLessonHistory(allLessons || [])
    setLoading(false)
    const cancelId = new URLSearchParams(window.location.search).get('cancel')
    if (cancelId && allLessons?.some(l => l.id === cancelId)) {
      window.history.replaceState(null, '', '/player')
      if (window.confirm('Cancel this lesson?')) {
        await cancelLessonById(cancelId)
      }
    }
  }

  async function cancelLessonById(lessonId: string) {
    const { data: lesson } = await supabase
      .from('lessons')
      .select('id, booking_group_id, availability_id')
      .eq('id', lessonId)
      .maybeSingle()
    if (!lesson) return
    if (lesson.booking_group_id) {
      await supabase.from('lessons').update({ status: 'cancelled' }).eq('booking_group_id', lesson.booking_group_id)
    } else {
      await supabase.from('lessons').update({ status: 'cancelled' }).eq('id', lesson.id)
    }
    if (lesson.availability_id) {
      await supabase.from('availability').update({ is_booked: false }).eq('id', lesson.availability_id)
    }
    loadData()
  }

  const firstName = players[0]?.name?.split(/\s+/)[0] ?? 'there'
  const nextLessonCalendar = nextLesson
    ? calendarEvent({
        title: `Playvia lesson: ${players.map(p => p.name).join(', ') || 'Lesson'}`,
        startsAt: nextLesson.starts_at,
        durationMins: nextLesson.duration_mins,
        description: 'Playvia lesson',
        actionLinks:
          typeof window !== 'undefined'
            ? [
                { label: 'Cancel lesson', url: `${window.location.origin}/player?cancel=${nextLesson.id}` },
                { label: 'Reschedule lesson', url: `${window.location.origin}/book?reschedule=${nextLesson.id}` },
              ]
            : undefined,
      })
    : null

  return (
    <div className="flex min-h-screen bg-background">
      <PlayerSidebar />
      <main className="flex-1 space-y-8 overflow-auto p-4 pb-28 md:p-8 md:pb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Hi, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your drills, videos, scheduling, and coach notes in one place — same login whether you&apos;re the athlete or managing their profile.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : players.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            No athlete profile linked to this account yet. Ask your coach to send an invite link or connect this login to your roster spot.
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-3 font-heading text-sm font-semibold text-foreground">Linked players</h2>
              <div className="flex flex-wrap gap-2">
                {players.map(player => (
                  <Badge key={player.id} variant="outline" className="capitalize">
                    {player.name}
                    {player.age ? ` · ${player.age}` : ''}
                  </Badge>
                ))}
              </div>
            </div>
            {nextLesson && (
              <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card shadow-sm ring-1 ring-border">
                      <CalendarDays className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-primary uppercase">Next lesson</p>
                      <p className="mt-1 font-medium text-foreground">
                        {format(new Date(nextLesson.starts_at), 'EEEE, MMM d')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(nextLesson.starts_at), 'h:mm a')} · {nextLesson.duration_mins} min
                      </p>
                      {nextLessonCalendar && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            href={nextLessonCalendar.googleUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                          >
                            Google Calendar
                          </a>
                          <a
                            href={nextLessonCalendar.icsHref}
                            download="playvia-lesson.ics"
                            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground"
                          >
                            Device calendar
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-3 font-heading text-sm font-semibold text-foreground">Book a lesson</h2>
              <Link
                href="/book"
                className={cn(buttonVariants({ variant: 'default' }), 'w-full rounded-xl py-6 text-sm font-semibold')}
              >
                View available times →
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                href="/player/drills"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'h-auto min-h-[120px] flex-col items-start justify-between gap-4 rounded-2xl border-border p-5 text-left shadow-sm hover:bg-muted/40'
                )}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className="font-heading text-lg font-semibold text-foreground">Drills</span>
                  <Dumbbell className="size-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {drillCount} assigned drill{drillCount !== 1 ? 's' : ''} from your coach
                </p>
              </Link>
              <Link
                href="/player/videos"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'h-auto min-h-[120px] flex-col items-start justify-between gap-4 rounded-2xl border-border p-5 text-left shadow-sm hover:bg-muted/40'
                )}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className="font-heading text-lg font-semibold text-foreground">Videos</span>
                  <Video className="size-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {videoCount} clip{videoCount !== 1 ? 's' : ''} — upload and review feedback
                </p>
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/player/drills" className={cn(buttonVariants(), 'rounded-xl')}>
                View drills
              </Link>
              <Link href="/player/videos" className={cn(buttonVariants({ variant: 'secondary' }), 'rounded-xl')}>
                View videos
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
                  <BookOpen className="size-4 text-primary" strokeWidth={2} />
                  Coach notes
                </h2>
              </div>
              <div className="divide-y divide-border">
                {journalEntries.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-muted-foreground">No notes yet.</p>
                ) : (
                  journalEntries.slice(0, 5).map(entry => (
                    <div key={entry.id} className="px-5 py-4">
                      <p className="mb-1.5 text-xs text-muted-foreground">{format(new Date(entry.created_at), 'MMMM d, yyyy')}</p>
                      <p className="text-sm leading-relaxed text-foreground">{entry.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
                  <Clock className="size-4 text-primary" strokeWidth={2} />
                  Lesson history
                </h2>
              </div>
              <div className="divide-y divide-border">
                {lessonHistory.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-muted-foreground">No lessons yet.</p>
                ) : (
                  lessonHistory.slice(0, 10).map(lesson => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : ''
                    const event = calendarEvent({
                      title: 'Playvia lesson',
                      startsAt: lesson.starts_at,
                      durationMins: lesson.duration_mins,
                      description: 'Playvia lesson',
                      actionLinks: origin
                        ? [
                            { label: 'Cancel lesson', url: `${origin}/player?cancel=${lesson.id}` },
                            { label: 'Reschedule lesson', url: `${origin}/book?reschedule=${lesson.id}` },
                          ]
                        : undefined,
                    })
                    const canChange = lesson.status === 'scheduled'
                    return (
                      <div key={lesson.id} className="flex items-center justify-between gap-3 px-5 py-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{format(new Date(lesson.starts_at), 'EEEE, MMM d')}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(lesson.starts_at), 'h:mm a')} · {lesson.duration_mins} min
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <a href={event.googleUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary">
                              Google
                            </a>
                            <a href={event.icsHref} download="playvia-lesson.ics" className="text-xs font-medium text-primary">
                              Device
                            </a>
                            {canChange && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => cancelLessonById(lesson.id)}
                                  className="text-xs font-medium text-destructive"
                                >
                                  Cancel
                                </button>
                                <Link href={`/book?reschedule=${lesson.id}`} className="text-xs font-medium text-primary">
                                  Reschedule
                                </Link>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge variant={lessonStatusVariant(lesson.status)} className="shrink-0 capitalize">
                          {lesson.status}
                        </Badge>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
