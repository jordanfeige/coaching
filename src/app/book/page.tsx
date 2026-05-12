'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'

export default function BookingPage() {
  const [slots, setSlots] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [step, setStep] = useState<'pick' | 'details' | 'confirm'>('pick')
  const [saving, setSaving] = useState(false)
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
        .insert({ name: form.name, email: form.email, phone: form.phone, skill_level: 'beginner' })
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-2">🎾</div>
          <h1 className="text-2xl font-bold">Book a Tennis Lesson</h1>
          <p className="text-muted-foreground mt-1">Pick a time that works for you</p>
        </div>

        {step === 'confirm' ? (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <div className="text-4xl">✅</div>
              <h2 className="text-xl font-semibold">You're booked!</h2>
              <p className="text-muted-foreground">
                Your lesson on {selected && format(new Date(selected.starts_at), 'EEEE, MMMM d at h:mm a')} is confirmed.
              </p>
              <p className="text-sm text-muted-foreground">See you on the court!</p>
            </CardContent>
          </Card>
        ) : step === 'pick' ? (
          <Card>
            <CardHeader><CardTitle>Available times</CardTitle></CardHeader>
            <CardContent>
              {slots.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">No available slots right now. Check back soon!</p>
              ) : (
                <div className="space-y-2">
                  {slots.map(slot => (
                    <button key={slot.id} onClick={() => { setSelected(slot); setStep('details') }}
                      className="w-full text-left p-3 rounded-lg border hover:border-blue-400 hover:bg-blue-50 transition-colors">
                      <p className="font-medium">{format(new Date(slot.starts_at), 'EEEE, MMMM d')}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(slot.starts_at), 'h:mm a')} – {format(new Date(slot.ends_at), 'h:mm a')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Your details</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selected && format(new Date(selected.starts_at), 'EEEE, MMMM d at h:mm a')}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="555-555-5555" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('pick')}>Back</Button>
                <Button className="flex-1" onClick={handleBook}
                  disabled={saving || !form.name || !form.email}>
                  {saving ? 'Booking...' : 'Confirm booking'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}