import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatEntityDateRange } from '@/features/entities/entity-date-utils'
import { entityDetailPath } from '@/features/entities/entity-types'
import { useEntities } from '@/features/entities/useEntities'
import { MediaImage } from '@/features/media/MediaImage'
import { db } from '@/lib/indexed-db/db'

export function IdeasPage() {
  const navigate = useNavigate()
  const { spaceId } = useAuth()
  const { data: entities = [], isLoading } = useEntities()

  const ideas = useMemo(
    () =>
      entities
        .filter((e) => e.entity_type === 'leisure' && !e.deleted_at)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [entities],
  )

  const { data: covers = {} } = useQuery({
    queryKey: ['date-ideas-covers', spaceId],
    enabled: Boolean(spaceId),
    queryFn: async () => {
      const [links, assets] = await Promise.all([
        db.entityMedia.toArray(),
        db.mediaAssets.where('space_id').equals(spaceId!).toArray(),
      ])
      const display = assets.filter((m) => !m.deleted_at && m.variant === 'display')
      const map: Record<string, string> = {}
      for (const link of links.sort((a, b) => a.sort_order - b.sort_order)) {
        if (map[link.entity_id]) continue
        const asset = display.find((a) => a.id === link.media_id)
        if (asset) map[link.entity_id] = asset.storage_path
      }
      return map
    },
  })

  if (isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-4xl px-page py-6 lg:py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
            Inspiration
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-text">Date Ideen</h1>
          <p className="mt-4 text-[17px] text-text-muted">
            Orte und Ideen für gemeinsame Dates.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => void navigate('/planen/neu?type=leisure')}>
          Neu
        </Button>
      </header>

      {ideas.length === 0 ? (
        <EmptyState
          title="Noch keine Date Ideen"
          description="Sammelt Orte und Inspirationen mit Foto, Link, Datums-Vorschlag und Notiz."
          actionLabel="Idee hinzufügen"
          onAction={() => void navigate('/planen/neu?type=leisure')}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {ideas.map((idea) => {
            const suggested = formatEntityDateRange(idea)
            const place = String(idea.metadata?.place || '')
            const subtitle =
              [suggested ? `Vorschlag: ${suggested}` : null, place || null]
                .filter(Boolean)
                .join(' · ') ||
              idea.description ||
              idea.subtitle ||
              'Date Idee'
            return (
              <li key={idea.id}>
                <Link to={entityDetailPath('leisure', idea.id)}>
                  <Card interactive padding="none" className="overflow-hidden">
                    {covers[idea.id] && spaceId ? (
                      <MediaImage
                        storagePath={covers[idea.id]}
                        spaceId={spaceId}
                        alt={idea.title}
                        aspectRatio={16 / 10}
                      />
                    ) : (
                      <div className="aspect-[16/10] bg-[linear-gradient(145deg,var(--color-pastel-2),var(--color-pastel-3))]" />
                    )}
                    <div className="p-4">
                      <CardTitle className="text-xl">{idea.title}</CardTitle>
                      <CardDescription>{subtitle}</CardDescription>
                    </div>
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
