'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Dumbbell, Trash2, User } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

export default function DrillsPage() {
  const [drills, setDrills] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ player_id: '', title: '', description: '', is_template: false })
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: d } = await supabase
      .from('drills')
      .select('*, players(id, name)')
      .order('created_at', { ascending: false })
    const { data: p } = await supabase.from('players').select('*').order('name')
    setDrills(d || [])
    setPlayers(p || [])
  }

  async function handleSave() {
    if (!form.title) return
    setSaving(true)
    await supabase.from('drills').insert({
      player_id: form.player_id || null,
      title: form.title,
      description: form.description,
      is_template: form.is_template,
    })
    setForm({ player_id: '', title: '', description: '', is_template: false })
    setOpen(false)
    setSaving(false)
    loadAll()
  }

  async function deleteDrill(id: string) {
    await supabase.from('drills').delete().eq('id', id)
    loadAll()
  }

  const filtered = drills.filter(d => {
    if (filter === 'templates') return d.is_template
    if (filter === 'assigned') return !d.is_template && d.player_id
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Drills</h1>
          <p className="text-muted-foreground mt-1">{drills.length} drill{drills.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button onClick={() => setOpen(true)} className="flex items-center gap-2">
          <Plus size={16} /> Add drill
        </Button>
      </div>

      <div className="flex gap-2">
        {['all', 'assigned', 'templates'].map(f => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm"
            onClick={() => setFilter(f)} className="capitalize">
            {f}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Dumbbell size={40} className="mx-auto mb-3 opacity-30" />
          <p>No drills yet. Add your first drill!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(drill => (
            <Card key={drill.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm">{drill.title}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    {drill.is_template && (
                      <Badge variant="secondary" className="text-xs">Template</Badge>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => deleteDrill(drill.id)}
                      className="text-muted-foreground hover:text-destructive h-6 w-6 p-0">
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
                {drill.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{drill.description}</p>
                )}
                <div className="flex items-center justify-between pt-1">
                  {drill.players ? (
                    <Link href={`/dashboard/players/${drill.players.id}`}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                      <User size={12} /> {drill.players.name}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">No player assigned</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(drill.created_at), 'MMM d')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add a drill</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Drill name *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Cross-court forehand rally" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Instructions, cues, duration, repetitions..." rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Assign to player (optional)</Label>
              <Select value={form.player_id} onValueChange={v => setForm({ ...form, player_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select a player or leave as template" /></SelectTrigger>
                <SelectContent>
                  {players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="template" checked={form.is_template}
                onChange={e => setForm({ ...form, is_template: e.target.checked })}
                className="rounded" />
              <Label htmlFor="template" className="cursor-pointer">Save as reusable template</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.title}>
                {saving ? 'Saving...' : 'Add drill'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}