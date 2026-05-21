/** Monday 00:00 local (server) week boundary — v1 acceptable per product spec. */
export function getWeekStart(from: Date = new Date()): Date {
  const d = new Date(from)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function formatWeekOf(weekStart: Date): string {
  return weekStart.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function formatDoneWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short' })
}

export function weekStartIso(from: Date = new Date()): string {
  return getWeekStart(from).toISOString()
}
