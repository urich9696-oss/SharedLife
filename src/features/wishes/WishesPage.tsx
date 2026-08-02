import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { entityDetailPath, getEntityTypeMeta } from '@/features/entities/entity-types'
import { useEntities } from '@/features/entities/useEntities'
import { useSync } from '@/features/sync/SyncProvider'
import { cn } from '@/lib/utilities/cn'

export function WishesPage() {
  const navigate = useNavigate()
  const { data: entities = [], isLoading, refetch } = useEntities()
  const { flushNow, online } = useSync()
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!online) return
    void (async () => {
      try {
        await flushNow()
      } catch {
        // ignore
      }
      await refetch()
    })()
  }, [online]) // eslint-disable-line react-hooks/exhaustive-deps -- einmal bei Online/Mount pull+push

  const wishes = useMemo(
    () =>
      entities
        .filter((e) => (e.entity_type === 'wish' || e.entity_type === 'gift') && !e.deleted_at)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [entities],
  )

  const openCreate = () => {
    void navigate('/planen/neu?type=wish')
  }

  const refresh = async () => {
    setSyncing(true)
    try {
      if (online) await flushNow()
      await refetch()
    } finally {
      setSyncing(false)
    }
  }

  if (isLoading) return <LoadingState label="Wünsche werden geladen…" />

  return (
    <div className="mx-auto max-w-3xl px-page py-6 lg:py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-text">Wünsche</h1>
          <p className="mt-2 text-sm text-text-muted">
            Gemeinsame Wünsche und Geschenkideen — synchron für euch beide.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()} disabled={syncing}>
            {syncing ? 'Sync…' : 'Aktualisieren'}
          </Button>
          <Button type="button" size="sm" onClick={openCreate}>
            Neu
          </Button>
        </div>
      </header>

      {wishes.length === 0 ? (
        <EmptyState
          title="Noch keine Wünsche"
          description="Legt den ersten Wunsch an — Preis und Link werden mit synchronisiert."
          actionLabel="Wunsch erstellen"
          onAction={openCreate}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {wishes.map((entity) => {
            const meta = getEntityTypeMeta(entity.entity_type)
            const status = String(entity.metadata?.wishStatus || 'open')
            return (
              <li key={entity.id}>
                <Link to={entityDetailPath(entity.entity_type === 'gift' ? 'wish' : entity.entity_type, entity.id)}>
                  <Card
                    interactive
                    padding="md"
                    className={cn(
                      'h-full transition duration-[var(--duration-normal)] hover:-translate-y-0.5',
                    )}
                  >
                    <p className="text-xs font-medium text-primary">{meta.label}</p>
                    <CardTitle className="mt-1">{entity.title || 'Ohne Titel'}</CardTitle>
                    <CardDescription>
                      {status === 'bought'
                        ? 'Gekauft'
                        : status === 'reserved'
                          ? 'Reserviert'
                          : entity.subtitle || 'Offen'}
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
