import { describe, expect, it } from 'vitest'
import { getTripCountdown } from '@/features/trips/trip-countdown'

describe('getTripCountdown', () => {
  const now = new Date(2026, 7, 1, 12, 0, 0) // 1. Aug 2026

  it('counts days for starts_at', () => {
    const result = getTripCountdown(
      {
        starts_at: new Date(2026, 7, 13, 10, 0, 0).toISOString(),
        ends_at: new Date(2026, 7, 20, 18, 0, 0).toISOString(),
        all_day_start: null,
        all_day_end: null,
      },
      now,
    )
    expect(result.phase).toBe('upcoming')
    expect(result.daysUntilStart).toBe(12)
    expect(result.label).toBe('Noch 12 Tage')
  })

  it('counts days for all_day_start', () => {
    const result = getTripCountdown(
      {
        starts_at: null,
        ends_at: null,
        all_day_start: '2026-08-02',
        all_day_end: '2026-08-05',
      },
      now,
    )
    expect(result.phase).toBe('upcoming')
    expect(result.daysUntilStart).toBe(1)
    expect(result.label).toBe('Noch 1 Tag')
  })

  it('marks today', () => {
    const result = getTripCountdown(
      {
        starts_at: null,
        ends_at: null,
        all_day_start: '2026-08-01',
        all_day_end: '2026-08-03',
      },
      now,
    )
    expect(result.phase).toBe('today')
    expect(result.label).toBe('Heute')
  })

  it('marks ongoing after start', () => {
    const result = getTripCountdown(
      {
        starts_at: null,
        ends_at: null,
        all_day_start: '2026-07-30',
        all_day_end: '2026-08-05',
      },
      now,
    )
    expect(result.phase).toBe('ongoing')
    expect(result.label).toBe('Unterwegs')
  })

  it('returns none without date', () => {
    const result = getTripCountdown(
      {
        starts_at: null,
        ends_at: null,
        all_day_start: null,
        all_day_end: null,
      },
      now,
    )
    expect(result.phase).toBe('none')
    expect(result.label).toBeNull()
  })
})
