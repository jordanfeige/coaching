'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { BookOpen, Calendar, Video, Clock, LogOut } from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function ParentPortalPage() {
  const [player, setPlayer] = useState<any>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [videos, setVideos] = useState<any[]>([])
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

    const { data: playerData } = await supabase.from('players').select('*').eq('parent_id', user.id).single()

    if (playerData) {
      setPlayer(playerData)
      const { data: l } = await supabase
        .from('lessons')
        .select('*')
        .eq('player_id', playerData.id)
        .order('starts_at', { ascending: false })
      const { data: e } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('player_id', playerData.id)
        .order('created_at', { ascending: false })
      const { data: v } = await supabase
        .from('videos')
        .select('*')
        .eq('player_id', playerData.id)
        .order('recorded_at', { ascending: false })
      setLessons(l || [])
      setEntries(e || [])
      setVideos(v || [])
    }
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function lessonStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (status === 'completed') return 'secondary'
    if (status === 'cancelled') return 'destructive'
    return 'outline'
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <BrandMark variant="authPanel" className="text-center" />
        <div className="max-w-sm text-center space-y-2">
          <h2 className="font-heading text-lg font-semibold text-foreground">No player linked yet</h2>
          <p className="text-sm text-muted-foreground">
            Ask your coach to link your account to your child&apos;s profile in Playvia.
          </p>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={signOut}>
          Sign out
        </Button>
      </div>
    )
  }

  const stats = [
    {
      label: 'Lessons',
      value: lessons.length,
      icon: Calendar,
      wrap: 'bg-info/15 text-info',
    },
    {
      label: 'Coach notes',
      value: entries.length,
      icon: BookOpen,
      wrap: 'bg-primary/15 text-primary',
    },
    {
      label: 'Videos',
      value: videos.length,
      icon: Video,
      wrap: 'bg-accent/15 text-accent',
    },
  ] as const

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="min-w-0">
            <BrandMark variant="sidebar" href="/parent" />
            <p className="mt-1 text-xs font-medium text-muted-foreground">Parent portal</p>
          </div>
          <Button variant="ghost" size="sm" className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground" onClick={signOut}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-6">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold text-foreground">{player.name}</h1>
              <p className="text-sm capitalize text-muted-foreground">{player.skill_level} · {(player.sport || 'tennis').replace(/_/g, ' ')}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {stats.map(({ label, value, icon: Icon, wrap }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
              <div className={cn('mx-auto mb-2 flex size-9 items-center justify-center rounded-lg', wrap)}>
                <Icon className="size-4" strokeWidth={2} />
              </div>
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Book a lesson</h2>
          <Link
            href="/book"
            className={cn(buttonVariants({ variant: 'default' }), 'w-full rounded-xl py-6 text-sm font-semibold')}
          >
            View available times →
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BookOpen className="size-4 text-primary" strokeWidth={2} />
              Coach&apos;s notes
            </h2>
          </div>
          <div className="divide-y divide-border">
            {entries.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              entries.slice(0, 5).map(entry => (
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
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock className="size-4 text-primary" strokeWidth={2} />
              Lesson history
            </h2>
          </div>
          <div className="divide-y divide-border">
            {lessons.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No lessons yet.</p>
            ) : (
              lessons.slice(0, 10).map(lesson => (
                <div key={lesson.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{format(new Date(lesson.starts_at), 'EEEE, MMM d')}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(lesson.starts_at), 'h:mm a')} · {lesson.duration_mins} min
                    </p>
                  </div>
                  <Badge variant={lessonStatusVariant(lesson.status)} className="shrink-0 capitalize">
                    {lesson.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
