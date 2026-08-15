import { describe, expect, it } from 'vitest'
import {
  daysOfWeek,
  decideWeekSwipe,
  isCurrentWeek,
  shiftWeek,
  weekStartsOnMonday,
} from '@/features/planning/week-calendar'

describe('week-calendar V8', () => {
  const wednesday = new Date(2026, 7, 5) // Wed Aug 5 2026

  it('startet Woche montags', () => {
    const start = weekStartsOnMonday(wednesday)
    expect(start.getDay()).toBe(1)
    expect(start.getDate()).toBe(3)
  })

  it('liefert Mo–So', () => {
    const days = daysOfWeek(wednesday)
    expect(days).toHaveLength(7)
    expect(days[0]!.getDay()).toBe(1)
    expect(days[6]!.getDay()).toBe(0)
  })

  it('Pfeile wechseln exakt eine Woche', () => {
    const next = shiftWeek(wednesday, 1)
    const prev = shiftWeek(wednesday, -1)
    expect(Math.round((next.getTime() - wednesday.getTime()) / 86400000)).toBe(7)
    expect(Math.round((wednesday.getTime() - prev.getTime()) / 86400000)).toBe(7)
  })

  it('Wischgeste wechselt exakt eine Woche', () => {
    expect(decideWeekSwipe({ dx: -80, dy: 5, vx: -0.2 }).deltaWeeks).toBe(1)
    expect(decideWeekSwipe({ dx: 80, dy: 5, vx: 0.2 }).deltaWeeks).toBe(-1)
    expect(decideWeekSwipe({ dx: -10, dy: 40, vx: 0 }).deltaWeeks).toBe(0)
  })

  it('Heute liegt in der aktuellen Woche', () => {
    expect(isCurrentWeek(wednesday, wednesday)).toBe(true)
    expect(isCurrentWeek(shiftWeek(wednesday, 2), wednesday)).toBe(false)
  })
})
