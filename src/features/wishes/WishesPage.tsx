import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { entityDetailPath, getEntityTypeMeta } from '@/features/entities/entity-types'
import { useSync } from '@/features/sync/SyncProvider'
import { listEntities } from '@/lib/indexed-db/repositories/entities'
import { cn } from '@/lib/utilities/cn'

export function WishesPage() {
  const navigate = useNavigate()
  const { spaceId } = useAuth()
  const { flushNow, pushNow, online } = useSync()
  const [syncing, setSyncing] = useState(false)

  const {
    data: entities = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['entities', spaceId],
    queryFn: () => listEntities(spaceId!),
    enabled: Boolean(spaceId),
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  const wishes = useMemo(
    () =>
      entities
        .filter((e) => (e.entity_type === 'wish' || e.entity_type === 'gift') && !e.deleted_at)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [entities],
  )

  // Partner-Wünsche: regelmäßig pullen (nicht nur IndexedDB neu lesen).
  useEffect(() => {
    if (!online) return
    let cancelled = false
    const tick = async () => {
      try {
        await flushNow()
      } catch {
        // ignore
      }
      if (!cancelled) await refetch()
    }
    void tick()
    const id = window.setInterval(() => void tick(), 8_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [online, flushNow, refetch])

  const openCreate = () => {
    void navigate('/planen/neu?type=wish')
  }

  const refresh = async () => {
    setSyncing(true)
    try {
      if (online) {
        await pushNow()
        await flushNow()
      }
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
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void refresh()}
            disabled={syncing}
          >
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
          description="Legt den ersten Wunsch an — er erscheint automatisch beim Partner."
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
                <Link
                  to={entityDetailPath(
                    entity.entity_type === 'gift' ? 'wish' : entity.entity_type,
                    entity.id,
                  )}
                >
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
