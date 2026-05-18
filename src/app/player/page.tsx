'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getLinkedPlayersForUser, type LinkedPlayer } from '@/lib/linked-player'
import PlayerSidebar from '@/components/layout/PlayerSidebar'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowRight, BookOpen, CalendarDays, Clock, Dumbbell, Sparkles, UserPlus, Video } from 'lucide-react'
import { format } from 'date-fns'
import { calendarEvent } from '@/lib/calendar'

type AnalysisResult = {
  observations?: string
  technique_notes?: string
  strengths?: Array<{ area?: string; what_i_see?: string; why_it_helps?: string }>
  areas_to_improve?: Array<{ area?: string; severity?: string; simple_cue?: string }>
  overall_rating?: string
  biggest_win?: string
  priority_focus?: string
  confidence?: string
}

type AnalysisHistoryRow = {
  id: string
  sport: string | null
  shot_type: string | null
  camera_angle: string | null
  result: AnalysisResult | null
  created_at: string
}

type LessonRow = {
  id: string
  availability_id?: string | null
  booking_group_id?: string | null
  starts_at: string
  duration_mins: number
  status: string
  published_at?: string | null
  player_viewed_at?: string | null
  players?: { id?: string | null; name?: string | null; sport?: string | null } | null
}

type JournalEntryRow = {
  id: string
  lesson_id: string | null
  content: string
}

type DrillRow = {
  id: string
  lesson_id: string | null
  title: string
  description?: string | null
}

type VideoRow = {
  id: string
  lesson_id: string | null
  title: string
  ai_analysis?: unknown
}

function lessonStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'completed') return 'secondary'
  if (status === 'cancelled') return 'destructive'
  return 'outline'
}

