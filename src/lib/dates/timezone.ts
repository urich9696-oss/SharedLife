import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'
import { parseISO, startOfDay } from 'date-fns'

export const APP_TIMEZONE = 'Europe/Zurich'

/** Format an instant for display in Europe/Zurich. */
export function formatInAppTz(iso: string, pattern = 'dd.MM.yyyy HH:mm'): string {
  return formatInTimeZone(parseISO(iso), APP_TIMEZONE, pattern)
}

/** Parse a calendar date (YYYY-MM-DD) without timezone shift. */
export function parseAllDayDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Serialize a local calendar date to YYYY-MM-DD (no TZ conversion). */
export function formatAllDayDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Convert local calendar date to UTC midnight ISO for storage consistency. */
export function allDayDateToUtcIso(dateStr: string): string {
  const local = parseAllDayDate(dateStr)
  return new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate())).toISOString()
}

/** Read stored all-day date back as YYYY-MM-DD without shifting the day. */
export function utcIsoToAllDayDate(iso: string): string {
  const d = parseISO(iso)
  return formatAllDayDate(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/** Store an instant as UTC ISO string. */
export function instantToUtcIso(date: Date): string {
  return date.toISOString()
}

/** Interpret a zoned local datetime string in Europe/Zurich and return UTC ISO. */
export function zonedLocalToUtcIso(localIso: string, tz = APP_TIMEZONE): string {
  return fromZonedTime(parseISO(localIso), tz).toISOString()
}

/** Convert UTC instant to zoned Date object in Europe/Zurich. */
export function utcToZonedDate(iso: string, tz = APP_TIMEZONE): Date {
  return toZonedTime(parseISO(iso), tz)
}

/** Start of calendar day in Zurich, returned as UTC ISO. */
export function startOfZonedDayUtc(dateStr: string, tz = APP_TIMEZONE): string {
  const local = parseAllDayDate(dateStr)
  const zonedStart = startOfDay(local)
  return fromZonedTime(zonedStart, tz).toISOString()
}
