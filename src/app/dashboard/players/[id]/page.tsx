'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Plus, BookOpen, Dumbbell, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useParams } from 'next/navigation'

export default function PlayerDetailPage() {
  const { id } = useParams()
  const [player, setPlayer] = useState<any>(null)
  const [entries, setEntries] = useState<any[]>([])
  const [drills, setDrills] = useState<any[]>([])
  const [newEntry, setNewEntry] = useState('')
  const [newDrill, setNewDrill] = useState({ title: '', description: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadAll()
  }, [id])

  async function loadAll() {
    const { data: p } = await supabase.from('players').select('*').eq('id', id).single()
    const { data: e } = await supabase.from('journal_entries').select('*').eq('player_id', id).order('created_at', { ascending: false })
    const { data: d } = await supabase.from('drills').select('*').eq('player_id', id).order('created_at', { ascending: false })
    setPlayer(p)
    setEntries(e || [])
    setDrills(d || [])
  }

  async function addEntry() {
    if (!newEntry.trim()) return
    setSaving(true)
    await supabase.from('journal_entries').insert({ player_id: id, content: newEntry })
    setNewEntry('')
    setSaving(false)
    loadAll()
  }

  async function deleteEntry(entryId: string) {
    await supabase.from('journal_entries').delete().eq('id', entryId)
    loadAll()
  }

  async function addDrill() {
    if (!newDrill.title.trim()) return
    setSaving(true)
    await supabase.from('drills').insert({ player_id: id, ...newDrill })
    setNewDrill({ title: '', description: '' })
    setSaving(false)
    loadAll()
  }

  async function deleteDrill(drillId: string) {
    await supabase.from('drills').delete().eq('id', drillId)
    loadAll()
  }

  if (!player) return <div className="p-8 text-muted-foreground">Loading...</div>

  const skillColor: Record<string, string> = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800',
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/players">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ArrowLeft size={14} /> Back
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-bold text-lg">
              {player.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{player.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {player.email && <span className="text-sm text-muted-foreground">{player.email}</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${skillColor[player.skill_level] || 'bg-gray-100'}`}>
                {player.skill_level}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="journal">
        <TabsList>
          <TabsTrigger value="journal" className="flex items-center gap-2">
            <BookOpen size={14} /> Journal
          </TabsTrigger>
          <TabsTrigger value="drills" className="flex items-center gap-2">
            <Dumbbell size={14} /> Drills
          </TabsTrigger>
        </TabsList>

        <TabsContent value="journal" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">New journal entry</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Notes from today's lesson — what went well, what to work on..."
                value={newEntry}
                onChange={e => setNewEntry(e.target.value)}
                rows={4}
              />
              <Button onClick={addEntry} disabled={saving || !newEntry.trim()} className="flex items-center gap-2">
                <Plus size={14} /> Add entry
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {entries.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No journal entries yet.</p>
            ) : entries.map(entry => (
              <Card key={entry.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-2">
                        {format(new Date(entry.created_at), 'MMMM d, yyyy • h:mm a')}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteEntry(entry.id)}
                      className="text-muted-foreground hover:text-destructive shrink-0">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="drills" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Add a drill</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Drill name e.g. Cross-court forehand rally"
                value={newDrill.title} onChange={e => setNewDrill({ ...newDrill, title: e.target.value })} />
              <Textarea placeholder="Description, instructions, or cues..."
                value={newDrill.description} onChange={e => setNewDrill({ ...newDrill, description: e.target.value })}
                rows={3} />
              <Button onClick={addDrill} disabled={saving || !newDrill.title.trim()} className="flex items-center gap-2">
                <Plus size={14} /> Add drill
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {drills.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No drills assigned yet.</p>
            ) : drills.map(drill => (
              <Card key={drill.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{drill.title}</p>
                      {drill.description && (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{drill.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(drill.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteDrill(drill.id)}
                      className="text-muted-foreground hover:text-destructive shrink-0">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}