export default function PlayerDashboardPage() {
  const [players, setPlayers] = useState<LinkedPlayer[]>([])
  const [nextLesson, setNextLesson] = useState<LessonRow | null>(null)
  const [lessonHistory, setLessonHistory] = useState<LessonRow[]>([])
  const [lessonDrills, setLessonDrills] = useState<DrillRow[]>([])
  const [lessonEntries, setLessonEntries] = useState<JournalEntryRow[]>([])
  const [lessonVideos, setLessonVideos] = useState<VideoRow[]>([])
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryRow[]>([])
  const [historyWarning, setHistoryWarning] = useState('')
  const [accountName, setAccountName] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const cancelLessonRecord = useCallback(async (lessonId: string) => {
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
  }, [supabase])

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    setAccountName(
      typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
        ? user.user_metadata.full_name
        : user.email || ''
    )

    const [linked, historyResponse] = await Promise.all([
      getLinkedPlayersForUser(supabase, user.id),
      fetch('/api/analyze-history').catch(() => null),
    ])

    if (historyResponse?.ok) {
      const payload = await historyResponse.json()
      setAnalysisHistory(Array.isArray(payload.analyses) ? payload.analyses : [])
      setHistoryWarning(typeof payload.warning === 'string' ? payload.warning : '')
    }

    if (!linked.length) {
      setLoading(false)
      return
    }

    setPlayers(linked)
    const playerIds = linked.map(p => p.id)

    const [{ data: lessons }, { data: allLessons }] = await Promise.all([
      supabase
        .from('lessons')
        .select('*, players(id, name, sport)')
        .in('player_id', playerIds)
        .eq('status', 'scheduled')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(1),
      supabase
        .from('lessons')
        .select('*, players(id, name, sport)')
        .in('player_id', playerIds)
        .order('starts_at', { ascending: false }),
    ])

    const publishedLessonIds = (allLessons || [])
      .filter(lesson => Boolean(lesson.published_at))
      .map(lesson => lesson.id)

    const [{ data: entries }, { data: drills }, { data: videos }] = publishedLessonIds.length
      ? await Promise.all([
          supabase
            .from('journal_entries')
            .select('*')
            .in('lesson_id', publishedLessonIds)
            .order('created_at', { ascending: false }),
          supabase
            .from('drills')
            .select('*')
            .in('lesson_id', publishedLessonIds)
            .order('created_at', { ascending: false }),
          supabase
            .from('videos')
            .select('*')
            .in('lesson_id', publishedLessonIds)
            .order('recorded_at', { ascending: false }),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }]

    const visibleLessons = (allLessons || []).filter(lesson =>
      ['scheduled', 'completed'].includes(lesson.status)
    )

    setNextLesson(lessons?.[0] ?? null)
    setLessonHistory(visibleLessons)
    setLessonEntries(entries || [])
    setLessonDrills(drills || [])
    setLessonVideos(videos || [])
    setLoading(false)
    const cancelId = new URLSearchParams(window.location.search).get('cancel')
    if (cancelId && allLessons?.some(l => l.id === cancelId)) {
      window.history.replaceState(null, '', '/player')
      if (window.confirm('Cancel this lesson?')) {
        await cancelLessonRecord(cancelId)
        setLessonHistory(current => current.filter(lesson => lesson.id !== cancelId))
        setNextLesson(current => current?.id === cancelId ? null : current)
      }
    }
  }, [cancelLessonRecord, supabase])

  const cancelLessonById = useCallback(async (lessonId: string) => {
    await cancelLessonRecord(lessonId)
    await loadData()
  }, [cancelLessonRecord, loadData])

  const markLessonViewed = useCallback(async (lessonId: string) => {
    const lesson = lessonHistory.find(item => item.id === lessonId)
    if (!lesson || lesson.player_viewed_at) return

    const viewedAt = new Date().toISOString()
    await supabase.from('lessons').update({ player_viewed_at: viewedAt }).eq('id', lessonId)
    setLessonHistory(current =>
      current.map(item => item.id === lessonId ? { ...item, player_viewed_at: viewedAt } : item)
    )
  }, [lessonHistory, supabase])

  useEffect(() => {
    queueMicrotask(() => {
      void loadData()
    })
  }, [loadData])

  const linkedFirstName = players[0]?.name?.trim().split(/\s+/)[0]
  const accountFirstName = accountName.trim().split(/\s+/)[0]
  const firstName = linkedFirstName || accountFirstName || 'there'
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

  function lessonContent(lessonId: string) {
    return {
      entries: lessonEntries.filter(entry => entry.lesson_id === lessonId),
      drills: lessonDrills.filter(drill => drill.lesson_id === lessonId),
      videos: lessonVideos.filter(video => video.lesson_id === lessonId),
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <PlayerSidebar />
      <main className="flex-1 space-y-8 overflow-auto p-4 pb-28 md:p-8 md:pb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Hi, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {!loading && players.length === 0
              ? 'Analyze your technique, keep reports in one place, and book directly with Jordan when you are ready for live coaching.'
              : 'Your lessons in one place. Lesson recaps, drills, coach feedback, and media appear after your coach publishes them.'}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : players.length === 0 ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-5 shadow-sm md:col-span-2">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card shadow-sm ring-1 ring-border">
                    <Sparkles className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-primary uppercase">Free analyzer</p>
                    <h2 className="mt-1 font-heading text-xl font-bold text-foreground">Get your next technique report</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      Upload a tennis, golf, baseball, or basketball clip for instant AI feedback. Your saved reports will appear here after each analysis.
                    </p>
                    <Link
                      href="/analyze?returnTo=/player"
                      className={cn(buttonVariants({ variant: 'default' }), 'mt-4 rounded-xl px-4 py-2 text-sm font-semibold')}
                    >
                      Analyze a video <ArrowRight className="ml-1 size-4" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/[0.08]">
                  <CalendarDays className="size-5 text-primary" />
                </div>
                <h2 className="mt-4 font-heading text-lg font-bold text-foreground">Book with Jordan</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  For now, live booking is available directly with Jordan only.
                </p>
                <Link
                  href="/book"
                  className={cn(buttonVariants({ variant: 'outline' }), 'mt-4 w-full rounded-xl text-sm font-semibold')}
                >
                  View available times
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <UserPlus className="size-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-heading text-sm font-semibold text-foreground">Connect to a coach</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Already working with a coach? Ask them to invite this email or link your account from their roster. Once linked, this dashboard will upgrade to include lessons, assigned drills, coach notes, and lesson media.
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
                  <Video className="size-4 text-primary" strokeWidth={2} />
                  Saved analysis reports
                </h2>
                <Badge variant="secondary">{analysisHistory.length}</Badge>
              </div>
              <div className="divide-y divide-border">
                {historyWarning ? (
                  <p className="px-5 py-6 text-sm text-muted-foreground">{historyWarning}</p>
                ) : analysisHistory.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm font-medium text-foreground">No saved reports yet.</p>
                    <p className="mt-1 text-sm text-muted-foreground">Run an analysis while signed in and it will be saved here.</p>
                  </div>
                ) : (
                  analysisHistory.map(report => {
                    const result = report.result ?? {}
                    const issues = Array.isArray(result.areas_to_improve) ? result.areas_to_improve : []
                    const headline = result.priority_focus || result.biggest_win || result.observations || result.technique_notes || 'Technique report saved'
                    return (
                      <div key={report.id} className="px-5 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap gap-2">
                              {report.sport && <Badge variant="outline" className="capitalize">{report.sport}</Badge>}
                              {report.shot_type && <Badge variant="secondary" className="capitalize">{report.shot_type}</Badge>}
                              {result.overall_rating && <Badge variant="secondary">{result.overall_rating}</Badge>}
                            </div>
                            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-foreground">{headline}</p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {format(new Date(report.created_at), 'MMM d, yyyy')} · {issues.length} focus area{issues.length === 1 ? '' : 's'}
                            </p>
                          </div>
                          <Link href="/analyze" className="shrink-0 text-xs font-semibold text-primary">
                            New analysis
                          </Link>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card shadow-sm ring-1 ring-border">
                    <Video className="size-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-heading text-lg font-bold text-foreground">Upload a practice video</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Get AI coaching feedback between lessons.
                    </p>
                  </div>
                </div>
                <Link
                  href="/analyze?returnTo=/player"
                  className={cn(buttonVariants({ variant: 'default' }), 'rounded-xl text-sm font-semibold')}
                >
                  Upload video →
                </Link>
              </div>
            </div>
            {nextLesson ? (
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
            ) : (
              <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
                <p className="font-heading text-lg font-bold text-foreground">Your coach will schedule your first lesson soon</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  You can also book directly if you are ready to grab a time.
                </p>
                <Link
                  href="/book"
                  className={cn(buttonVariants({ variant: 'default' }), 'mt-4 rounded-xl text-sm font-semibold')}
                >
                  Book a lesson →
                </Link>
              </div>
            )}

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
                    const content = lessonContent(lesson.id)
                    const isPublished = Boolean(lesson.published_at)
                    const origin = typeof window !== 'undefined' ? window.location.origin : ''
                    const event = calendarEvent({
                      title: `Playvia lesson: ${lesson.players?.name || 'Lesson'}`,
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
                      <div key={lesson.id} className="px-5 py-4" onClick={() => markLessonViewed(lesson.id)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{format(new Date(lesson.starts_at), 'EEEE, MMM d')}</p>
                            <p className="text-xs text-muted-foreground">
                              {lesson.players?.name ? `${lesson.players.name} · ` : ''}
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
                                    onClick={event => {
                                      event.stopPropagation()
                                      cancelLessonById(lesson.id)
                                    }}
                                    className="text-xs font-medium text-destructive"
                                  >
                                    Cancel
                                  </button>
                                  <Link
                                    href={`/book?reschedule=${lesson.id}`}
                                    onClick={event => event.stopPropagation()}
                                    className="text-xs font-medium text-primary"
                                  >
                                    Reschedule
                                  </Link>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <Badge variant={lessonStatusVariant(lesson.status)} className="capitalize">
                              {lesson.status}
                            </Badge>
                            {['scheduled', 'completed'].includes(lesson.status) && (
                              <Badge variant={isPublished ? 'default' : 'secondary'}>
                                {isPublished ? 'Recap ready' : 'Preparing recap'}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-border bg-muted/25 p-4">
                          {!isPublished ? (
                            <p className="text-sm text-muted-foreground">
                              Your coach is preparing drills, feedback, and media for this lesson. You can still manage the lesson details above.
                            </p>
                          ) : (
                            <div className="space-y-4">
                              {content.entries.length > 0 && (
                                <div>
                                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    <BookOpen className="size-3.5 text-primary" /> Coach feedback
                                  </p>
                                  <div className="space-y-2">
                                    {content.entries.map(entry => (
                                      <p key={entry.id} className="text-sm leading-relaxed text-foreground">
                                        {entry.content}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {content.drills.length > 0 && (
                                <div>
                                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    <Dumbbell className="size-3.5 text-primary" /> Assigned drills
                                  </p>
                                  <div className="grid gap-2">
                                    {content.drills.map(drill => (
                                      <div key={drill.id} className="rounded-lg border border-border bg-card px-3 py-2">
                                        <p className="text-sm font-medium text-foreground">{drill.title}</p>
                                        {drill.description && (
                                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{drill.description}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {content.videos.length > 0 && (
                                <div>
                                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    <Video className="size-3.5 text-primary" /> Lesson media
                                  </p>
                                  <div className="grid gap-2">
                                    {content.videos.map(video => (
                                      <div key={video.id} className="rounded-lg border border-border bg-card px-3 py-2">
                                        <p className="text-sm font-medium text-foreground">{video.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {video.ai_analysis ? 'AI analysis included' : 'Media from this lesson'}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {content.entries.length === 0 && content.drills.length === 0 && content.videos.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                  This lesson recap has been published. Your coach has not added drills, feedback, or media yet.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
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
