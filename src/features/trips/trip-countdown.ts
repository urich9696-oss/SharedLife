import { differenceInCalendarDays, parseISO } from 'date-fns'
import { parseAllDayDate } from '@/lib/dates/timezone'
import type { EntityRow } from '@/lib/indexed-db/schema'

export type TripCountdownPhase = 'upcoming' | 'today' | 'ongoing' | 'past' | 'none'

export interface TripCountdown {
  phase: TripCountdownPhase
  /** Kalendertage bis zum Startdatum (negativ = Start liegt in der Vergangenheit) */
  daysUntilStart: number | null
  start: Date | null
  end: Date | null
  /** Kurzer Anzeigetext, z. B. „Noch 12 Tage“ */
  label: string | null
  /** Längere Unterzeile */
  detail: string | null
}

function entityStart(entity: Pick<EntityRow, 'starts_at' | 'all_day_start'>): Date | null {
  if (entity.all_day_start) {
    const raw = entity.all_day_start.includes('T')
      ? entity.all_day_start.slice(0, 10)
      : entity.all_day_start
    return parseAllDayDate(raw)
  }
  if (entity.starts_at) return parseISO(entity.starts_at)
  return null
}

function entityEnd(
  entity: Pick<EntityRow, 'ends_at' | 'all_day_end' | 'starts_at' | 'all_day_start'>,
): Date | null {
  if (entity.all_day_end) {
    const raw = entity.all_day_end.includes('T')
      ? entity.all_day_end.slice(0, 10)
      : entity.all_day_end
    return parseAllDayDate(raw)
  }
  if (entity.ends_at) return parseISO(entity.ends_at)
  return entityStart(entity)
}

/** Countdown einer Reise bis zum Startdatum (auch starts_at und all_day_start). */
export function getTripCountdown(
  entity: Pick<EntityRow, 'starts_at' | 'ends_at' | 'all_day_start' | 'all_day_end'>,
  now: Date = new Date(),
): TripCountdown {
  const start = entityStart(entity)
  const end = entityEnd(entity)

  if (!start) {
    return {
      phase: 'none',
      daysUntilStart: null,
      start: null,
      end,
      label: null,
      detail: null,
    }
  }

  const daysUntilStart = differenceInCalendarDays(start, now)
  const daysUntilEnd = end ? differenceInCalendarDays(end, now) : daysUntilStart

  if (daysUntilStart > 1) {
    return {
      phase: 'upcoming',
      daysUntilStart,
      start,
      end,
      label: `Noch ${daysUntilStart} Tage`,
      detail: 'bis zum Start',
    }
  }
  if (daysUntilStart === 1) {
    return {
      phase: 'upcoming',
      daysUntilStart,
      start,
      end,
      label: 'Noch 1 Tag',
      detail: 'bis zum Start',
    }
  }
  if (daysUntilStart === 0) {
    return {
      phase: 'today',
      daysUntilStart: 0,
      start,
      end,
      label: 'Heute',
      detail: 'Reisebeginn',
    }
  }
  if (daysUntilEnd >= 0) {
    return {
      phase: 'ongoing',
      daysUntilStart,
      start,
      end,
      label: 'Unterwegs',
      detail: daysUntilEnd === 0 ? 'letzter Tag' : `noch ${daysUntilEnd} Tage`,
    }
  }
  return {
    phase: 'past',
    daysUntilStart,
    start,
    end,
    label: 'Vorbei',
    detail: 'Reise abgeschlossen',
  }
}
