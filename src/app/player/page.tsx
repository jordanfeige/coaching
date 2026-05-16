'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import PlayerSidebar from '@/components/layout/PlayerSidebar'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CalendarDays, Dumbbell, Video } from 'lucide-react'
import { format } from 'date-fns'

export default function PlayerDashboardPage() {
  const [player, setPlayer] = useState<any>(null)
  const [drillCount, setDrillCount] = useState(0)
  const [videoCount, setVideoCount] = useState(0)
  const [nextLesson, setNextLesson] = useState<any>(null)
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
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profile?.player_id) {
      setLoading(false)
      return
    }
    const { data: p } = await supabase.from('players').select('*').eq('id', profile.player_id).single()
    setPlayer(p)
    const { count: dc } = await supabase
      .from('drills')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', profile.player_id)
    setDrillCount(dc ?? 0)
    const { count: vc } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', profile.player_id)
    setVideoCount(vc ?? 0)
    const now = new Date().toISOString()
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, starts_at, duration_mins, status')
      .eq('player_id', profile.player_id)
      .eq('status', 'scheduled')
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(1)
    setNextLesson(lessons?.[0] ?? null)
    setLoading(false)
  }

  const firstName = player?.name?.split(/\s+/)[0] ?? 'there'

  return (
    <div className="flex min-h-screen bg-background">
      <PlayerSidebar />
      <main className="flex-1 space-y-8 overflow-auto p-4 pb-28 md:p-8 md:pb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Hi, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your drills, videos, and upcoming lessons in one place.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !player ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            No player profile linked to this account yet. Ask your coach to connect you.
          </div>
        ) : (
          <>
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
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                href="/player/drills"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'h-auto min-h-[120px] flex-col items-start justify-between gap-4 rounded-2xl border-border p-5 text-left shadow-sm hover:bg-muted/40'
                )}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className="font-heading text-lg font-semibold text-foreground">My drills</span>
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
                  <span className="font-heading text-lg font-semibold text-foreground">My videos</span>
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
          </>
        )}
      </main>
    </div>
  )
}
