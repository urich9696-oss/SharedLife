import { useQuery } from '@tanstack/react-query'
import { Select } from '@/components/ui/Select'
import {
  MOMENT_BELONGING_TYPES,
  TASK_ASSIGNMENT_TYPES,
} from '@/features/entities/detail/detail-groups'
import { listEntitiesByType } from '@/lib/indexed-db/repositories/entities'
import type { EntityType } from '@/lib/indexed-db/schema'

async function loadOptions(spaceId: string, types: EntityType[]) {
  const lists = await Promise.all(types.map((t) => listEntitiesByType(spaceId, t)))
  return lists
    .flat()
    .filter((e) => !e.deleted_at)
    .sort((a, b) => a.title.localeCompare(b.title, 'de'))
    .map((e) => ({
      value: e.id,
      label: `${e.title} (${
        e.entity_type === 'trip'
          ? 'Reise'
          : e.entity_type === 'event'
            ? 'Termin'
            : e.entity_type === 'goal'
              ? 'Ziel'
              : e.entity_type === 'date'
                ? 'Date'
                : e.entity_type
      })`,
    }))
}

export function MomentBelongingSelect({
  spaceId,
  value,
  onChange,
}: {
  spaceId: string
  value: string
  onChange: (entityId: string) => void
}) {
  const { data: options = [] } = useQuery({
    queryKey: ['belonging-options-moment', spaceId],
    queryFn: () => loadOptions(spaceId, MOMENT_BELONGING_TYPES),
    enabled: Boolean(spaceId),
  })

  return (
    <Select
      label="Gehört zu"
      options={[{ value: '', label: 'Keine Zuordnung' }, ...options]}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function TaskAssignmentSelect({
  spaceId,
  value,
  onChange,
}: {
  spaceId: string
  value: string
  onChange: (entityId: string) => void
}) {
  const { data: options = [] } = useQuery({
    queryKey: ['belonging-options-task', spaceId],
    queryFn: () => loadOptions(spaceId, TASK_ASSIGNMENT_TYPES),
    enabled: Boolean(spaceId),
  })

  return (
    <Select
      label="Zuordnung"
      options={[{ value: '', label: 'Keine Zuordnung' }, ...options]}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function TripBelongingSelect({
  spaceId,
  value,
  onChange,
  label = 'Zuordnung',
  types = ['trip', 'event'],
}: {
  spaceId: string
  value: string
  onChange: (entityId: string) => void
  label?: string
  /** Standard: Reise oder Termin/Ereignis */
  types?: EntityType[]
}) {
  const { data: options = [] } = useQuery({
    queryKey: ['belonging-options-trip', spaceId, types.join(',')],
    queryFn: () => loadOptions(spaceId, types),
    enabled: Boolean(spaceId),
  })

  return (
    <Select
      label={label}
      options={[{ value: '', label: 'Keine Zuordnung' }, ...options]}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
