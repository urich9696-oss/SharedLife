import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { entityDetailPath } from '@/features/entities/entity-types'
import { useEntities } from '@/features/entities/useEntities'

/** Reise ohne verbindlichen Termin = Idee in „Mehr“. */
export function isTripIdea(entity: {
  entity_type: string
  deleted_at: string | null
  starts_at: string | null
  all_day_start: string | null
  status: string
}): boolean {
  if (entity.entity_type !== 'trip' || entity.deleted_at) return false
  if (entity.status === 'cancelled' || entity.status === 'archived') return false
  return !entity.starts_at && !entity.all_day_start
}

export function TripIdeasPage() {
  const navigate = useNavigate()
  const { data: entities = [], isLoading } = useEntities()
  const ideas = entities
    .filter(isTripIdea)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))

  if (isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-3xl px-page py-6 lg:py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-text">Reiseideen</h1>
          <p className="mt-2 text-sm text-text-muted">
            Ohne festen Termin — unter Planen wird daraus eine verbindliche Reise.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => void navigate('/planen/neu?type=trip')}>
          Neu
        </Button>
      </header>

      {ideas.length === 0 ? (
        <EmptyState
          title="Noch keine Reiseideen"
          description="Legt eine Reise ohne Datum an — oder plant später unter Planen einen Termin."
          actionLabel="Reiseidee anlegen"
          onAction={() => void navigate('/planen/neu?type=trip')}
        />
      ) : (
        <ul className="card-stack">
          {ideas.map((entity) => (
            <li key={entity.id}>
              <Link to={entityDetailPath('trip', entity.id)}>
                <Card interactive padding="md">
                  <CardTitle>{entity.title}</CardTitle>
                  <CardDescription>
                    {entity.subtitle || entity.description || 'Idee ohne Termin'}
                  </CardDescription>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
