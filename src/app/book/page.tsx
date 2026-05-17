'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { CheckCircle, Clock, ChevronRight } from 'lucide-react'
import { SmartBrandMark } from '@/components/brand/SmartBrandMark'
import { cn } from '@/lib/utils'
import { bookingTierConfig, bookingTierLabel } from '@/lib/booking'
import { getLinkedPlayersForUser, type LinkedPlayer } from '@/lib/linked-player'
import { calendarEvent } from '@/lib/calendar'

type Slot = {
  id: string
  starts_at: string
  ends_at: string
  is_booked?: boolean
  booking_tier?: string | null
  max_players?: number | null
  bookedCount: number
  remaining: number
}

type NewPlayerForm = {
  name: string
  age: string
  skill_level: string
  sport: string
}

const emptyPlayer = (): NewPlayerForm => ({
  name: '',
  age: '',
  skill_level: 'beginner',
  sport: 'tennis',
})

export default function BookingPage() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [selected, setSelected] = useState<Slot | null>(null)
  const [form, setForm] = useState({ email: '', phone: '' })
  const [linkedPlayers, setLinkedPlayers] = useState<LinkedPlayer[]>([])
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [ageEdits, setAgeEdits] = useState<Record<string, string>>({})
  const [newPlayers, setNewPlayers] = useState<NewPlayerForm[]>([emptyPlayer()])
  const [step, setStep] = useState<'pick' | 'details' | 'confirm'>('pick')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bookedNames, setBookedNames] = useState<string[]>([])
  const [bookedLessonId, setBookedLessonId] = useState<string | null>(null)
  const [rescheduleLessonId, setRescheduleLessonId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const reschedule = new URLSearchParams(window.location.search).get('reschedule')
    if (reschedule) {
      queueMicrotask(() => setRescheduleLessonId(reschedule))
    }
    async function loadSlots() {
      const { data: slotRows } = await supabase
        .from('availability')
        .select('*')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')

      const ids = (slotRows ?? []).map(s => s.id)
      const { data: lessonRows } = ids.length
        ? await supabase.from('lessons').select('availability_id, player_id').in('availability_id', ids)
        : { data: [] as Array<{ availability_id: string; player_id: string }> }

      const counts = new Map<string, number>()
      for (const lesson of lessonRows ?? []) {
        counts.set(lesson.availability_id, (counts.get(lesson.availability_id) ?? 0) + 1)
      }

      const openSlots = (slotRows ?? [])
        .map(slot => {
          const tier = bookingTierConfig(slot.booking_tier)
          const maxPlayers = slot.max_players || tier.maxPlayers
          const bookedCount = counts.get(slot.id) ?? 0
          return {
            ...slot,
            bookedCount,
            remaining: Math.max(maxPlayers - bookedCount, 0),
          }
        })
        .filter(slot => slot.remaining > 0 && (!slot.is_booked || slot.max_players > 1))

      setSlots(openSlots)
      setLoading(false)
    }
    async function loadAccount() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('phone').eq('id', user.id).maybeSingle()
      setForm(f => ({ ...f, email: user.email || '', phone: profile?.phone || '' }))
      const players = await getLinkedPlayersForUser(supabase, user.id)
      setLinkedPlayers(players)
    }
    loadSlots()
    loadAccount()
  }, [])

  async function handleBook() {
    if (!selected || !form.email) return
    setSaving(true)

    const capacity = selected.remaining
    const newPlayerPayloads = newPlayers
      .map(p => ({ ...p, name: p.name.trim(), age: Number.parseInt(p.age, 10) }))
      .filter(p => p.name && !Number.isNaN(p.age))

    const chosenExisting = linkedPlayers.filter(p => selectedPlayerIds.includes(p.id))
    const totalPlayers = chosenExisting.length + newPlayerPayloads.length
    const missingExistingAges = chosenExisting.filter(p => {
      if (p.age) return false
      const editedAge = Number.parseInt(ageEdits[p.id] ?? '', 10)
      return Number.isNaN(editedAge) || editedAge < 1
    })
    if (missingExistingAges.length) {
      alert('Please add ages for all selected players.')
      setSaving(false)
      return
    }
    if (totalPlayers < 1 || totalPlayers > capacity || totalPlayers > 5) {
      alert(`Select between 1 and ${Math.min(capacity, 5)} player${Math.min(capacity, 5) === 1 ? '' : 's'} for this lesson.`)
      setSaving(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const createdIds: string[] = []
    for (const payload of newPlayerPayloads) {
      const { data: player, error } = await supabase
        .from('players')
        .insert({
          name: payload.name,
          age: payload.age,
          email: form.email,
          skill_level: payload.skill_level,
          sport: payload.sport,
        })
        .select('id')
        .single()
      if (error || !player) {
        alert(`Could not create ${payload.name}: ${error?.message || 'unknown error'}`)
        setSaving(false)
        return
      }
      createdIds.push(player.id)
    }

    if (user) {
      await supabase
        .from('profiles')
        .update({ phone: form.phone || null })
        .eq('id', user.id)
    }

    if (user && createdIds.length) {
      await supabase.from('account_players').upsert(
        createdIds.map(playerId => ({ account_id: user.id, player_id: playerId })),
        { onConflict: 'account_id,player_id' }
      )
    }

    for (const player of chosenExisting) {
      const editedAge = Number.parseInt(ageEdits[player.id] ?? '', 10)
      if (!player.age && !Number.isNaN(editedAge)) {
        await supabase.from('players').update({ age: editedAge }).eq('id', player.id)
      }
    }

    const bookingGroupId = crypto.randomUUID()
    const playerIds = [...selectedPlayerIds, ...createdIds]
    const { data: bookedLessons } = await supabase.from('lessons').insert(playerIds.map(playerId => ({
      player_id: playerId,
      availability_id: selected.id,
      starts_at: selected.starts_at,
      duration_mins: 60,
      status: 'scheduled',
      booked_by_profile_id: user?.id ?? null,
      booking_group_id: bookingGroupId,
      booking_tier: bookingTierConfig(selected.booking_tier).value,
    }))).select('id')

    const willBeFull = selected.bookedCount + playerIds.length >= (selected.max_players || bookingTierConfig(selected.booking_tier).maxPlayers)
    await supabase.from('availability').update({ is_booked: willBeFull }).eq('id', selected.id)

    if (rescheduleLessonId) {
      const { data: oldLesson } = await supabase
        .from('lessons')
        .select('id, booking_group_id, availability_id')
        .eq('id', rescheduleLessonId)
        .maybeSingle()
      if (oldLesson?.booking_group_id) {
        await supabase.from('lessons').update({ status: 'cancelled' }).eq('booking_group_id', oldLesson.booking_group_id)
      } else if (oldLesson?.id) {
        await supabase.from('lessons').update({ status: 'cancelled' }).eq('id', oldLesson.id)
      }
      if (oldLesson?.availability_id) {
        await supabase.from('availability').update({ is_booked: false }).eq('id', oldLesson.availability_id)
      }
    }

    const existingNames = chosenExisting.map(p => p.name)
    const createdNames = newPlayerPayloads.map(p => p.name)
    setBookedNames([...existingNames, ...createdNames])
    setBookedLessonId(bookedLessons?.[0]?.id ?? null)
    setSaving(false)
    setStep('confirm')
  }

  const fieldClass =
    'w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:outline-none'

  const sports = [
    { value: 'tennis', label: '🎾 Tennis' },
    { value: 'pickleball', label: '🏓 Pickleball' },
  ] as const

  const confirmationCalendar =
    selected && bookedNames.length
      ? calendarEvent({
          title: `Playvia lesson: ${bookedNames.join(', ')}`,
          startsAt: selected.starts_at,
          endsAt: selected.ends_at,
          description: `Lesson booked for ${bookedNames.join(', ')}.`,
          actionLinks:
            typeof window !== 'undefined' && bookedLessonId
              ? [
                  { label: 'Cancel lesson', url: `${window.location.origin}/player?cancel=${bookedLessonId}` },
                  { label: 'Reschedule lesson', url: `${window.location.origin}/book?reschedule=${bookedLessonId}` },
                ]
              : undefined,
        })
      : null

  const selectedMax = Math.min(selected?.remaining ?? 5, 5)
  const selectedCount =
    selectedPlayerIds.length +
    newPlayers.filter(p => p.name.trim() && Number.parseInt(p.age, 10) > 0).length
  const canAddPlayer = selectedCount < selectedMax

  function toggleExistingPlayer(id: string) {
    setSelectedPlayerIds(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id)
      if (selectedCount >= selectedMax) return prev
      return [...prev, id]
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="text-center">
          <SmartBrandMark variant="public" />
          <h1 className="font-heading mt-6 text-2xl font-bold text-foreground">Book a lesson</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pick a time that works for you</p>
        </div>

        {/* Progress indicator */}
        {step !== 'confirm' && (
          <div className="flex items-center justify-center gap-2">
            {['pick', 'details'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs font-bold transition-all',
                    step === s || (step === 'details' && s === 'pick')
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {i + 1}
                </div>
                {i === 0 && <div className="h-px w-8 bg-border" />}
              </div>
            ))}
          </div>
        )}

        {/* Confirmation */}
        {step === 'confirm' && (
          <div className="space-y-4 rounded-2xl border border-primary/25 bg-card p-8 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/15">
              <CheckCircle className="size-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">You&apos;re booked!</h2>
            <p className="text-sm text-muted-foreground">
              Your lesson on{' '}
              <span className="font-medium text-foreground">
                {selected && format(new Date(selected.starts_at), "EEEE, MMMM d 'at' h:mm a")}
              </span>{' '}
              is confirmed.
            </p>
            {bookedNames.length > 0 && (
              <p className="text-sm font-medium text-foreground">{bookedNames.join(', ')}</p>
            )}
            {confirmationCalendar && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href={confirmationCalendar.googleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Add to Google Calendar
                </a>
                <a
                  href={confirmationCalendar.icsHref}
                  download="playvia-lesson.ics"
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground"
                >
                  Add to device calendar
                </a>
              </div>
            )}
            <a
              href="/player"
              className="block rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground"
            >
              Access your account
            </a>
            <p className="text-sm text-muted-foreground">See you at your lesson!</p>
          </div>
        )}

        {/* Pick a slot */}
        {step === 'pick' && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Clock className="size-4 text-primary" strokeWidth={2} /> Available times
              </h2>
            </div>
            <div>
              {loading ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">Loading available times…</p>
              ) : slots.length === 0 ? (
                <div className="space-y-2 px-5 py-8 text-center">
                  <p className="text-sm text-muted-foreground">No available slots right now.</p>
                  <p className="text-xs text-muted-foreground">Check back soon or contact your coach directly.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {slots.map(slot => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => {
                        setSelected(slot)
                        setStep('details')
                      }}
                      className="group flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/50"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{format(new Date(slot.starts_at), 'EEEE, MMMM d')}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {format(new Date(slot.starts_at), 'h:mm a')} – {format(new Date(slot.ends_at), 'h:mm a')}
                        </p>
                        <p className="mt-1 text-xs font-medium text-primary">
                          {bookingTierLabel(slot.booking_tier)} · {slot.remaining} spot{slot.remaining !== 1 ? 's' : ''} left
                        </p>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Details form */}
        {step === 'details' && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">Who is attending?</h2>
              {selected && (
                <p className="mt-1 text-xs font-medium text-primary">
                  {format(new Date(selected.starts_at), "EEEE, MMMM d 'at' h:mm a")} · {bookingTierLabel(selected.booking_tier)} · up to {selectedMax}
                </p>
              )}
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="jane@email.com"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phone</label>
                <input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="555-555-5555"
                  className={fieldClass}
                />
              </div>

              {linkedPlayers.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground">Players in your account</label>
                  <div className="grid gap-2">
                    {linkedPlayers.map(player => {
                      const selectedPlayer = selectedPlayerIds.includes(player.id)
                      return (
                        <div
                          key={player.id}
                          className={cn(
                            'rounded-xl border p-3 transition-colors',
                            selectedPlayer ? 'border-primary bg-primary/8' : 'border-border bg-muted/20'
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => toggleExistingPlayer(player.id)}
                            className="flex w-full items-center justify-between gap-3 text-left"
                          >
                            <span>
                              <span className="block text-sm font-semibold text-foreground">{player.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {player.age ? `Age ${player.age}` : 'Age needed'}
                              </span>
                            </span>
                            <span
                              className={cn(
                                'rounded-full px-2 py-1 text-xs font-semibold',
                                selectedPlayer ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {selectedPlayer ? 'Selected' : 'Select'}
                            </span>
                          </button>
                          {selectedPlayer && !player.age && (
                            <input
                              type="number"
                              min={1}
                              max={120}
                              value={ageEdits[player.id] ?? ''}
                              onChange={e => setAgeEdits({ ...ageEdits, [player.id]: e.target.value })}
                              placeholder="Age"
                              className={cn(fieldClass, 'mt-3')}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-xs font-medium text-muted-foreground">Add player details</label>
                {newPlayers.map((player, index) => (
                  <div key={index} className="space-y-3 rounded-2xl border border-border bg-muted/20 p-3">
                    <div className="grid gap-2 sm:grid-cols-[1fr_80px]">
                      <input
                        value={player.name}
                        onChange={e => setNewPlayers(prev => prev.map((p, i) => i === index ? { ...p, name: e.target.value } : p))}
                        placeholder="Player name"
                        className={fieldClass}
                      />
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={player.age}
                        onChange={e => setNewPlayers(prev => prev.map((p, i) => i === index ? { ...p, age: e.target.value } : p))}
                        placeholder="Age"
                        className={fieldClass}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(['beginner', 'intermediate', 'advanced'] as const).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setNewPlayers(prev => prev.map((p, i) => i === index ? { ...p, skill_level: s } : p))}
                          className={cn(
                            'rounded-xl border px-2 py-2 text-xs font-medium capitalize transition-colors',
                            player.skill_level === s
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background text-muted-foreground hover:bg-muted'
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {sports.map(s => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setNewPlayers(prev => prev.map((p, i) => i === index ? { ...p, sport: s.value } : p))}
                          className={cn(
                            'rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors',
                            player.sport === s.value
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background text-muted-foreground hover:bg-muted'
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    {newPlayers.length > 1 && (
                      <button
                        type="button"
                        className="text-xs font-medium text-destructive"
                        onClick={() => setNewPlayers(prev => prev.filter((_, i) => i !== index))}
                      >
                        Remove player
                      </button>
                    )}
                  </div>
                ))}
                {canAddPlayer && (
                  <button
                    type="button"
                    className="w-full rounded-xl border border-dashed border-primary/40 bg-primary/[0.04] py-2.5 text-sm font-semibold text-primary"
                    onClick={() => setNewPlayers(prev => [...prev, emptyPlayer()])}
                  >
                    Add another player
                  </button>
                )}
                <p className="text-xs text-muted-foreground">
                  {selectedCount}/{selectedMax} player{selectedMax !== 1 ? 's' : ''} selected for this slot.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('pick')}
                  className="flex-1 rounded-xl border border-border bg-muted/40 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleBook}
                  disabled={saving || !form.email || selectedCount < 1 || selectedCount > selectedMax}
                  className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
                >
                  {saving ? 'Booking…' : 'Confirm booking'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}