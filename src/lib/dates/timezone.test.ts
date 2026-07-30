import { describe, expect, it } from 'vitest'
import {
  allDayDateToUtcIso,
  formatAllDayDate,
  parseAllDayDate,
  utcIsoToAllDayDate,
} from '@/lib/dates/timezone'

describe('all-day date handling', () => {
  it('parses YYYY-MM-DD without timezone shift', () => {
    const d = parseAllDayDate('2026-07-15')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(6)
    expect(d.getDate()).toBe(15)
  })

  it('formats calendar date back to YYYY-MM-DD', () => {
    const d = parseAllDayDate('2026-03-08')
    expect(formatAllDayDate(d)).toBe('2026-03-08')
  })

  it('round-trips through UTC storage without changing the day', () => {
    const iso = allDayDateToUtcIso('2026-12-25')
    expect(utcIsoToAllDayDate(iso)).toBe('2026-12-25')
  })

  it('does not shift day when stored as UTC midnight', () => {
    const zurichWinter = allDayDateToUtcIso('2026-01-15')
    expect(utcIsoToAllDayDate(zurichWinter)).toBe('2026-01-15')
    const zurichSummer = allDayDateToUtcIso('2026-07-15')
    expect(utcIsoToAllDayDate(zurichSummer)).toBe('2026-07-15')
  })
})
