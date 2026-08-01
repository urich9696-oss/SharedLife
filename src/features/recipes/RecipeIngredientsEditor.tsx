import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { SectionTitle } from '@/features/entities/detail/MetaList'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  addIngredient,
  getRecipeIngredients,
} from '@/features/recipes/recipe-service'
import { softDeleteChecklistItem } from '@/lib/indexed-db/repositories/checklists'

export function RecipeIngredientsEditor({
  entityId,
  className,
  compact,
}: {
  entityId: string
  className?: string
  /** Ohne SectionTitle — für Modul-Seiten mit eigener Überschrift */
  compact?: boolean
}) {
  const { spaceId } = useAuth()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const queryKey = ['recipe-ingredients', entityId]

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: Boolean(entityId),
    queryFn: () => getRecipeIngredients(entityId),
  })

  const ingredients = data?.ingredients ?? []

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey })
    await queryClient.invalidateQueries({ queryKey: ['checklists', entityId] })
  }

  const addItem = useMutation({
    mutationFn: async (name: string) => {
      if (!spaceId) throw new Error('Kein Space')
      await addIngredient({
        spaceId,
        entityId,
        ingredient: { name },
      })
    },
    onSuccess: async () => {
      setDraft('')
      setError(null)
      await invalidate()
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Zutat konnte nicht hinzugefügt werden')
    },
  })

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      if (!spaceId) throw new Error('Kein Space')
      await softDeleteChecklistItem(itemId, spaceId)
    },
    onSuccess: () => void invalidate(),
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Zutat konnte nicht entfernt werden')
    },
  })

  const submit = () => {
    const name = draft.trim()
    if (!name || addItem.isPending) return
    addItem.mutate(name)
  }

  return (
    <section className={className}>
      {compact ? null : <SectionTitle>Zutaten</SectionTitle>}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Zutat hinzufügen…"
          className="flex-1"
          enterKeyHint="done"
          autoComplete="off"
        />
        <Button type="submit" size="sm" loading={addItem.isPending} disabled={!draft.trim()}>
          Hinzufügen
        </Button>
      </form>

      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}

      {isLoading ? (
        <p className="mt-3 text-sm text-text-muted">Zutaten werden geladen…</p>
      ) : ingredients.length === 0 ? (
        <p className="mt-3 text-sm font-medium text-text-muted">
          Noch keine Zutaten — z.&nbsp;B. „Mehl“ oder „2 EL Butter“.
        </p>
      ) : (
        <ul className="mt-3 overflow-hidden rounded-lg border border-border/70 bg-surface shadow-xs">
          {ingredients.map((item, index) => (
            <li
              key={item.id}
              className={`flex min-h-12 items-center gap-3 px-4 py-3 text-[17px] text-text ${
                index > 0 ? 'border-t border-border/70' : ''
              }`}
            >
              <span className="min-w-0 flex-1">
                {item.quantity || item.unit
                  ? `${[item.quantity, item.unit].filter(Boolean).join(' ')} ${item.name}`.trim()
                  : item.name}
              </span>
              <IconButton
                label="Entfernen"
                size="sm"
                icon={<span aria-hidden>×</span>}
                onClick={() => removeItem.mutate(item.id)}
                disabled={removeItem.isPending}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
