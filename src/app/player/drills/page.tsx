'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import PlayerSidebar from '@/components/layout/PlayerSidebar'
import { Badge } from '@/components/ui/badge'
import { Dumbbell } from 'lucide-react'
import { format } from 'date-fns'

export default function PlayerDrillsPage() {
  const [drills, setDrills] = useState<any[]>([])
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
    if (profile?.player_id) {
      const { data: d } = await supabase
        .from('drills')
        .select('*')
        .eq('player_id', profile.player_id)
        .order('created_at', { ascending: false })
      setDrills(d || [])
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <PlayerSidebar />
      <main className="flex-1 space-y-6 overflow-auto p-4 pb-28 md:p-8 md:pb-8">
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground md:text-2xl">My drills</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {drills.length} drill{drills.length !== 1 ? 's' : ''} assigned by your coach
          </p>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : drills.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
            <Dumbbell size={40} className="mx-auto mb-3 text-muted-foreground/35" />
            <p className="text-sm text-muted-foreground">No drills assigned yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {drills.map((drill, i) => {
              let duration = 0
              try {
                duration = JSON.parse(drill.steps)?.duration_mins || 0
              } catch {}
              return (
                <div
                  key={drill.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{drill.title}</p>
                        {duration > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            {duration}m
                          </Badge>
                        )}
                      </div>
                      {drill.description && (
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{drill.description}</p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        Assigned {format(new Date(drill.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
