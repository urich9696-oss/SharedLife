import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { entityDetailPath } from '@/features/entities/entity-types'
import { useEntities } from '@/features/entities/useEntities'
import { MediaImage } from '@/features/media/MediaImage'
import {
  addIngredient,
  addRecipeIngredientsToShopping,
  getRecipeIngredients,
} from '@/features/recipes/recipe-service'
import { db } from '@/lib/indexed-db/db'
import { cn } from '@/lib/utilities/cn'

export function RecipesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { spaceId, session } = useAuth()
  const { data: entities = [], isLoading } = useEntities()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

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

  const activeId = selectedId ?? recipes[0]?.id ?? null
  const active = recipes.find((r) => r.id === activeId) ?? null

  const { data: ingredients = [], refetch } = useQuery({
    queryKey: ['recipe-ingredients', activeId],
    enabled: Boolean(activeId),
    queryFn: async () => (await getRecipeIngredients(activeId!)).ingredients,
  })

  const handleAddIngredient = async () => {
    if (!spaceId || !activeId || !draft.trim()) return
    await addIngredient({
      spaceId,
      entityId: activeId,
      ingredient: { name: draft.trim() },
    })
    setDraft('')
    await refetch()
  }

  const handleAddToShopping = async () => {
    if (!spaceId || !activeId) return
    const result = await addRecipeIngredientsToShopping({
      spaceId,
      entityId: activeId,
      userId: session?.userId,
    })
    setStatusMsg(
      result.added > 0
        ? `${result.added} Zutat${result.added === 1 ? '' : 'en'} zur Einkaufsliste`
        : 'Alle Zutaten waren bereits vorhanden',
    )
    await queryClient.invalidateQueries({ queryKey: ['shopping'] })
  }

  if (isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-text">Rezepte</h1>
          <p className="mt-2 text-sm text-text-muted">Kochbuch mit Zutaten und Notiz.</p>
        </div>
        <Button type="button" size="sm" onClick={() => void navigate('/planen/neu?type=recipe')}>
          Neu
        </Button>
      </header>

      {recipes.length === 0 ? (
        <EmptyState
          title="Noch kein Rezept"
          description="Legt euer erstes Gericht an — Hero-Bild, Zutaten, Notiz."
          actionLabel="Rezept erstellen"
          onAction={() => void navigate('/planen/neu?type=recipe')}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <ul className="space-y-3">
            {recipes.map((recipe) => (
              <li key={recipe.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(recipe.id)}
                  className={cn(
                    'flex w-full overflow-hidden rounded-lg border bg-surface text-left shadow-xs transition',
                    activeId === recipe.id ? 'border-primary/40' : 'border-border/80',
                  )}
                >
                  <div className="w-24 shrink-0">
                    {covers[recipe.id] && spaceId ? (
                      <MediaImage
                        storagePath={covers[recipe.id]}
                        spaceId={spaceId}
                        alt={recipe.title}
                        aspectRatio={1}
                        className="rounded-none"
                      />
                    ) : (
                      <div className="aspect-square bg-pastel-2" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-serif text-xl text-text">{recipe.title}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {active && spaceId ? (
            <section className="rounded-lg border border-border/80 bg-surface p-5 shadow-sm">
              {covers[active.id] ? (
                <div className="mb-4 overflow-hidden rounded-lg">
                  <MediaImage
                    storagePath={covers[active.id]}
                    spaceId={spaceId}
                    alt={active.title}
                    aspectRatio={16 / 10}
                  />
                </div>
              ) : (
                <div className="mb-4 aspect-[16/10] rounded-lg bg-pastel-1" />
              )}
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-serif text-3xl text-text">{active.title}</h2>
                <Link to={entityDetailPath('recipe', active.id)} className="text-sm font-medium text-primary">
                  Bearbeiten
                </Link>
              </div>

              <div className="mt-6">
                <h3 className="font-serif text-xl text-text">Zutaten</h3>
                <form
                  className="mt-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void handleAddIngredient()
                  }}
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Zutat hinzufügen…"
                    enterKeyHint="done"
                    className="min-h-12 w-full rounded-[18px] border border-border/80 bg-bg px-4 text-base outline-none focus:border-primary"
                  />
                </form>
                <ul className="mt-3 space-y-2">
                  {ingredients.map((item) => (
                    <li
                      key={item.id}
                      className="flex min-h-11 items-center rounded-[16px] bg-bg px-3 text-sm"
                    >
                      {item.name}
                    </li>
                  ))}
                </ul>
                <Button type="button" className="mt-4" fullWidth onClick={() => void handleAddToShopping()}>
                  Zutaten zur Einkaufsliste hinzufügen
                </Button>
                {statusMsg ? <p className="mt-2 text-sm text-text-muted">{statusMsg}</p> : null}
              </div>

              {active.description ? (
                <div className="mt-6">
                  <h3 className="font-serif text-xl text-text">Notiz</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-text-muted">
                    {active.description}
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
