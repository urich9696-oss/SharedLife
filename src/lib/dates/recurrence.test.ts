import { describe, expect, it } from 'vitest'
import { nextOccurrence, parseRRule, validateRRule } from '@/lib/dates/recurrence'

describe('recurrence', () => {
  it('parses a simple weekly rule with BYDAY', () => {
    const rule = parseRRule('FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE')
    expect(rule.freq).toBe('WEEKLY')
    expect(rule.interval).toBe(1)
    expect(rule.byday).toEqual([1, 3])
  })

  it('rejects invalid FREQ', () => {
    expect(() => parseRRule('FREQ=HOURLY')).toThrow()
    expect(validateRRule('FREQ=HOURLY')).toBe(false)
  })

  it('rejects COUNT and UNTIL together', () => {
    expect(() => parseRRule('FREQ=DAILY;COUNT=5;UNTIL=20261231')).toThrow()
  })

  it('computes next daily occurrence', () => {
    const after = new Date('2026-01-01T10:00:00Z')
    const next = nextOccurrence('FREQ=DAILY;INTERVAL=1', after)
    expect(next).not.toBeNull()
    expect(next!.getTime()).toBeGreaterThan(after.getTime())
  })

  it('returns null when COUNT exhausted', () => {
    const after = new Date('2026-01-10T10:00:00Z')
    const next = nextOccurrence('FREQ=DAILY;INTERVAL=1;COUNT=3', after, {
      occurrenceIndex: 3,
    })
    expect(next).toBeNull()
  })

  it('respects UNTIL boundary', () => {
    const after = new Date('2026-12-31T23:00:00Z')
    const next = nextOccurrence('FREQ=DAILY;INTERVAL=1;UNTIL=20261231', after)
    expect(next).toBeNull()
  })
})
