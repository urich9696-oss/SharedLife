import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { FinanceDashboardPage } from '@/features/finances/FinanceDashboardPage'
import { IdeasPage } from '@/features/ideas/IdeasPage'
import { RecipesPage } from '@/features/recipes/RecipesPage'
import { WishesPage } from '@/features/wishes/WishesPage'
import { entityDetailPath, getEntityTypeMeta } from '@/features/entities/entity-types'
import { formatEntityDateRange } from '@/features/entities/entity-date-utils'
import { useEntities } from '@/features/entities/useEntities'
import { LEGACY_MODULE_REDIRECTS, MODULE_REGISTRY } from '@/features/modules/module-registry'
import type { EntityType } from '@/lib/indexed-db/schema'

export function ModuleHubPage() {
  const { moduleKey } = useParams<{ moduleKey: string }>()
  const navigate = useNavigate()
  const module = MODULE_REGISTRY.find((m) => m.key === moduleKey)
  const types = module?.entityTypes ?? []
  const { data: entities = [], isLoading } = useEntities()

  if (moduleKey === 'einkauf') {
    return <Navigate to="/einkauf" replace />
  }

  if (moduleKey === 'rezepte') {
    return <RecipesPage />
  }

  if (moduleKey === 'finanzen') {
    return <FinanceDashboardPage />
  }

  if (moduleKey === 'freizeit') {
    return <IdeasPage />
  }

  if (moduleKey === 'geschenke') {
    return <WishesPage />
  }

  if (moduleKey && LEGACY_MODULE_REDIRECTS[moduleKey]) {
    return <Navigate to={LEGACY_MODULE_REDIRECTS[moduleKey]} replace />
  }

  if (!module) {
    return (
      <EmptyState
        title="Modul nicht gefunden"
        description="Dieses Modul gibt es nicht."
        actionLabel="Zum Dashboard"
        onAction={() => void navigate('/')}
      />
    )
  }

  const items = entities
    .filter((e) => !e.deleted_at && (!types.length || types.includes(e.entity_type)))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))

  const primaryType = (types[0] ?? 'note') as EntityType

  if (isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-3xl px-page py-6 lg:py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">Modul</p>
          <h1 className="mt-1 font-serif text-3xl text-text">{module.label}</h1>
          <p className="mt-2 text-text-muted">{module.description}</p>
        </div>
        {types[0] ? (
          <Button
            type="button"
            size="sm"
            onClick={() => void navigate(`/planen/neu?type=${types[0]}`)}
          >
            Neu
          </Button>
        ) : null}
      </header>

      {items.length === 0 ? (
        <EmptyState
          title={`Noch nichts in ${module.label}`}
          description="Legt den ersten Eintrag an — alles bleibt in eurem privaten Space."
          actionLabel="Eintrag erstellen"
          onAction={() => void navigate(`/planen/neu?type=${primaryType}`)}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((entity) => {
            const meta = getEntityTypeMeta(entity.entity_type)
            return (
              <li key={entity.id}>
                <Link to={entityDetailPath(entity.entity_type, entity.id)}>
                  <Card interactive padding="md" className="h-full transition duration-[var(--duration-normal)] hover:-translate-y-0.5">
                    <p className="text-xs font-medium text-primary">{meta.label}</p>
                    <CardTitle className="mt-1">{entity.title || 'Ohne Titel'}</CardTitle>
                    <CardDescription>
                      {formatEntityDateRange(entity) || entity.subtitle || meta.description}
                    </CardDescription>
                  </Card>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
