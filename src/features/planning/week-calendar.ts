import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  isSameDay,
  isSameWeek,
  startOfWeek,
  subWeeks,
} from 'date-fns'

export type CalendarViewMode = 'week' | 'month'

export function weekStartsOnMonday(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

export function weekEndsOnSunday(date: Date): Date {
  return endOfWeek(date, { weekStartsOn: 1 })
}

export function daysOfWeek(anchor: Date): Date[] {
  const start = weekStartsOnMonday(anchor)
  const end = weekEndsOnSunday(anchor)
  return eachDayOfInterval({ start, end })
}

export function shiftWeek(anchor: Date, delta: number): Date {
  return delta >= 0 ? addWeeks(anchor, delta) : subWeeks(anchor, Math.abs(delta))
}

export function isCurrentWeek(anchor: Date, now: Date): boolean {
  return isSameWeek(anchor, now, { weekStartsOn: 1 })
}

export function selectDayInContext(selected: Date, nextAnchor: Date): Date {
  // Behalte den Wochentag-Index, wenn möglich; sonst Ankertag
  if (isSameDay(selected, nextAnchor)) return nextAnchor
  return selected
}

export interface WeekSwipeDecision {
  deltaWeeks: -1 | 0 | 1
}

/**
 * Horizontale Wischgeste: Distanz- und Geschwindigkeitsschwelle.
 * Vertikales Scrollen bleibt unberührt (Caller prüft Achse).
 */
export function decideWeekSwipe(input: {
  dx: number
  dy: number
  vx: number
  reducedMotion?: boolean
}): WeekSwipeDecision {
  const { dx, dy, vx, reducedMotion = false } = input
  if (Math.abs(dy) > Math.abs(dx) * 1.15) return { deltaWeeks: 0 }

  const distanceThreshold = reducedMotion ? 64 : 56
  const velocityThreshold = reducedMotion ? 0.65 : 0.45

  if (Math.abs(dx) < distanceThreshold && Math.abs(vx) < velocityThreshold) {
    return { deltaWeeks: 0 }
  }

  // Finger nach links → nächste Woche
  if (dx < 0 || vx < -velocityThreshold) return { deltaWeeks: 1 }
  if (dx > 0 || vx > velocityThreshold) return { deltaWeeks: -1 }
  return { deltaWeeks: 0 }
}
