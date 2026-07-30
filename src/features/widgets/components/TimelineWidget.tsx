import type { WidgetProps } from '@/features/widgets/registry'
import { useTimelineEntries } from '@/features/widgets/use-widget-data'
import { formatDateTimeDe } from '@/features/widgets/components/widget-format'
import { WidgetShell } from '@/features/widgets/components/WidgetShell'

export function TimelineWidget({ spaceId, entityId, config, title }: WidgetProps<'timeline'>) {
  const resolvedEntityId = config.entityId ?? entityId ?? null
  const { data: entries = [] } = useTimelineEntries(spaceId, resolvedEntityId)
  const items = entries.slice(0, config.limit)

  return (
    <WidgetShell title={title ?? config.title ?? 'Zeitleiste'}>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">Keine Einträge.</p>
      ) : (
        <ol className="relative space-y-4 border-l border-border pl-4">
          {items.map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[1.3rem] top-1 size-2 rounded-full bg-primary" />
              <p className="text-sm font-medium text-text">{entry.title}</p>
              <p className="text-xs text-text-muted">{formatDateTimeDe(entry.occurred_at)}</p>
              {entry.body ? <p className="mt-1 text-sm text-text-muted">{entry.body}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </WidgetShell>
  )
}
