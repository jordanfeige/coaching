'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { format, startOfWeek, addDays, isSameDay, setHours } from 'date-fns'
import { CalendarPlus, Clock, Link2, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import UniversalVia from '@/components/UniversalVia'
import { formatLessonTime } from '@/lib/via-page-brief'
import { cn } from '@/lib/utils'
import { BOOKING_TIERS, bookingTierConfig, bookingTierLabel, type BookingTier } from '@/lib/booking'

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

type CellAction = { day: Date; hour: number; x: number; y: number }
type LessonForm = { player_ids: string[]; duration_mins: string | null; notes: string; booking_tier: BookingTier }

function hourLabel(hour: number) {
  if (hour === 12) return '12pm'
  if (hour > 12) return `${hour - 12}pm`
  return `${hour}am`
}

export default function SchedulePage() {
  const router = useRouter()
  const [lessons, setLessons] = useState<any[]>([])
  const [availability, setAvailability] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [cellAction, setCellAction] = useState<CellAction | null>(null)
  const [lessonModal, setLessonModal] = useState<{ day: Date; hour: number } | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [lessonForm, setLessonForm] = useState<LessonForm>({ player_ids: [], duration_mins: '60', notes: '', booking_tier: 'private' })
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [nextUpcoming, setNextUpcoming] = useState<{
    starts_at: string
    players?: { name?: string | null } | { name?: string | null }[] | null
  } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadAll()
  }, [weekStart])

  useEffect(() => {
    function handleClick() {
      setCellAction(null)
    }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  async function loadAll() {
    const weekEnd = addDays(weekStart, 7)
    const { data: l } = await supabase
      .from('lessons')
      .select('*, players(id, name)')
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
    const { data: upcoming } = await supabase
      .from('lessons')
      .select('starts_at, players(name)')
      .gte('starts_at', new Date().toISOString())
      .eq('status', 'scheduled')
      .order('starts_at', { ascending: true })
      .limit(1)
    setLessons(l || [])
    setAvailability(a || [])
    setPlayers(p || [])
    setNextUpcoming(upcoming?.[0] || null)
  }

  function handleCellClick(e: React.MouseEvent, day: Date, hour: number) {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setCellAction({ day, hour, x: rect.left, y: rect.top })
  }

  function handleAddLesson(day: Date, hour: number) {
    setCellAction(null)
    setLessonModal({ day, hour })
    setLessonForm({ player_ids: [], duration_mins: '60', notes: '', booking_tier: 'private' })
  }

  async function handleAddSlot(day: Date, hour: number, booking_tier: BookingTier) {
    setCellAction(null)
    setSaving(true)
    const tier = bookingTierConfig(booking_tier)
    await supabase.from('availability').insert({
      starts_at: setHours(day, hour).toISOString(),
      ends_at: setHours(day, hour + 1).toISOString(),
      is_booked: false,
      booking_tier,
      max_players: tier.maxPlayers,
    })
    setSaving(false)
    loadAll()
  }

  async function saveLesson() {
    if (!lessonModal || lessonForm.player_ids.length === 0) return
    setSaving(true)
    const bookingGroupId = crypto.randomUUID()
    await supabase.from('lessons').insert(lessonForm.player_ids.map(playerId => ({
      player_id: playerId,
      starts_at: setHours(lessonModal.day, lessonModal.hour).toISOString(),
      duration_mins: parseInt(lessonForm.duration_mins ?? '60'),
      status: 'scheduled',
      notes: lessonForm.notes,
      booking_group_id: bookingGroupId,
      booking_tier: lessonForm.booking_tier,
    })))
    setLessonModal(null)
    setSaving(false)
    loadAll()
  }

  async function deleteSlot(id: string) {
    await supabase.from('availability').delete().eq('id', id)
    setSelectedSlot(null)
    loadAll()
  }

  function copyBookingLink() {
    navigator.clipboard.writeText(`${window.location.origin}/book`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const groupedLessons = useMemo(() => {
    const groups = new Map<string, any>()
    for (const lesson of lessons) {
      const key = lesson.booking_group_id || lesson.id
      const existing = groups.get(key)
      const player = lesson.players
      if (existing) {
        existing.lessons.push(lesson)
        if (player?.name) existing.playerNames.push(player.name)
      } else {
        groups.set(key, {
          ...lesson,
          lessons: [lesson],
          playerNames: player?.name ? [player.name] : [],
          firstLessonId: lesson.id,
        })
      }
    }
    return [...groups.values()]
  }, [lessons])

  function getLessonForCell(day: Date, hour: number) {
    return groupedLessons.find(l => {
      const d = new Date(l.starts_at)
      return isSameDay(d, day) && d.getHours() === hour
    })
  }

  function getSlotForCell(day: Date, hour: number) {
    return availability.find(a => {
      const d = new Date(a.starts_at)
      return isSameDay(d, day) && d.getHours() === hour
    })
  }

  const weekLabel = `${format(weekDays[0], 'MMM d')} – ${format(weekDays[6], 'MMM d, yyyy')}`

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <UniversalVia
        role="coach"
        pageContext={{
          page: 'schedule',
          nextLessonPlayerName: (() => {
            const p = nextUpcoming?.players
            const name = Array.isArray(p) ? p[0]?.name : p?.name
            return name?.split(' ')[0] || undefined
          })(),
          nextLessonDate: nextUpcoming?.starts_at
            ? formatLessonTime(nextUpcoming.starts_at)
            : undefined,
        }}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">Schedule</h1>
          <p className="mt-1 text-sm text-muted-foreground">{weekLabel}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0 rounded-xl" onClick={copyBookingLink}>
          <Link2 className="size-4" />
          {copied ? 'Copied!' : 'Copy booking link'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-lg px-3"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            ← Prev
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-lg px-3"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-lg px-3"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            Next →
          </Button>
        </div>
        <span className="hidden text-xs text-muted-foreground sm:inline">Click an empty slot to book or mark open.</span>
      </div>

      {/* Desktop calendar */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:block">
        <div
          className="grid border-b border-border bg-muted/30"
          style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}
        >
          <div className="border-r border-border" />
          {weekDays.map(day => {
            const isToday = isSameDay(day, new Date())
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'border-r border-border py-3 text-center last:border-r-0',
                  isToday && 'bg-primary/[0.06]'
                )}
              >
                <p className={cn('text-xs font-semibold uppercase tracking-wide', isToday ? 'text-primary' : 'text-muted-foreground')}>
                  {format(day, 'EEE')}
                </p>
                <p className={cn('mt-0.5 text-xl font-bold tabular-nums', isToday ? 'text-primary' : 'text-foreground')}>
                  {format(day, 'd')}
                </p>
              </div>
            )
          })}
        </div>
        <div className="grid" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
          <div>
            {HOURS.map(hour => (
              <div
                key={hour}
                style={{ height: 56 }}
                className="flex items-start justify-end border-b border-border pr-2 pt-1 last:border-b-0"
              >
                <span className="text-xs tabular-nums text-muted-foreground">{hourLabel(hour)}</span>
              </div>
            ))}
          </div>
          {weekDays.map(day => (
            <div key={day.toISOString()} className="relative border-l border-border">
              {HOURS.map(hour => {
                const lesson = getLessonForCell(day, hour)
                const slot = getSlotForCell(day, hour)
                const isToday = isSameDay(day, new Date())
                return (
                  <div
                    key={hour}
                    style={{ height: 56 }}
                    className={cn(
                      'group relative border-b border-border last:border-b-0',
                      isToday && 'bg-primary/[0.03]',
                      !lesson && !slot && 'cursor-pointer hover:bg-muted/40'
                    )}
                    onClick={e => !lesson && !slot && handleCellClick(e, day, hour)}
                  >
                    {!lesson && !slot && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="text-xl font-light text-primary/40">+</span>
                      </div>
                    )}
                    {slot && !lesson && (
                      <button
                        type="button"
                        className="absolute inset-x-1 top-1 z-[1] min-h-[46px] cursor-pointer rounded-lg border border-dashed border-primary/35 bg-primary/[0.06] px-2 py-1 text-left transition-colors hover:bg-primary/10"
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedSlot(slot)
                        }}
                      >
                        <p className="text-xs font-semibold text-primary">{bookingTierLabel(slot.booking_tier)} slot</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(slot.starts_at), 'h:mm a')}</p>
                      </button>
                    )}
                    {lesson && (
                      <button
                        type="button"
                        className={cn(
                          'absolute inset-x-1 top-1 z-[2] cursor-pointer rounded-lg px-2 py-1.5 text-left shadow-sm transition-opacity hover:opacity-95',
                          lesson.status === 'completed' && 'border border-primary/25 bg-primary/15 text-foreground',
                          lesson.status === 'cancelled' && 'border border-destructive/30 bg-destructive/10 text-destructive',
                          lesson.status === 'scheduled' && 'bg-primary text-primary-foreground'
                        )}
                        style={{
                          height: Math.max((lesson.duration_mins / 60) * 56, 56) - 4,
                        }}
                        onClick={e => {
                          e.stopPropagation()
                          router.push(`/dashboard/lessons/${lesson.firstLessonId || lesson.id}`)
                        }}
                      >
                        <p className="truncate text-xs font-bold">
                          {lesson.playerNames?.length > 1
                            ? `${lesson.playerNames[0].split(' ')[0]} + ${lesson.playerNames.length - 1}`
                            : lesson.playerNames?.[0]?.split(' ')[0] || lesson.players?.name?.split(' ')[0]}
                        </p>
                        <p
                          className={cn(
                            'text-xs opacity-90',
                            lesson.status === 'scheduled' && 'text-primary-foreground/90'
                          )}
                        >
                          {format(new Date(lesson.starts_at), 'h:mm a')} · {lesson.duration_mins}m
                        </p>
                        {lesson.playerNames?.length > 1 && (
                          <p className="truncate text-[10px] opacity-90">{bookingTierLabel(lesson.booking_tier)}</p>
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile day list */}
      <div className="space-y-3 md:hidden">
        {weekDays.map(day => {
          const dayLessons = groupedLessons.filter(l => isSameDay(new Date(l.starts_at), day))
          const daySlots = availability.filter(a => isSameDay(new Date(a.starts_at), day))
          const isToday = isSameDay(day, new Date())
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'overflow-hidden rounded-2xl border bg-card shadow-sm',
                isToday ? 'border-primary/35 ring-1 ring-primary/15' : 'border-border'
              )}
            >
              <div className={cn('flex items-center justify-between px-4 py-3', isToday ? 'bg-primary/[0.06]' : 'bg-muted/30')}>
                <p className={cn('text-sm font-semibold', isToday ? 'text-primary' : 'text-foreground')}>
                  {format(day, 'EEE, MMM d')}
                  {isToday && <span className="ml-2 text-xs font-normal text-muted-foreground">Today</span>}
                </p>
                <Button size="sm" className="h-8 rounded-lg px-3 text-xs" onClick={() => handleAddLesson(day, 9)}>
                  + Add
                </Button>
              </div>
              {dayLessons.length === 0 && daySlots.length === 0 ? (
                <p className="px-4 py-3 text-xs text-muted-foreground">Nothing scheduled — tap + Add or use desktop grid.</p>
              ) : (
                <div>
                  {daySlots.map(slot => (
                    <button
                      key={slot.id}
                      type="button"
                      className="flex w-full items-center gap-2 border-t border-border px-4 py-3 text-left transition-colors hover:bg-muted/40"
                      onClick={() => setSelectedSlot(slot)}
                    >
                      <span className="size-2 shrink-0 rounded-full bg-primary" />
                      <span className="text-xs font-medium text-primary">{bookingTierLabel(slot.booking_tier)} slot</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(slot.starts_at), 'h:mm a')}</span>
                    </button>
                  ))}
                  {dayLessons.map(lesson => (
                    <button
                      key={lesson.id}
                      type="button"
                      className="flex w-full items-center justify-between border-t border-border px-4 py-3 text-left transition-colors hover:bg-muted/40"
                      onClick={() => router.push(`/dashboard/lessons/${lesson.firstLessonId || lesson.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                          {(lesson.playerNames?.[0] || lesson.players?.name || '?').charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {lesson.playerNames?.length > 1
                              ? `${lesson.playerNames[0].split(' ')[0]} + ${lesson.playerNames.length - 1}`
                              : lesson.playerNames?.[0]?.split(' ')[0] || lesson.players?.name?.split(' ')[0]}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(lesson.starts_at), 'h:mm a')} · {lesson.duration_mins} min
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'rounded-full px-2 py-1 text-xs font-medium capitalize',
                          lesson.status === 'scheduled' && 'bg-primary/15 text-primary',
                          lesson.status === 'completed' && 'bg-muted text-foreground',
                          lesson.status === 'cancelled' && 'bg-destructive/10 text-destructive'
                        )}
                      >
                        {lesson.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-primary" />
          Booked
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-sm border border-dashed border-primary/40 bg-primary/[0.06]" />
          Open slot
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-primary/20 ring-1 ring-primary/25" />
          Completed
        </div>
      </div>

      {/* Cell action popup */}
      {cellAction && (
        <div
          className="fixed z-50 w-52 rounded-2xl border border-border bg-popover p-3 shadow-xl"
          style={{
            top: cellAction.y - 10,
            left: Math.min(cellAction.x, typeof window !== 'undefined' ? window.innerWidth - 220 : cellAction.x),
          }}
          onClick={e => e.stopPropagation()}
        >
          <p className="mb-2 px-1 text-xs font-semibold text-muted-foreground">
            {format(cellAction.day, 'EEE MMM d')} · {hourLabel(cellAction.hour)}
          </p>
          <Button
            type="button"
            className="mb-2 w-full gap-2 rounded-xl"
            size="sm"
            onClick={() => handleAddLesson(cellAction.day, cellAction.hour)}
          >
            <User className="size-4" />
            Book lesson
          </Button>
          <div className="space-y-1.5">
            {BOOKING_TIERS.map(tier => (
              <Button
                key={tier.value}
                type="button"
                variant="outline"
                className="w-full justify-start gap-2 rounded-xl border-primary/30 bg-primary/[0.04] text-primary hover:bg-primary/10"
                size="sm"
                onClick={() => handleAddSlot(cellAction.day, cellAction.hour, tier.value)}
              >
                <Clock className="size-4" />
                Open {tier.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!lessonModal} onOpenChange={o => !o && setLessonModal(null)}>
        <DialogContent className="gap-0 rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Book a lesson</DialogTitle>
            <DialogDescription>
              {lessonModal &&
                `${format(lessonModal.day, 'EEEE, MMMM d')} at ${lessonModal.hour > 12 ? `${lessonModal.hour - 12}:00 pm` : lessonModal.hour === 12 ? '12:00 pm' : `${lessonModal.hour}:00 am`}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Lesson type</Label>
              <div className="grid grid-cols-3 gap-2">
                {BOOKING_TIERS.map(tier => (
                  <button
                    key={tier.value}
                    type="button"
                    onClick={() => setLessonForm({ ...lessonForm, booking_tier: tier.value, player_ids: [] })}
                    className={cn(
                      'rounded-xl border px-2 py-2 text-xs font-semibold transition-colors',
                      lessonForm.booking_tier === tier.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Players</Label>
              <div className="grid max-h-48 gap-2 overflow-y-auto pr-1">
                {players.map(p => {
                  const selected = lessonForm.player_ids.includes(p.id)
                  const maxPlayers = bookingTierConfig(lessonForm.booking_tier).maxPlayers
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setLessonForm(prev => ({
                          ...prev,
                          player_ids: selected
                            ? prev.player_ids.filter(id => id !== p.id)
                            : prev.player_ids.length < maxPlayers
                              ? [...prev.player_ids, p.id]
                              : prev.player_ids,
                        }))
                      }
                      className={cn(
                        'rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-muted/40 text-foreground hover:bg-muted'
                      )}
                    >
                      {p.name}
                      {p.age ? <span className="ml-1 opacity-75">· {p.age}</span> : null}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {lessonForm.player_ids.length}/{bookingTierConfig(lessonForm.booking_tier).maxPlayers} selected
              </p>
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={lessonForm.duration_mins ?? '60'}
                onValueChange={v => setLessonForm({ ...lessonForm, duration_mins: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                  <SelectItem value="120">120 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-notes">Notes (optional)</Label>
              <Textarea
                id="lesson-notes"
                value={lessonForm.notes}
                onChange={e => setLessonForm({ ...lessonForm, notes: e.target.value })}
                placeholder="Focus areas, reminders…"
                rows={3}
                className="resize-none rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-xl" onClick={() => setLessonModal(null)}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={saveLesson} disabled={saving || lessonForm.player_ids.length === 0}>
              {saving ? 'Saving…' : 'Book lesson'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedSlot} onOpenChange={o => !o && setSelectedSlot(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <CalendarPlus className="size-5 text-primary" />
              Open slot
            </DialogTitle>
            <DialogDescription>
              {selectedSlot &&
                `${format(new Date(selectedSlot.starts_at), 'EEEE, MMM d')} · ${format(new Date(selectedSlot.starts_at), 'h:mm a')} – ${format(new Date(selectedSlot.ends_at), 'h:mm a')}`}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This window appears on your public booking page.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSlot(null)}>
              Close
            </Button>
            <Button variant="destructive" className="rounded-xl" onClick={() => selectedSlot && deleteSlot(selectedSlot.id)}>
              Remove slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
