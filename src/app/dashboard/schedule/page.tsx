'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Calendar, Clock, User, Trash2, Link as LinkIcon } from 'lucide-react'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'

export default function SchedulePage() {
  const [lessons, setLessons] = useState<any[]>([])
  const [availability, setAvailability] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [openLesson, setOpenLesson] = useState(false)
  const [openSlot, setOpenSlot] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lessonForm, setLessonForm] = useState({ player_id: '', starts_at: '', duration_mins: '60' })
  const [slotForm, setSlotForm] = useState({ starts_at: '', ends_at: '' })
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadAll() }, [weekStart])

  async function loadAll() {
    const weekEnd = addDays(weekStart, 7)
    const { data: l } = await supabase
      .from('lessons')
      .select('*, players(name)')
      .gte('starts_at', weekStart.toISOString())
      .lte('starts_at', weekEnd.toISOString())
      .order('starts_at')
    const { data: a } = await supabase
      .from('availability')
      .select('*')
      .gte('starts_at', weekStart.toISOString())
      .lte('starts_at', weekEnd.toISOString())
      .order('starts_at')
    const { data: p } = await supabase.from('players').select('*').order('name')
    setLessons(l || [])
    setAvailability(a || [])
    setPlayers(p || [])
  }

  async function addLesson() {
    if (!lessonForm.player_id || !lessonForm.starts_at) return
    setSaving(true)
    await supabase.from('lessons').insert({
      player_id: lessonForm.player_id,
      starts_at: new Date(lessonForm.starts_at).toISOString(),
      duration_mins: parseInt(lessonForm.duration_mins),
      status: 'scheduled'
    })
    setLessonForm({ player_id: '', starts_at: '', duration_mins: '60' })
    setOpenLesson(false)
    setSaving(false)
    loadAll()
  }

  async function addSlot() {
    if (!slotForm.starts_at || !slotForm.ends_at) return
    setSaving(true)
    await supabase.from('availability').insert({
      starts_at: new Date(slotForm.starts_at).toISOString(),
      ends_at: new Date(slotForm.ends_at).toISOString(),
      is_booked: false
    })
    setSlotForm({ starts_at: '', ends_at: '' })
    setOpenSlot(false)
    setSaving(false)
    loadAll()
  }

  async function deleteLesson(id: string) {
    await supabase.from('lessons').delete().eq('id', id)
    loadAll()
  }

  async function deleteSlot(id: string) {
    await supabase.from('availability').delete().eq('id', id)
    loadAll()
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('lessons').update({ status }).eq('id', id)
    loadAll()
  }

  function copyBookingLink() {
    const url = `${window.location.origin}/book`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const statusColor: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
          <p className="text-muted-foreground mt-1">
            Week of {format(weekStart, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyBookingLink} className="flex items-center gap-2">
            <LinkIcon size={14} />
            {copied ? 'Copied!' : 'Copy booking link'}
          </Button>
          <Button variant="outline" onClick={() => setOpenSlot(true)} className="flex items-center gap-2">
            <Clock size={14} /> Add open slot
          </Button>
          <Button onClick={() => setOpenLesson(true)} className="flex items-center gap-2">
            <Plus size={14} /> Book lesson
          </Button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>← Prev week</Button>
        <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
        <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>Next week →</Button>
      </div>

      {/* Weekly grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(day => {
          const dayLessons = lessons.filter(l => isSameDay(new Date(l.starts_at), day))
          const daySlots = availability.filter(a => isSameDay(new Date(a.starts_at), day))
          const isToday = isSameDay(day, new Date())

          return (
            <div key={day.toISOString()} className={`min-h-32 rounded-lg border p-2 ${isToday ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}`}>
              <p className={`text-xs font-semibold mb-2 ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                {format(day, 'EEE')}<br />
                <span className={`text-lg ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                  {format(day, 'd')}
                </span>
              </p>
              <div className="space-y-1">
                {daySlots.map(slot => (
                  <div key={slot.id} className="text-xs bg-gray-100 rounded p-1 flex items-center justify-between">
                    <span className="text-gray-500">{format(new Date(slot.starts_at), 'h:mm a')}</span>
                    <button onClick={() => deleteSlot(slot.id)} className="text-gray-400 hover:text-red-500 ml-1">×</button>
                  </div>
                ))}
                {dayLessons.map(lesson => (
                  <div key={lesson.id} className="text-xs bg-blue-600 text-white rounded p-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{lesson.players?.name}</span>
                      <button onClick={() => deleteLesson(lesson.id)} className="text-blue-200 hover:text-white ml-1">×</button>
                    </div>
                    <div>{format(new Date(lesson.starts_at), 'h:mm a')}</div>
                    <select
                      value={lesson.status}
                      onChange={e => updateStatus(lesson.id, e.target.value)}
                      className="w-full bg-blue-700 text-white text-xs rounded px-1 py-0.5 mt-1"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Upcoming lessons list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar size={16} /> This week's lessons
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lessons.length === 0 ? (
            <p className="text-muted-foreground text-sm">No lessons this week.</p>
          ) : (
            <div className="space-y-2">
              {lessons.map(lesson => (
                <div key={lesson.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <User size={16} className="text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{lesson.players?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(lesson.starts_at), 'EEEE, MMM d • h:mm a')} · {lesson.duration_mins} min
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[lesson.status]}`}>
                      {lesson.status}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => deleteLesson(lesson.id)}
                      className="text-muted-foreground hover:text-destructive">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Book lesson dialog */}
      <Dialog open={openLesson} onOpenChange={setOpenLesson}>
        <DialogContent>
          <DialogHeader><DialogTitle>Book a lesson</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Player</Label>
              <Select value={lessonForm.player_id} onValueChange={v => setLessonForm({ ...lessonForm, player_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select a player" /></SelectTrigger>
                <SelectContent>
                  {players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date & time</Label>
              <Input type="datetime-local" value={lessonForm.starts_at}
                onChange={e => setLessonForm({ ...lessonForm, starts_at: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Select value={lessonForm.duration_mins} onValueChange={v => setLessonForm({ ...lessonForm, duration_mins: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                  <SelectItem value="120">120 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpenLesson(false)}>Cancel</Button>
              <Button onClick={addLesson} disabled={saving || !lessonForm.player_id || !lessonForm.starts_at}>
                {saving ? 'Saving...' : 'Book lesson'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add open slot dialog */}
      <Dialog open={openSlot} onOpenChange={setOpenSlot}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add open availability slot</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Players will see this slot on your public booking page.</p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Start time</Label>
              <Input type="datetime-local" value={slotForm.starts_at}
                onChange={e => setSlotForm({ ...slotForm, starts_at: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>End time</Label>
              <Input type="datetime-local" value={slotForm.ends_at}
                onChange={e => setSlotForm({ ...slotForm, ends_at: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpenSlot(false)}>Cancel</Button>
              <Button onClick={addSlot} disabled={saving || !slotForm.starts_at || !slotForm.ends_at}>
                {saving ? 'Saving...' : 'Add slot'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}