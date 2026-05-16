'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { CheckCircle, Clock, ChevronRight } from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import { cn } from '@/lib/utils'

export default function BookingPage() {
  const [slots, setSlots] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', skill_level: 'beginner', sport: 'tennis' })
  const [step, setStep] = useState<'pick' | 'details' | 'confirm'>('pick')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadSlots() {
      const { data } = await supabase
        .from('availability')
        .select('*')
        .eq('is_booked', false)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')
      setSlots(data || [])
      setLoading(false)
    }
    loadSlots()
  }, [])

  async function handleBook() {
    if (!selected || !form.name || !form.email) return
    setSaving(true)

    let { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('email', form.email)
      .single()

    if (!player) {
      const { data: newPlayer } = await supabase
        .from('players')
        .insert({ name: form.name, email: form.email, phone: form.phone, skill_level: form.skill_level, sport: form.sport })
        .select('id')
        .single()
      player = newPlayer
    }

    await supabase.from('lessons').insert({
      player_id: player?.id,
      availability_id: selected.id,
      starts_at: selected.starts_at,
      duration_mins: 60,
      status: 'scheduled'
    })

    await supabase.from('availability').update({ is_booked: true }).eq('id', selected.id)

    setSaving(false)
    setStep('confirm')
  }

  const fieldClass =
    'w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:outline-none'

  const sports = [
    { value: 'tennis', label: '🎾 Tennis' },
    { value: 'golf', label: '⛳ Golf' },
    { value: 'pickleball', label: '🏓 Pickleball' },
    { value: 'basketball', label: '🏀 Basketball' },
  ] as const

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="text-center">
          <BrandMark variant="public" />
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
                {selected && format(new Date(selected.starts_at), 'EEEE, MMMM d at h:mm a')}
              </span>{' '}
              is confirmed.
            </p>
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
              <h2 className="text-sm font-semibold text-foreground">Your details</h2>
              {selected && <p className="mt-1 text-xs font-medium text-primary">{format(new Date(selected.starts_at), 'EEEE, MMMM d at h:mm a')}</p>}
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Full name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Jane Smith"
                  className={fieldClass}
                />
              </div>
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
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Skill level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, skill_level: s })}
                      className={cn(
                        'rounded-xl border px-2 py-2.5 text-xs font-medium capitalize transition-colors',
                        form.skill_level === s
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Sport</label>
                <div className="grid grid-cols-2 gap-2">
                  {sports.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setForm({ ...form, sport: s.value })}
                      className={cn(
                        'rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors',
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
                  disabled={saving || !form.name || !form.email}
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