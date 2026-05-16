type CalendarEventInput = {
  title: string
  startsAt: string | Date
  endsAt?: string | Date | null
  durationMins?: number | null
  description?: string
  location?: string
  actionLinks?: Array<{ label: string; url: string }>
}

function asDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value)
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000)
}

function calendarStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

export function calendarEvent(input: CalendarEventInput) {
  const start = asDate(input.startsAt)
  const end = input.endsAt ? asDate(input.endsAt) : addMinutes(start, input.durationMins || 60)
  const title = input.title
  const actions = input.actionLinks?.length
    ? `\n\n${input.actionLinks.map(link => `${link.label}: ${link.url}`).join('\n')}`
    : ''
  const description = `${input.description || ''}${actions}`
  const location = input.location || ''

  const googleParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${calendarStamp(start)}/${calendarStamp(end)}`,
    details: description,
    location,
  })

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Playvia//Lesson Booking//EN',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@playvia`,
    `DTSTAMP:${calendarStamp(new Date())}`,
    `DTSTART:${calendarStamp(start)}`,
    `DTEND:${calendarStamp(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
    description ? `DESCRIPTION:${escapeIcs(description)}` : '',
    location ? `LOCATION:${escapeIcs(location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')

  return {
    googleUrl: `https://calendar.google.com/calendar/render?${googleParams.toString()}`,
    icsHref: `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`,
  }
}
