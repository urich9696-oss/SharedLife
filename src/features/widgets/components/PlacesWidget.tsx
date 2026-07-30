import type { WidgetProps } from '@/features/widgets/registry'
import { useEntityLocations, useLocations } from '@/features/widgets/use-widget-data'
import { WidgetShell } from '@/features/widgets/components/WidgetShell'

export function PlacesWidget({ spaceId, entityId, config, title }: WidgetProps<'places'>) {
  const resolvedEntityId = config.entityId ?? entityId ?? null
  const { data: links = [] } = useEntityLocations(resolvedEntityId)
  const locationIds = links.slice(0, config.limit).map((l) => l.location_id)
  const { data: locations = [] } = useLocations(spaceId, locationIds)

  return (
    <WidgetShell title={title ?? config.title ?? 'Orte'}>
      {locations.length === 0 ? (
        <p className="text-sm text-text-muted">Keine Orte verknüpft.</p>
      ) : (
        <ul className="space-y-2">
          {locations.map((loc) => (
            <li key={loc.id} className="text-sm">
              <p className="font-medium text-text">{loc.name}</p>
              {(loc.city || loc.address_line) && (
                <p className="text-text-muted">
                  {[loc.address_line, loc.city].filter(Boolean).join(', ')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  )
}
