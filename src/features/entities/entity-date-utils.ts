import {
  formatAllDayDate,
  formatInAppTz,
  utcIsoToAllDayDate,
  utcToZonedDate,
  zonedLocalToUtcIso,
} from '@/lib/dates/timezone'
import type { EntityRow } from '@/lib/indexed-db/schema'
import type { EntityFormValues } from '@/features/entities/entity-form-schema'

function normalizeAllDayValue(value: string): string {
  // Akzeptiert historische ISO-Werte und kanonische YYYY-MM-DD.
  return value.includes('T') ? utcIsoToAllDayDate(value) : value
}

export function entityToFormValues(entity: EntityRow): EntityFormValues {
  const allDay = !!(entity.all_day_start || entity.all_day_end)
  if (allDay) {
    return {
      title: entity.title,
      description: entity.description ?? '',
      status: entity.status,
      allDay: true,
      startDate: entity.all_day_start ? normalizeAllDayValue(entity.all_day_start) : '',
      endDate: entity.all_day_end ? normalizeAllDayValue(entity.all_day_end) : '',
    }
  }

  const start = entity.starts_at ? utcToZonedDate(entity.starts_at) : null
  const end = entity.ends_at ? utcToZonedDate(entity.ends_at) : null

  return {
    title: entity.title,
    description: entity.description ?? '',
    status: entity.status,
    allDay: false,
    startDate: start ? formatAllDayDate(start) : '',
    startTime: start
      ? `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
      : '',
    endDate: end ? formatAllDayDate(end) : '',
    endTime: end
      ? `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
      : '',
  }
}

export function formValuesToEntityDates(values: EntityFormValues): {
  starts_at: string | null
  ends_at: string | null
  all_day_start: string | null
  all_day_end: string | null
} {
  if (values.allDay) {
    // Postgres `date` + Zod `.date()` erwarten YYYY-MM-DD, kein ISO-Timestamp.
    return {
      starts_at: null,
      ends_at: null,
      all_day_start: values.startDate || null,
      all_day_end: values.endDate || null,
    }
  }

  const starts_at =
    values.startDate && values.startTime
      ? zonedLocalToUtcIso(`${values.startDate}T${values.startTime}:00`)
      : values.startDate
        ? zonedLocalToUtcIso(`${values.startDate}T00:00:00`)
        : null

  const ends_at =
    values.endDate && values.endTime
      ? zonedLocalToUtcIso(`${values.endDate}T${values.endTime}:00`)
      : values.endDate
        ? zonedLocalToUtcIso(`${values.endDate}T23:59:59`)
        : null

  return { starts_at, ends_at, all_day_start: null, all_day_end: null }
}

export function formatEntityDateRange(entity: EntityRow): string | null {
  if (entity.all_day_start) {
    const start = normalizeAllDayValue(entity.all_day_start)
    const end = entity.all_day_end ? normalizeAllDayValue(entity.all_day_end) : null
    if (end && end !== start) return `${start} – ${end}`
    return start
  }
  if (entity.starts_at) {
    const start = formatInAppTz(entity.starts_at, 'dd.MM.yyyy HH:mm')
    if (entity.ends_at) {
      return `${start} – ${formatInAppTz(entity.ends_at, 'dd.MM.yyyy HH:mm')}`
    }
    return start
  }
  return null
}
