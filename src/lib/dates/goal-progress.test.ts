import { describe, expect, it } from 'vitest'
import { computeGoalProgressPercent } from '@/lib/dates/goal-progress'

describe('computeGoalProgressPercent', () => {
  it('computes percent kind from current/target', () => {
    expect(computeGoalProgressPercent({ kind: 'percent', current: 50, target: 100 })).toBe(50)
    expect(computeGoalProgressPercent({ kind: 'percent', current: 150, target: 100 })).toBe(100)
  })

  it('computes amount kind', () => {
    expect(computeGoalProgressPercent({ kind: 'amount', current: 250, target: 1000 })).toBe(25)
  })

  it('computes count kind', () => {
    expect(computeGoalProgressPercent({ kind: 'count', current: 3, target: 10 })).toBe(30)
  })

  it('uses manual percent directly', () => {
    expect(computeGoalProgressPercent({ kind: 'manual', percent: 72.4 })).toBe(72.4)
  })

  it('clamps to 0–100', () => {
    expect(computeGoalProgressPercent({ kind: 'manual', percent: -5 })).toBe(0)
    expect(computeGoalProgressPercent({ kind: 'manual', percent: 120 })).toBe(100)
  })
})
