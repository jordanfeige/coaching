'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Search, User, BookOpen } from 'lucide-react'
import Link from 'next/link'

type Player = {
  id: string
  name: string
  email: string
  phone: string
  skill_level: string
  notes: string
  created_at: string
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [filtered, setFiltered] = useState<Player[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', skill_level: 'beginner', notes: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadPlayers() }, [])

  useEffect(() => {
    setFiltered(players.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase())
    ))
  }, [search, players])

  async function loadPlayers() {
    const { data } = await supabase.from('players').select('*').order('name')
    setPlayers(data || [])
    setFiltered(data || [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.name) return
    setSaving(true)
    await supabase.from('players').insert(form)
    setForm({ name: '', email: '', phone: '', skill_level: 'beginner', notes: '' })
    setOpen(false)
    setSaving(false)
    loadPlayers()
  }

  const skillColor: Record<string, string> = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Players</h1>
          <p className="text-muted-foreground mt-1">{players.length} player{players.length !== 1 ? 's' : ''} on your roster</p>
        </div>
        <Button onClick={() => setOpen(true)} className="flex items-center gap-2">
          <Plus size={16} /> Add player
        </Button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
        <Input placeholder="Search players..." className="pl-9"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User size={40} className="mx-auto mb-3 opacity-30" />
          <p>No players yet. Add your first player!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(player => (
            <Card key={player.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{player.name}</p>
                      <p className="text-sm text-muted-foreground">{player.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${skillColor[player.skill_level] || 'bg-gray-100 text-gray-800'}`}>
                    {player.skill_level}
                  </span>
                </div>
                {player.phone && (
                  <p className="text-sm text-muted-foreground mb-3">{player.phone}</p>
                )}
                <Link href={`/dashboard/players/${player.id}`}>
                  <Button variant="outline" size="sm" className="w-full flex items-center gap-2">
                    <BookOpen size={14} /> View journal & drills
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new player</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@email.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="555-555-5555" />
            </div>
            <div className="space-y-2">
              <Label>Skill level</Label>
              <Select value={form.skill_level} onValueChange={v => setForm({ ...form, skill_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any initial notes..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.name}>
                {saving ? 'Saving...' : 'Add player'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}