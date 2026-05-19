'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getLinkedPlayersForUser, type LinkedPlayer } from '@/lib/linked-player'
import { Badge } from '@/components/ui/badge'
import { Dumbbell } from 'lucide-react'
import { format } from 'date-fns'
import ViaBar from '@/components/ViaBar'

export default function PlayerDrillsPage() {
  const [drills, setDrills] = useState<any[]>([])
  const [players, setPlayers] = useState<LinkedPlayer[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState('all')
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
    const linkedPlayers = await getLinkedPlayersForUser(supabase, user.id)
    setPlayers(linkedPlayers)
    const playerIds = linkedPlayers.map(p => p.id)
    if (playerIds.length) {
      const { data: publishedLessons } = await supabase
        .from('lessons')
        .select('id')
        .in('player_id', playerIds)
        .not('published_at', 'is', null)
      const publishedLessonIds = (publishedLessons || []).map(lesson => lesson.id)
      if (!publishedLessonIds.length) {
        setDrills([])
        setLoading(false)
        return
      }
      const { data: d } = await supabase
        .from('drills')
        .select('*, players(id, name)')
        .in('player_id', playerIds)
        .in('lesson_id', publishedLessonIds)
        .order('created_at', { ascending: false })
      setDrills(d || [])
    }
    setLoading(false)
  }

  const filteredDrills = selectedPlayerId === 'all' ? drills : drills.filter(d => d.player_id === selectedPlayerId)
  const viaPlayer = players.find(player => player.id === selectedPlayerId) || players[0]

  return (
    <div className="space-y-6">
        {viaPlayer && (
          <ViaBar
            role="player"
            playerContext={{
              id: viaPlayer.id,
              name: viaPlayer.name,
              sport: viaPlayer.sport || 'tennis',
              skillLevel: viaPlayer.skill_level,
            }}
          />
        )}

        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground md:text-2xl">My drills</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredDrills.length} drill{filteredDrills.length !== 1 ? 's' : ''} from published lesson recaps
          </p>
        </div>
        {players.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedPlayerId('all')}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${selectedPlayerId === 'all' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'}`}
            >
              All
            </button>
            {players.map(player => (
              <button
                key={player.id}
                type="button"
                onClick={() => setSelectedPlayerId(player.id)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium ${selectedPlayerId === player.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'}`}
              >
                {player.name}
              </button>
            ))}
          </div>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filteredDrills.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
            <Dumbbell size={40} className="mx-auto mb-3 text-muted-foreground/35" />
            <p className="text-sm text-muted-foreground">No published drills yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDrills.map((drill, i) => {
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
                        {drill.players?.name && players.length > 1 && (
                          <Badge variant="outline" className="text-[10px]">
                            {drill.players.name}
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
    </div>
  )
}
