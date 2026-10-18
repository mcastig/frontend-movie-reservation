import { describe, expect, it } from 'vitest'
import { addDays, dateIn, formatDay, formatDuration, formatTime, zonedIso } from './time'

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

  it('adds days across month ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
  })

  it('prints short days and durations', () => {
    expect(formatDay('2026-10-20')).toBe('Tue 20')
    expect(formatDuration(148)).toBe('2 h 28 min')
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(120)).toBe('2 h')
  })

  it('builds ISO times with the timezone offset, across DST', () => {
    expect(zonedIso('2026-10-21', '14:00', 'UTC')).toBe('2026-10-21T14:00:00+00:00')
    expect(zonedIso('2026-07-01', '20:30', 'Europe/Madrid')).toBe('2026-07-01T20:30:00+02:00')
    expect(zonedIso('2026-12-01', '20:30', 'Europe/Madrid')).toBe('2026-12-01T20:30:00+01:00')
    expect(zonedIso('2026-12-01', '20:30', 'America/New_York')).toBe('2026-12-01T20:30:00-05:00')
  })
})
