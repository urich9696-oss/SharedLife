import { isBefore, parseISO, addDays } from 'date-fns'
import type { WidgetProps } from '@/features/widgets/registry'
import { useReminders } from '@/features/widgets/use-widget-data'
import { formatDateTimeDe } from '@/features/widgets/components/widget-format'
import { WidgetShell } from '@/features/widgets/components/WidgetShell'

export function RemindersWidget({ spaceId, entityId, config, title }: WidgetProps<'reminders'>) {
  const resolvedEntityId = config.entityId ?? entityId ?? null
  const { data: reminders = [] } = useReminders(spaceId, resolvedEntityId)
  const now = new Date()
  const horizon = addDays(now, config.daysAhead)

  const filtered = reminders.filter((r) => {
    const at = parseISO(r.remind_at)
    if (config.includeOverdue && isBefore(at, now)) return true
    return !isBefore(at, now) && isBefore(at, horizon)
  })

  return (
    <WidgetShell title={title ?? config.title ?? 'Erinnerungen'}>
      {filtered.length === 0 ? (
        <p className="text-sm text-text-muted">Keine anstehenden Erinnerungen.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.slice(0, 8).map((r) => (
            <li key={r.id} className="text-sm">
              <p className="font-medium text-text">{r.title}</p>
              <p className="text-text-muted">{formatDateTimeDe(r.remind_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  )
}
