'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CalendarPlus, Plus, UserRoundCog } from 'lucide-react'

type Player = { id: string; name: string; age?: number | null; email?: string | null }
type Account = { id: string; email: string; full_name?: string | null; phone?: string | null; role: string; players: Player[] }
type ProfileRow = { id: string; email: string; full_name?: string | null; phone?: string | null; role: string }

export default function AccountsPage() {
  const supabase = createClient()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [openInvite, setOpenInvite] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [newPlayer, setNewPlayer] = useState({ name: '', age: '', sport: 'tennis' })
  const [saving, setSaving] = useState(false)
  const [magicLink, setMagicLink] = useState('')
  const [requestingAccountId, setRequestingAccountId] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: profileRows }, { data: playerRows }, { data: links }] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, phone, role').eq('role', 'player').order('email'),
      supabase.from('players').select('id, name, age, email').order('name'),
      supabase.from('account_players').select('account_id, players(id, name, age, email)'),
    ])

    const byAccount = new Map<string, Player[]>()
    for (const link of links ?? []) {
      const player = Array.isArray(link.players) ? link.players[0] : link.players
      if (!player?.id) continue
      const arr = byAccount.get(link.account_id) ?? []
      arr.push(player as Player)
      byAccount.set(link.account_id, arr)
    }

    setPlayers((playerRows ?? []) as Player[])
    setAccounts(
      ((profileRows ?? []) as ProfileRow[]).map(p => ({
        ...p,
        players: byAccount.get(p.id) ?? [],
      }))
    )
    setLoading(false)
  }

  const selectedPlayers = useMemo(
    () => players.filter(p => selectedPlayerIds.includes(p.id)),
    [players, selectedPlayerIds]
  )

  function togglePlayer(id: string) {
    setSelectedPlayerIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  async function createAccount() {
    if (!email || !fullName.trim() || selectedPlayerIds.length === 0) return
    setSaving(true)
    setMagicLink('')
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: fullName, phone, player_ids: selectedPlayerIds }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.error) {
      alert(`Account creation failed: ${data.error}`)
      return
    }
    setOpenInvite(false)
    setFullName('')
    setEmail('')
    setPhone('')
    setSelectedPlayerIds([])
    loadAll()
  }

  async function requestBooking(account: Account) {
    if (!account.email || account.players.length === 0) return
    setRequestingAccountId(account.id)
    setMagicLink('')
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: account.email,
        full_name: account.full_name,
        phone: account.phone,
        player_ids: account.players.map(p => p.id),
        redirect_path: '/book',
      }),
    })
    const data = await res.json()
    setRequestingAccountId(null)
    if (data.error) {
      alert(`Booking request failed: ${data.error}`)
      return
    }
    setMagicLink(data.magic_link || '')
  }

  async function createAndSelectPlayer() {
    if (!newPlayer.name.trim()) return
    const age = Number.parseInt(newPlayer.age, 10)
    const { data, error } = await supabase
      .from('players')
      .insert({
        name: newPlayer.name.trim(),
        age: Number.isNaN(age) ? null : age,
        sport: newPlayer.sport,
        skill_level: 'beginner',
      })
      .select('id, name, age, email')
      .single()
    if (error) {
      alert(`Could not create player: ${error.message}`)
      return
    }
    if (data) {
      setPlayers(prev => [...prev, data as Player].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedPlayerIds(prev => [...prev, data.id])
      setNewPlayer({ name: '', age: '', sport: 'tennis' })
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Accounts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite family accounts and link one or more players to each login.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setOpenInvite(true)}>
          <Plus size={16} /> Add account
        </Button>
      </div>

      {magicLink && !openInvite && (
        <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
          <p className="mb-2 text-sm font-semibold text-foreground">Booking request link ready</p>
          <div className="rounded-xl border border-border bg-card p-3 font-mono text-xs break-all text-foreground">
            {magicLink}
          </div>
          <Button
            type="button"
            className="mt-3"
            variant="secondary"
            onClick={() => navigator.clipboard.writeText(magicLink)}
          >
            Copy link
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <UserRoundCog className="mx-auto mb-3 size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No family accounts yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map(account => (
            <div key={account.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{account.full_name || account.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {account.email}
                    {account.phone ? ` · ${account.phone}` : ''} · {account.players.length} linked player{account.players.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <Badge variant="secondary">Family</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {account.players.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No linked players</span>
                ) : (
                  account.players.map(player => (
                    <Badge key={player.id} variant="outline" className="capitalize">
                      {player.name}
                      {player.age ? ` · ${player.age}` : ''}
                    </Badge>
                  ))
                )}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  size="sm"
                  className="gap-2"
                  disabled={requestingAccountId === account.id || account.players.length === 0}
                  onClick={() => requestBooking(account)}
                >
                  <CalendarPlus size={14} />
                  {requestingAccountId === account.id ? 'Creating link…' : 'Request booking'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={openInvite} onOpenChange={setOpenInvite}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add family account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="account-name">Full name</Label>
              <Input
                id="account-name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Jordan Feige"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="family@example.com"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-phone">Phone</Label>
              <Input
                id="account-phone"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="555-555-5555"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Linked players</Label>
              <div className="grid gap-2">
                {players.map(player => {
                  const selected = selectedPlayerIds.includes(player.id)
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => togglePlayer(player.id)}
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-muted/30 text-foreground hover:bg-muted'
                      }`}
                    >
                      {player.name}
                      {player.age ? <span className="ml-1 opacity-75">· age {player.age}</span> : null}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-muted/20 p-3">
              <p className="mb-3 text-sm font-semibold text-foreground">Create a new linked player</p>
              <div className="grid gap-2 sm:grid-cols-[1fr_80px]">
                <Input
                  value={newPlayer.name}
                  onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })}
                  placeholder="Player name"
                  className="rounded-xl"
                />
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={newPlayer.age}
                  onChange={e => setNewPlayer({ ...newPlayer, age: e.target.value })}
                  placeholder="Age"
                  className="rounded-xl"
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {['tennis', 'golf', 'pickleball', 'basketball'].map(sport => (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => setNewPlayer({ ...newPlayer, sport })}
                    className={`rounded-xl border px-2 py-2 text-xs font-medium capitalize transition-colors ${
                      newPlayer.sport === sport
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {sport}
                  </button>
                ))}
              </div>
              <Button type="button" variant="secondary" className="mt-3 w-full" onClick={createAndSelectPlayer}>
                Create and select player
              </Button>
            </div>
            {selectedPlayers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Invite will link {selectedPlayers.map(p => p.name).join(', ')} to this account.
              </p>
            )}
            {magicLink && (
              <div className="space-y-2">
                <Label>Booking request link</Label>
                <div className="rounded-xl border border-border bg-muted/50 p-3 font-mono text-xs break-all text-foreground">
                  {magicLink}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => navigator.clipboard.writeText(magicLink)}
                >
                  Copy link
                </Button>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpenInvite(false)}>
                Close
              </Button>
              <Button onClick={createAccount} disabled={saving || !email || !fullName.trim() || selectedPlayerIds.length === 0} className="gap-2">
                <Plus size={14} /> {saving ? 'Creating…' : 'Create account'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
