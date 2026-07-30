import type { WidgetProps } from '@/features/widgets/registry'
import { useEntitiesBySpace } from '@/features/widgets/use-widget-data'
import { formatDateDe } from '@/features/widgets/components/widget-format'
import { WidgetShell } from '@/features/widgets/components/WidgetShell'

export function MilestonesWidget({ spaceId, entityId, config, title }: WidgetProps<'milestones'>) {
  const resolvedEntityId = config.entityId ?? entityId ?? null
  const { data: entities = [] } = useEntitiesBySpace(spaceId, ['milestone'])

  const items = entities
    .filter((e) => !resolvedEntityId || e.parent_entity_id === resolvedEntityId)
    .sort((a, b) => (a.starts_at ?? '').localeCompare(b.starts_at ?? ''))
    .slice(0, config.limit)

  return (
    <WidgetShell title={title ?? config.title ?? 'Meilensteine'}>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">Keine Meilensteine.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((m) => (
            <li key={m.id} className="text-sm">
              <p className="font-medium text-text">{m.title}</p>
              {m.starts_at ? (
                <p className="text-text-muted">{formatDateDe(m.starts_at)}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  )
}
