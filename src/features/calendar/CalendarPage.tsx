import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { de } from 'date-fns/locale'
import { toZonedTime } from 'date-fns-tz'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { entityDetailPath } from '@/features/entities/entity-types'
import { useEntities } from '@/features/entities/useEntities'
import { APP_TIMEZONE } from '@/lib/dates/timezone'
import type { EntityRow } from '@/lib/indexed-db/schema'

function getEventsForDay(entities: EntityRow[], day: Date): EntityRow[] {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())

  return entities.filter((e) => {
    if (e.deleted_at) return false
    if (e.entity_type !== 'event' && !e.starts_at && !e.all_day_start) return false

    if (e.all_day_start) {
      const start = toZonedTime(parseISO(e.all_day_start), APP_TIMEZONE)
      const end = e.all_day_end
        ? toZonedTime(parseISO(e.all_day_end), APP_TIMEZONE)
        : start
      const rangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      const rangeEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate())
      return dayStart >= rangeStart && dayStart <= rangeEnd
    }

    if (e.starts_at) {
      const start = toZonedTime(parseISO(e.starts_at), APP_TIMEZONE)
      return isSameDay(start, day)
    }

    return false
  })
}

export function CalendarPage() {
  const navigate = useNavigate()
  const { data: entities = [], isLoading } = useEntities()
  const [month, setMonth] = useState(() => toZonedTime(new Date(), APP_TIMEZONE))

  const calendarEntities = useMemo(
    () =>
      entities.filter(
        (e) =>
          !e.deleted_at &&
          (e.entity_type === 'event' || Boolean(e.starts_at) || Boolean(e.all_day_start)),
      ),
    [entities],
  )

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  if (isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-2xl px-page py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-heading">Kalender</h1>
          <p className="mt-1 text-text-muted capitalize">
            {format(month, 'MMMM yyyy', { locale: de })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setMonth((m) => addMonths(m, -1))}>
            Zurück
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMonth(toZonedTime(new Date(), APP_TIMEZONE))}
          >
            Heute
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setMonth((m) => addMonths(m, 1))}>
            Weiter
          </Button>
        </div>
      </header>

      {calendarEntities.length === 0 ? (
        <EmptyState
          title="Keine Termine"
          description="Erstelle einen Termin über den Plus-Button."
          actionLabel="Planen"
          onAction={() => void navigate('/planen')}
        />
      ) : (
        <>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-text-muted">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayEvents = getEventsForDay(calendarEntities, day)
              const inMonth = isSameMonth(day, month)
              const isToday = isSameDay(day, toZonedTime(new Date(), APP_TIMEZONE))
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-20 rounded-lg border p-1 ${
                    inMonth ? 'border-border bg-surface' : 'border-transparent bg-bg/50 opacity-50'
                  } ${isToday ? 'ring-2 ring-primary/30' : ''}`}
                >
                  <span className="text-xs font-medium text-text-muted">{format(day, 'd')}</span>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {dayEvents.slice(0, 2).map((event) => (
                      <li key={event.id}>
                        <button
                          type="button"
                          className="w-full truncate rounded bg-primary/10 px-1 py-0.5 text-left text-[10px] text-primary hover:bg-primary/20"
                          onClick={() =>
                            void navigate(entityDetailPath(event.entity_type, event.id))
                          }
                        >
                          {event.title}
                        </button>
                      </li>
                    ))}
                    {dayEvents.length > 2 ? (
                      <li className="text-[10px] text-text-muted">+{dayEvents.length - 2}</li>
                    ) : null}
                  </ul>
                </div>
              )
            })}
          </div>

          <section className="mt-8">
            <h2 className="mb-3 font-medium text-text">Alle Termine im Monat</h2>
            <ul className="flex flex-col gap-2">
              {calendarEntities
                .filter((e) => {
                  const d = e.starts_at
                    ? toZonedTime(parseISO(e.starts_at), APP_TIMEZONE)
                    : e.all_day_start
                      ? toZonedTime(parseISO(e.all_day_start), APP_TIMEZONE)
                      : null
                  return d && isSameMonth(d, month)
                })
                .map((event) => (
                  <li key={event.id}>
                    <Card
                      interactive
                      padding="sm"
                      onClick={() => void navigate(entityDetailPath(event.entity_type, event.id))}
                    >
                      <span className="text-sm font-medium text-text">{event.title}</span>
                    </Card>
                  </li>
                ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
