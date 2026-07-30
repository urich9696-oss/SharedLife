import type { WidgetProps } from '@/features/widgets/registry'
import { useEntitiesBySpace } from '@/features/widgets/use-widget-data'
import { formatDateTimeDe } from '@/features/widgets/components/widget-format'
import { WidgetShell } from '@/features/widgets/components/WidgetShell'

export function RecentActivityWidget({
  spaceId,
  entityId,
  config,
  title,
}: WidgetProps<'recent_activity'>) {
  const resolvedEntityId = config.entityId ?? entityId ?? null
  const { data: entities = [] } = useEntitiesBySpace(spaceId)

  const items = entities
    .filter((e) => !resolvedEntityId || e.id === resolvedEntityId || e.parent_entity_id === resolvedEntityId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, config.limit)

  return (
    <WidgetShell title={title ?? config.title ?? 'Letzte Aktivität'}>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">Noch keine Aktivität.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((e) => (
            <li key={e.id} className="text-sm">
              <p className="font-medium text-text">{e.title}</p>
              <p className="text-text-muted">
                {e.entity_type} · {formatDateTimeDe(e.updated_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  )
}
