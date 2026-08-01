import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { entityDetailPath } from '@/features/entities/entity-types'
import { useEntities } from '@/features/entities/useEntities'
import { MediaImage } from '@/features/media/MediaImage'
import { db } from '@/lib/indexed-db/db'
import { cn } from '@/lib/utilities/cn'

const IDEA_CATEGORIES = [
  { key: 'all', label: 'Alle' },
  { key: 'restaurant', label: 'Restaurants' },
  { key: 'film', label: 'Filme' },
  { key: 'serie', label: 'Serien' },
  { key: 'buch', label: 'Bücher' },
  { key: 'aktivitaet', label: 'Aktivitäten' },
  { key: 'ausflug', label: 'Ausflüge' },
  { key: 'reise', label: 'Reisen' },
  { key: 'rezept', label: 'Rezepte' },
] as const

function categoryOf(entity: { title: string; metadata: Record<string, unknown>; subtitle: string | null }) {
  const meta = String(entity.metadata?.ideaCategory ?? entity.metadata?.category ?? '').toLowerCase()
  if (meta) return meta
  const hay = `${entity.title} ${entity.subtitle ?? ''}`.toLowerCase()
  if (hay.includes('restaurant') || hay.includes('essen')) return 'restaurant'
  if (hay.includes('film')) return 'film'
  if (hay.includes('serie')) return 'serie'
  if (hay.includes('buch')) return 'buch'
  if (hay.includes('ausflug')) return 'ausflug'
  if (hay.includes('reise')) return 'reise'
  if (hay.includes('rezept')) return 'rezept'
  return 'aktivitaet'
}

export function IdeasPage() {
  const navigate = useNavigate()
  const { spaceId } = useAuth()
  const { data: entities = [], isLoading } = useEntities()
  const [filter, setFilter] = useState<(typeof IDEA_CATEGORIES)[number]['key']>('all')

  const ideas = useMemo(
    () =>
      entities
        .filter((e) => e.entity_type === 'leisure' && !e.deleted_at)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [entities],
  )

  const filtered = useMemo(() => {
    if (filter === 'all') return ideas
    return ideas.filter((idea) => categoryOf(idea) === filter)
  }, [ideas, filter])

  const { data: covers = {} } = useQuery({
    queryKey: ['ideas-covers', spaceId],
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
    <div className="mx-auto max-w-4xl px-4 py-6 lg:py-8">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
            Inspiration
          </p>
          <h1 className="mt-1 font-serif text-3xl text-text">Ideen</h1>
          <p className="mt-2 text-sm text-text-muted">
            Restaurants, Filme, Ausflüge — alles, was ihr noch erleben wollt.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => void navigate('/planen/neu?type=leisure')}>
          Neu
        </Button>
      </header>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {IDEA_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setFilter(cat.key)}
            className={cn(
              'shrink-0 rounded-[16px] border px-3 py-2 text-xs font-medium transition',
              filter === cat.key
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border/80 bg-surface text-text-muted',
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Noch keine Ideen"
          description="Sammelt Orte, Filme und Aktivitäten — mit Foto und Notiz."
          actionLabel="Idee hinzufügen"
          onAction={() => void navigate('/planen/neu?type=leisure')}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((idea) => {
            const favorite = Boolean(idea.metadata?.favorite)
            const status = String(idea.metadata?.ideaStatus ?? idea.status)
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
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
                          {IDEA_CATEGORIES.find((c) => c.key === categoryOf(idea))?.label ?? 'Idee'}
                        </p>
                        {favorite ? (
                          <span className="text-xs text-emotional">Favorit</span>
                        ) : null}
                      </div>
                      <CardTitle className="mt-1 text-xl">{idea.title}</CardTitle>
                      <CardDescription>
                        {idea.description || idea.subtitle || status}
                      </CardDescription>
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
