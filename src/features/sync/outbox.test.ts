import { describe, expect, it } from 'vitest'
import { computeBackoffDelayMs } from '@/features/sync/outbox'

describe('computeBackoffDelayMs', () => {
  it('increases delay with attempt count', () => {
    const d0 = computeBackoffDelayMs(0)
    const d1 = computeBackoffDelayMs(1)
    const d2 = computeBackoffDelayMs(2)
    expect(d0).toBeGreaterThanOrEqual(1000)
    expect(d1).toBeGreaterThan(d0 * 0.9)
    expect(d2).toBeGreaterThan(d1 * 0.9)
  })

  it('caps delay at 60 seconds plus jitter', () => {
    const d = computeBackoffDelayMs(20)
    expect(d).toBeLessThanOrEqual(75_000)
    expect(d).toBeGreaterThanOrEqual(60_000)
  })

  it('adds jitter so delays are not identical', () => {
    const samples = Array.from({ length: 10 }, () => computeBackoffDelayMs(2))
    const unique = new Set(samples)
    expect(unique.size).toBeGreaterThan(1)
  })
})
