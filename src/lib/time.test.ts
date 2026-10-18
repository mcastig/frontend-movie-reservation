import { describe, expect, it, vi } from 'vitest'
import {
  addDays,
  dateIn,
  endOfDayIso,
  formatDay,
  formatDayMonth,
  formatDayOf,
  formatDuration,
  formatTime,
  offsetMinutes,
  startOfDayIso,
  zonedIso,
} from './time'

describe('time', () => {
  it('formats times in the cinema timezone, not the browser’s', () => {
    expect(formatTime('2026-10-20T14:00:00.000Z', 'UTC')).toBe('14:00')
    expect(formatTime('2026-10-20T14:00:00.000Z', 'America/Mexico_City')).toBe('08:00')
    expect(formatTime('2026-10-20T14:00:00.000Z', 'Asia/Tokyo')).toBe('23:00')
  })

  it('finds the calendar day in the timezone', () => {
    expect(dateIn('UTC', '2026-10-20T23:30:00Z')).toBe('2026-10-20')
    expect(dateIn('Asia/Tokyo', '2026-10-20T23:30:00Z')).toBe('2026-10-21')
  })

  it('defaults to today', () => {
    vi.useFakeTimers({ now: new Date('2026-03-05T12:00:00Z') })
    expect(dateIn('UTC')).toBe('2026-03-05')
  })

  it('adds days across month ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('prints short days and durations', () => {
    expect(formatDay('2026-10-20')).toBe('Tue 20')
    expect(formatDayMonth('2026-10-20')).toBe('Tue 20 Oct')
    expect(formatDuration(148)).toBe('2 h 28 min')
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(120)).toBe('2 h')
  })

  it('prints the day of an instant in the timezone', () => {
    expect(formatDayOf('2026-10-20T23:30:00Z', 'UTC')).toBe('Tue 20')
    expect(formatDayOf('2026-10-20T23:30:00Z', 'Asia/Tokyo')).toBe('Wed 21')
  })

  it('builds ISO times with the timezone offset, across DST', () => {
    expect(zonedIso('2026-10-21', '14:00', 'UTC')).toBe('2026-10-21T14:00:00+00:00')
    expect(zonedIso('2026-07-01', '20:30', 'Europe/Madrid')).toBe('2026-07-01T20:30:00+02:00')
    expect(zonedIso('2026-12-01', '20:30', 'Europe/Madrid')).toBe('2026-12-01T20:30:00+01:00')
    expect(zonedIso('2026-12-01', '20:30', 'America/New_York')).toBe('2026-12-01T20:30:00-05:00')
    expect(zonedIso('2026-12-01', '20:30', 'Asia/Kolkata')).toBe('2026-12-01T20:30:00+05:30')
  })

  it('bounds a day in the timezone', () => {
    expect(startOfDayIso('2026-12-01', 'Europe/Madrid')).toBe('2026-12-01T00:00:00+01:00')
    expect(endOfDayIso('2026-12-31', 'Europe/Madrid')).toBe('2027-01-01T00:00:00+01:00')
  })

  describe('offsetMinutes', () => {
    const at = Date.UTC(2026, 11, 1)

    it('reads the offset from the timezone name', () => {
      expect(offsetMinutes('UTC', at)).toBe(0)
      expect(offsetMinutes('America/New_York', at)).toBe(-300)
      expect(offsetMinutes('Asia/Kolkata', at)).toBe(330)
    })

    it('reads whole-hour offsets without minutes', () => {
      vi.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts').mockReturnValue([
        { type: 'timeZoneName', value: 'GMT+05' },
      ])
      expect(offsetMinutes('Asia/Karachi', at)).toBe(300)
    })

    it('treats a missing timezone name as UTC', () => {
      vi.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts').mockReturnValue([])
      expect(offsetMinutes('Europe/Madrid', at)).toBe(0)
    })
  })
})
