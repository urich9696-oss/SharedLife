import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { entityDetailPath, getEntityTypeMeta } from '@/features/entities/entity-types'
import { useDeletedEntities, useRestoreEntity } from '@/features/entities/useEntities'
import { formatInAppTz } from '@/lib/dates/timezone'

export function TrashPage() {
  const { data: items = [], isLoading } = useDeletedEntities()
  const restore = useRestoreEntity()

  if (isLoading) return <LoadingState />

  if (items.length === 0) {
    return (
      <EmptyState
        title="Papierkorb ist leer"
        description="Gelöschte Einträge bleiben 30 Tage hier, bevor sie endgültig entfernt werden."
      />
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-heading">Papierkorb</h1>
        <p className="mt-2 text-text-muted">
          Gelöschte Einträge können wiederhergestellt werden.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {items
          .sort((a, b) => (b.deleted_at ?? '').localeCompare(a.deleted_at ?? ''))
          .map((entity) => {
            const meta = getEntityTypeMeta(entity.entity_type)
            return (
              <li key={entity.id}>
                <Card padding="md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-text-muted">{meta.label}</p>
                      <Link
                        to={entityDetailPath(entity.entity_type, entity.id)}
                        className="font-medium text-text hover:text-primary"
                      >
                        {entity.title}
                      </Link>
                      {entity.deleted_at ? (
                        <p className="mt-1 text-xs text-text-muted">
                          Gelöscht am {formatInAppTz(entity.deleted_at, 'dd.MM.yyyy HH:mm')}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={restore.isPending}
                      onClick={() => restore.mutate(entity.id)}
                    >
                      Wiederherstellen
                    </Button>
                  </div>
                </Card>
              </li>
            )
          })}
      </ul>
    </div>
  )
}
