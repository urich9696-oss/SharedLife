import { useParams } from 'react-router-dom'
import { ErrorState } from '@/components/ui/ErrorState'
import { EntityDetailPage } from '@/features/entities/EntityDetailPage'
import { ENTITY_TYPES } from '@/lib/indexed-db/schema'
import type { EntityType } from '@/lib/indexed-db/schema'

export function EntityPage() {
  const { type, id } = useParams<{ type: string; id: string }>()

  if (!type || !id || !ENTITY_TYPES.includes(type as EntityType)) {
    return (
      <ErrorState title="Ungültiger Eintrag" message="Der angeforderte Typ existiert nicht." />
    )
  }

  return <EntityDetailPage type={type as EntityType} id={id} />
}
