import type { WidgetProps } from '@/features/widgets/registry'
import { useEntitiesBySpace } from '@/features/widgets/use-widget-data'
import { WidgetShell } from '@/features/widgets/components/WidgetShell'

export function TasksWidget({ spaceId, entityId, config, title }: WidgetProps<'tasks'>) {
  const resolvedEntityId = config.entityId ?? entityId ?? null
  const { data: entities = [] } = useEntitiesBySpace(spaceId, ['task'])

  const items = entities
    .filter((e) => {
      if (resolvedEntityId && e.parent_entity_id !== resolvedEntityId) return false
      if (!config.showCompleted && e.status === 'completed') return false
      return true
    })
    .slice(0, config.limit)

  return (
    <WidgetShell title={title ?? config.title ?? 'Aufgaben'}>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">Keine offenen Aufgaben.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li key={t.id} className="flex items-center justify-between text-sm">
              <span className="text-text">{t.title}</span>
              <span className="text-xs text-text-muted">{t.status}</span>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  )
}
