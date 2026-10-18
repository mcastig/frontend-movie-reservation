// Every time is shown in the cinema's timezone, never the browser's: a visitor
// from another country must see the time printed on the ticket.

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string, options: Intl.DateTimeFormatOptions, locale = 'en-GB') {
  const key = `${locale}|${timeZone}|${JSON.stringify(options)}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { timeZone, ...options })
    formatters.set(key, f)
  }
  return f
}

// "2026-10-20" for the instant, as a calendar date in the timezone.
export function dateIn(timeZone: string, instant: Date | string = new Date()): string {
  return formatter(timeZone, { year: 'numeric', month: '2-digit', day: '2-digit' }, 'en-CA').format(new Date(instant))
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

// A calendar date at noon UTC, so formatting it in UTC never shifts the day.
const calendar = (date: string) => new Date(`${date}T12:00:00Z`)

// "Tue 20"
export function formatDay(date: string): string {
  return formatter('UTC', { weekday: 'short', day: 'numeric' }).format(calendar(date))
}

// "Tue 20 Oct"
export function formatDayMonth(date: string): string {
  return formatter('UTC', { weekday: 'short', day: 'numeric', month: 'short' }).format(calendar(date))
}

// "14:00"
export function formatTime(instant: string, timeZone: string): string {
  return formatter(timeZone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(instant))
}

// "Tue 20" for an instant
export function formatDayOf(instant: string, timeZone: string): string {
  return formatDay(dateIn(timeZone, instant))
}

// "2 h 28 min", "45 min", "2 h"
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

// Minutes the timezone is ahead of UTC at that instant.
export function offsetMinutes(timeZone: string, instant: number): number {
  const parts = formatter(timeZone, { timeZoneName: 'longOffset' }).formatToParts(new Date(instant))
  const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
  const match = name.match(/GMT([+-])(\d{2}):?(\d{2})?/)
  if (!match) return 0
  const sign = match[1] === '-' ? -1 : 1
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0))
}

function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+'
  const abs = Math.abs(minutes)
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
}

// A wall-clock time in the cinema's timezone, as ISO 8601 with its offset:
// ("2026-10-21", "14:00", "Europe/Madrid") → "2026-10-21T14:00:00+02:00".
export function zonedIso(date: string, time: string, timeZone: string): string {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  const wall = Date.UTC(y, mo - 1, d, h, mi)
  // The offset depends on the instant, which depends on the offset: two passes settle DST edges.
  let offset = offsetMinutes(timeZone, wall)
  offset = offsetMinutes(timeZone, wall - offset * 60_000)
  return `${date}T${time}:00${formatOffset(offset)}`
}

export function startOfDayIso(date: string, timeZone: string) {
  return zonedIso(date, '00:00', timeZone)
}

export function endOfDayIso(date: string, timeZone: string) {
  return zonedIso(addDays(date, 1), '00:00', timeZone)
}
