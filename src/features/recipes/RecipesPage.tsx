import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { entityDetailPath } from '@/features/entities/entity-types'
import { useEntities } from '@/features/entities/useEntities'
import { MediaImage } from '@/features/media/MediaImage'
import { db } from '@/lib/indexed-db/db'

export function RecipesPage() {
  const navigate = useNavigate()
  const { spaceId } = useAuth()
  const { data: entities = [], isLoading } = useEntities()

  const recipes = useMemo(
    () =>
      entities
        .filter((e) => e.entity_type === 'recipe' && !e.deleted_at)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [entities],
  )

  const { data: covers = {} } = useQuery({
    queryKey: ['recipe-covers', spaceId],
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
    <div className="mx-auto max-w-3xl px-page py-6 lg:py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-text">Rezepte</h1>
          <p className="mt-2 text-sm text-text-muted">Kochbuch mit Zutaten und Notizen</p>
        </div>
        <Button type="button" size="sm" onClick={() => void navigate('/planen/neu?type=recipe')}>
          + Rezept
        </Button>
      </header>

      {recipes.length === 0 ? (
        <EmptyState
          title="Noch kein Rezept"
          description="Legt euer erstes Gericht an — Bild, Zutaten und Notiz."
          actionLabel="+ Rezept"
          onAction={() => void navigate('/planen/neu?type=recipe')}
        />
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border/80 bg-surface shadow-xs">
          {recipes.map((recipe) => {
            const category = String(recipe.metadata?.category ?? recipe.subtitle ?? '')
            const minutes = recipe.metadata?.prepMinutes ?? recipe.metadata?.cookTime
            const metaBits = [
              category || null,
              typeof minutes === 'number' || typeof minutes === 'string'
                ? `${minutes} Min.`
                : null,
            ].filter(Boolean)

            return (
              <li key={recipe.id} className="border-b border-border/60 last:border-b-0">
                <Link
                  to={entityDetailPath('recipe', recipe.id)}
                  className="flex min-h-14 items-center gap-3 px-3 py-2.5"
                >
                  <div className="size-14 shrink-0 overflow-hidden rounded-[14px] bg-pastel-2">
                    {covers[recipe.id] && spaceId ? (
                      <MediaImage
                        storagePath={covers[recipe.id]}
                        spaceId={spaceId}
                        alt={recipe.title}
                        aspectRatio={1}
                        className="rounded-none"
                      />
                    ) : (
                      <div className="size-full bg-pastel-2" />
                    )}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-medium leading-snug text-text">
                      {recipe.title}
                    </span>
                    {metaBits.length > 0 ? (
                      <span className="mt-0.5 block text-[13px] text-text-muted">
                        {metaBits.join(' · ')}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
