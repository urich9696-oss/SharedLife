import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
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
  const [ingredientName, setIngredientName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
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

  const { data: ingredients = [], refetch } = useQuery({
    queryKey: ['recipe-ingredients', activeId],
    enabled: Boolean(activeId),
    queryFn: async () => {
      const result = await getRecipeIngredients(activeId!)
      return result.ingredients
    },
  })

  const active = recipes.find((r) => r.id === activeId) ?? null

  const handleAddIngredient = async () => {
    if (!spaceId || !activeId || !ingredientName.trim()) return
    await addIngredient({
      spaceId,
      entityId: activeId,
      ingredient: {
        name: ingredientName,
        quantity: quantity || null,
        unit: unit || null,
      },
    })
    setIngredientName('')
    setQuantity('')
    setUnit('')
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
        ? `${result.added} Zutat${result.added === 1 ? '' : 'en'} zur Einkaufsliste${result.skipped ? ` · ${result.skipped} schon vorhanden` : ''}`
        : 'Alle Zutaten waren bereits auf der Einkaufsliste',
    )
    await queryClient.invalidateQueries({ queryKey: ['shopping'] })
  }

  if (isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">Alltag</p>
          <h1 className="mt-1 font-serif text-3xl text-text">Rezepte</h1>
          <p className="mt-2 text-sm text-text-muted">Euer gemeinsames Kochbuch.</p>
        </div>
        <Button type="button" size="sm" onClick={() => void navigate('/planen/neu?type=recipe')}>
          Neu
        </Button>
      </header>

      {recipes.length === 0 ? (
        <EmptyState
          title="Noch kein Rezept"
          description="Legt euer erstes Lieblingsgericht an — mit Foto, Zutaten und Schritten."
          actionLabel="Rezept erstellen"
          onAction={() => void navigate('/planen/neu?type=recipe')}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {recipes.map((recipe) => (
              <li key={recipe.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(recipe.id)}
                  className={cn(
                    'flex w-full overflow-hidden rounded-[28px] border bg-surface text-left shadow-xs transition duration-280',
                    activeId === recipe.id
                      ? 'border-primary/40 shadow-sm'
                      : 'border-border/80 hover:-translate-y-0.5',
                  )}
                >
                  <div className="w-28 shrink-0">
                    {covers[recipe.id] && spaceId ? (
                      <MediaImage
                        storagePath={covers[recipe.id]}
                        spaceId={spaceId}
                        alt={recipe.title}
                        aspectRatio={1}
                        className="rounded-none"
                      />
                    ) : (
                      <div className="aspect-square bg-[linear-gradient(145deg,var(--color-pastel-2),var(--color-pastel-1))]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 p-4">
                    <p className="font-serif text-xl text-text">{recipe.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-text-muted">
                      {recipe.description || recipe.subtitle || 'Rezept öffnen'}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {active && spaceId ? (
            <section className="rounded-[32px] border border-border/80 bg-surface p-5 shadow-sm">
              {covers[active.id] ? (
                <div className="mb-4 overflow-hidden rounded-[24px]">
                  <MediaImage
                    storagePath={covers[active.id]}
                    spaceId={spaceId}
                    alt={active.title}
                    aspectRatio={16 / 10}
                  />
                </div>
              ) : (
                <div className="mb-4 aspect-[16/10] rounded-[24px] bg-[linear-gradient(145deg,var(--color-pastel-1),var(--color-pastel-2))]" />
              )}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-3xl text-text">{active.title}</h2>
                  {active.description ? (
                    <p className="mt-2 text-sm text-text-muted whitespace-pre-wrap">
                      {active.description}
                    </p>
                  ) : null}
                </div>
                <Link
                  to={entityDetailPath('recipe', active.id)}
                  className="shrink-0 text-sm font-medium text-primary"
                >
                  Details
                </Link>
              </div>

              <div className="mt-6">
                <h3 className="font-serif text-xl text-text">Zutaten</h3>
                <ul className="mt-3 space-y-2">
                  {ingredients.map((item) => (
                    <li
                      key={item.id}
                      className="flex min-h-11 items-center justify-between rounded-[18px] bg-bg px-3 py-2 text-sm"
                    >
                      <span>{item.name}</span>
                      <span className="text-text-muted">
                        {[item.quantity, item.unit].filter(Boolean).join(' ')}
                      </span>
                    </li>
                  ))}
                  {ingredients.length === 0 ? (
                    <li className="text-sm text-text-muted">Noch keine Zutaten.</li>
                  ) : null}
                </ul>

                <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_5rem_5rem_auto]">
                  <Input
                    label="Zutat"
                    value={ingredientName}
                    onChange={(e) => setIngredientName(e.target.value)}
                    placeholder="z. B. Milch"
                  />
                  <Input
                    label="Menge"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="2"
                  />
                  <Input
                    label="Einheit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="EL"
                  />
                  <div className="flex items-end">
                    <Button type="button" onClick={() => void handleAddIngredient()}>
                      Hinzufügen
                    </Button>
                  </div>
                </div>

                <Button
                  type="button"
                  className="mt-4"
                  fullWidth
                  onClick={() => void handleAddToShopping()}
                >
                  Zutaten zur Einkaufsliste hinzufügen
                </Button>
                {statusMsg ? <p className="mt-2 text-sm text-text-muted">{statusMsg}</p> : null}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
