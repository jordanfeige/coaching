'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Search, UserIcon, BookOpen, Mail, Send, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type Player = {
  id: string
  name: string
  email: string
  phone: string
  skill_level: string
  notes: string
  created_at: string
}

function skillBadgeVariant(level: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (level === 'advanced') return 'destructive'
  if (level === 'intermediate') return 'secondary'
  return 'default'
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [filtered, setFiltered] = useState<Player[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [openPlayer, setOpenPlayer] = useState(false)
  const [openInvite, setOpenInvite] = useState(false)
  const [invitePlayerId, setInvitePlayerId] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSent, setInviteSent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<{
    name: string
    email: string
    phone: string
    skill_level: string | null
    notes: string
    sport: string
  }>({ name: '', email: '', phone: '', skill_level: 'beginner', notes: '', sport: 'tennis' })

  const supabase = createClient()
  const [magicLink, setMagicLink] = useState('')

  useEffect(() => {
    loadPlayers()
  }, [])
  useEffect(() => {
    setFiltered(
      players.filter(
        p =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.email?.toLowerCase().includes(search.toLowerCase())
      )
    )
  }, [search, players])

  async function loadPlayers() {
    const { data } = await supabase.from('players').select('*').order('name')
    setPlayers(data || [])
    setFiltered(data || [])
    setLoading(false)
  }

  async function handleDelete(playerId: string, playerName: string) {
    if (!confirm(`Delete ${playerName}? This removes lessons, drills, and videos for this player.`)) return
    await supabase.from('players').delete().eq('id', playerId)
    loadPlayers()
  }

  async function handleSave() {
    if (!form.name) return
    setSaving(true)
    await supabase.from('players').insert(form)
    setForm({ name: '', email: '', phone: '', skill_level: 'beginner', notes: '', sport: 'tennis' })
    setOpenPlayer(false)
    setSaving(false)
    loadPlayers()
  }

  async function handleInvite() {
    if (!inviteEmail || !invitePlayerId) return
    setSaving(true)
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, player_id: invitePlayerId }),
      })
      const data = await res.json()
      if (data.error) {
        alert(`Failed: ${data.error}`)
        setSaving(false)
        return
      }
      setMagicLink(data.magic_link || '')
      setInviteSent(true)
    } catch (e: any) {
      alert(`Failed: ${e.message}`)
    }
    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">Players</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {players.length} player{players.length !== 1 ? 's' : ''} on your roster
          </p>
        </div>
        <Button onClick={() => setOpenPlayer(true)} className="gap-2 shrink-0">
          <Plus size={16} /> Add player
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="h-11 rounded-xl border-border bg-background pl-10"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <UserIcon className="mx-auto mb-3 size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No players match your search.</p>
          {players.length === 0 && (
            <Button className="mt-4" variant="secondary" onClick={() => setOpenPlayer(true)}>
              Add your first player
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(player => (
            <div
              key={player.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{player.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{player.email || 'No email'}</p>
                  </div>
                </div>
                <Badge variant={skillBadgeVariant(player.skill_level)} className="capitalize shrink-0">
                  {player.skill_level}
                </Badge>
              </div>
              <div className="mt-auto flex gap-2">
                <Link
                  href={`/dashboard/players/${player.id}`}
                  className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'flex flex-1 items-center justify-center gap-1.5')}
                >
                  <BookOpen size={14} /> Profile
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    setInvitePlayerId(player.id)
                    setInviteEmail(player.email || '')
                    setInviteSent(false)
                    setOpenInvite(true)
                  }}
                >
                  <Mail size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                  onClick={() => handleDelete(player.id, player.name)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={openPlayer} onOpenChange={setOpenPlayer}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add player</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {[
              { label: 'Name *', key: 'name', placeholder: 'Jane Smith', type: 'text' },
              { label: 'Email', key: 'email', placeholder: 'jane@email.com', type: 'email' },
              { label: 'Phone', key: 'phone', placeholder: '555-555-5555', type: 'text' },
            ].map(({ label, key, placeholder, type }) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type={type}
                  placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            ))}
            <div className="space-y-2">
              <Label>Skill level</Label>
              <Select value={form.skill_level ?? 'beginner'} onValueChange={v => setForm({ ...form, skill_level: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sport</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'tennis', label: 'Tennis' },
                  { value: 'golf', label: 'Golf' },
                  { value: 'pickleball', label: 'Pickleball' },
                  { value: 'basketball', label: 'Basketball' },
                ].map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm({ ...form, sport: s.value })}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors',
                      form.sport === s.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Any initial notes…"
                rows={3}
                className="rounded-xl resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpenPlayer(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.name}>
                {saving ? 'Saving…' : 'Add player'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openInvite} onOpenChange={setOpenInvite}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite parent</DialogTitle>
          </DialogHeader>
          {inviteSent ? (
            <div className="space-y-4 pt-2">
              <p className="text-center text-sm font-medium text-foreground">Link ready</p>
              <p className="text-center text-sm text-muted-foreground">
                Share this login link. It expires in 24 hours.
              </p>
              {magicLink && (
                <div className="space-y-2">
                  <div className="rounded-xl border border-border bg-muted/50 p-3 font-mono text-xs break-all text-foreground">
                    {magicLink}
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(magicLink)
                      alert('Copied!')
                    }}
                  >
                    Copy link
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setOpenInvite(false)
                  setMagicLink('')
                }}
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">Send the parent an email to create their account.</p>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Parent email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="parent@email.com"
                  className="rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpenInvite(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={saving || !inviteEmail} className="gap-2">
                  <Send size={14} /> {saving ? 'Sending…' : 'Send invite'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
