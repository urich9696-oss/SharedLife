import { addDays, isBefore, parseISO } from 'date-fns'
import type { WidgetProps } from '@/features/widgets/registry'
import { useEntitiesBySpace } from '@/features/widgets/use-widget-data'
import { formatDateDe } from '@/features/widgets/components/widget-format'
import { WidgetShell } from '@/features/widgets/components/WidgetShell'

export function UpcomingEventsWidget({
  spaceId,
  config,
  title,
}: WidgetProps<'upcoming_events'>) {
  const { data: entities = [] } = useEntitiesBySpace(spaceId, config.entityTypes)
  const now = new Date()
  const horizon = addDays(now, config.daysAhead)

  const upcoming = entities
    .filter((e) => {
      const start = e.starts_at ?? e.all_day_start
      if (!start) return false
      const d = parseISO(start.includes('T') ? start : `${start}T00:00:00`)
      return !isBefore(d, now) && isBefore(d, horizon)
    })
    .sort((a, b) => {
      const aStart = a.starts_at ?? a.all_day_start ?? ''
      const bStart = b.starts_at ?? b.all_day_start ?? ''
      return aStart.localeCompare(bStart)
    })
    .slice(0, 10)

  return (
    <WidgetShell title={title ?? config.title ?? 'Kommende Termine'}>
      {upcoming.length === 0 ? (
        <p className="text-sm text-text-muted">Keine Termine in den nächsten {config.daysAhead} Tagen.</p>
      ) : (
        <ul className="space-y-2">
          {upcoming.map((e) => (
            <li key={e.id} className="text-sm">
              <p className="font-medium text-text">{e.title}</p>
              <p className="text-text-muted">
                {formatDateDe(e.starts_at ?? e.all_day_start ?? e.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  )
}
