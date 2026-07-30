import { addDays, addMonths, addWeeks, addYears, parseISO } from 'date-fns'
import { utcToZonedDate } from '@/lib/dates/timezone'

export const RRULE_FREQ = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const
export type RRuleFreq = (typeof RRULE_FREQ)[number]

const WEEKDAY_MAP: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
}

export interface ParsedRRule {
  freq: RRuleFreq
  interval: number
  count?: number
  until?: Date
  byday?: number[]
}

export function parseRRule(rule: string): ParsedRRule {
  const parts = rule.split(';').filter(Boolean)
  const map = new Map<string, string>()

  for (const part of parts) {
    const [key, value] = part.split('=')
    if (key && value) map.set(key.toUpperCase(), value)
  }

  const freq = map.get('FREQ')
  if (!freq || !RRULE_FREQ.includes(freq as RRuleFreq)) {
    throw new Error(`Ungültige RRULE-FREQ: ${freq ?? 'fehlt'}`)
  }

  const intervalRaw = map.get('INTERVAL')
  const interval = intervalRaw ? Number(intervalRaw) : 1
  if (!Number.isInteger(interval) || interval < 1) {
    throw new Error('INTERVAL muss eine positive Ganzzahl sein')
  }

  const parsed: ParsedRRule = {
    freq: freq as RRuleFreq,
    interval,
  }

  const countRaw = map.get('COUNT')
  if (countRaw) {
    const count = Number(countRaw)
    if (!Number.isInteger(count) || count < 1) {
      throw new Error('COUNT muss eine positive Ganzzahl sein')
    }
    parsed.count = count
  }

  const untilRaw = map.get('UNTIL')
  if (untilRaw) {
    const until = untilRaw.includes('T') ? parseISO(untilRaw) : parseISO(`${untilRaw}T23:59:59Z`)
    if (Number.isNaN(until.getTime())) {
      throw new Error('UNTIL ist kein gültiges Datum')
    }
    parsed.until = until
  }

  if (parsed.count && parsed.until) {
    throw new Error('COUNT und UNTIL dürfen nicht gleichzeitig gesetzt sein')
  }

  const bydayRaw = map.get('BYDAY')
  if (bydayRaw) {
    const days = bydayRaw.split(',').map((d) => d.trim().slice(-2).toUpperCase())
    const mapped = days.map((d) => {
      const idx = WEEKDAY_MAP[d]
      if (idx === undefined) throw new Error(`Ungültiger BYDAY-Wert: ${d}`)
      return idx
    })
    parsed.byday = mapped
    if (parsed.freq !== 'WEEKLY') {
      throw new Error('BYDAY wird nur für FREQ=WEEKLY unterstützt')
    }
  }

  return parsed
}

export function validateRRule(rule: string): boolean {
  try {
    parseRRule(rule)
    return true
  } catch {
    return false
  }
}

function advanceOnce(from: Date, rule: ParsedRRule): Date {
  switch (rule.freq) {
    case 'DAILY':
      return addDays(from, rule.interval)
    case 'WEEKLY':
      return addWeeks(from, rule.interval)
    case 'MONTHLY':
      return addMonths(from, rule.interval)
    case 'YEARLY':
      return addYears(from, rule.interval)
    default:
      return from
  }
}

function alignWeeklyByDay(candidate: Date, byday: number[], tz: string): Date {
  const zoned = utcToZonedDate(candidate.toISOString(), tz)
  const currentDow = zoned.getDay()

  const sorted = [...byday].sort((a, b) => a - b)
  const next = sorted.find((d) => d > currentDow)
  const targetDow = next ?? sorted[0]
  const daysToAdd = next !== undefined ? targetDow - currentDow : 7 - currentDow + targetDow

  return addDays(candidate, daysToAdd)
}

export interface NextOccurrenceOptions {
  timezone?: string
  occurrenceIndex?: number
}

/** Compute next occurrence after `after` respecting timezone for weekly BYDAY alignment. */
export function nextOccurrence(
  ruleStr: string,
  after: Date,
  options: NextOccurrenceOptions = {},
): Date | null {
  const rule = parseRRule(ruleStr)
  const tz = options.timezone ?? 'Europe/Zurich'
  let current = new Date(after)
  let emitted = options.occurrenceIndex ?? 0

  for (let i = 0; i < 500; i++) {
    current = advanceOnce(current, rule)

    if (rule.byday && rule.freq === 'WEEKLY') {
      current = alignWeeklyByDay(current, rule.byday, tz)
    }

    if (rule.until && current > rule.until) return null

    emitted += 1
    if (rule.count && emitted > rule.count) return null

    if (current > after) return current
  }

  return null
}
