import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  createChecklistItem,
  softDeleteChecklistItem,
  toggleChecklistItem,
  updateChecklistItemFields,
} from '@/lib/indexed-db/repositories/checklists'
import {
  ensureShoppingList,
  getActiveShoppingItems,
} from '@/features/shopping/shopping-service'
import type { ChecklistItemRow } from '@/lib/indexed-db/schema'
import { cn } from '@/lib/utilities/cn'

const UNDO_MS = 5000
const EXIT_MS = 320

interface ExitingItem {
  id: string
  title: string
}

function isRecipeItem(item: ChecklistItemRow) {
  return (item.category ?? '').toLowerCase() === 'rezept'
}

export function ShoppingPage() {
  const { spaceId, session } = useAuth()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const [exiting, setExiting] = useState<Record<string, boolean>>({})
  const [undo, setUndo] = useState<ExitingItem | null>(null)
  const undoTimer = useRef<number | null>(null)

  const queryKey = ['shopping', spaceId]

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    enabled: Boolean(spaceId),
    queryFn: async () => {
      await ensureShoppingList(spaceId!, session?.userId ?? null)
      return getActiveShoppingItems(spaceId!)
    },
    refetchInterval: 15_000,
  })

  useEffect(() => {
    if (params.get('focus') === '1') inputRef.current?.focus()
  }, [params])

  useEffect(() => {
    return () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current)
    }
  }, [])

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey })
  }

  const addItem = useMutation({
    mutationFn: async (title: string) => {
      if (!spaceId) throw new Error('Kein Space')
      const { checklistId } = await ensureShoppingList(spaceId, session?.userId ?? null)
      await createChecklistItem({
        id: uuidv4(),
        spaceId,
        checklistId,
        title,
        sortOrder: data?.active.length ?? 0,
      })
    },
    onSuccess: () => {
      setDraft('')
      setError(null)
      invalidate()
      requestAnimationFrame(() => inputRef.current?.focus())
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Artikel konnte nicht hinzugefügt werden')
    },
  })

  const completeItem = useMutation({
    mutationFn: async (item: ChecklistItemRow) => {
      if (!spaceId) throw new Error('Kein Space')
      await toggleChecklistItem(item.id, spaceId, true, session?.userId ?? null)
      return item
    },
    onMutate: async (item) => {
      setExiting((prev) => ({ ...prev, [item.id]: true }))
    },
    onSuccess: (item) => {
      window.setTimeout(() => {
        invalidate()
        setExiting((prev) => {
          const next = { ...prev }
          delete next[item.id]
          return next
        })
      }, EXIT_MS)
      setUndo({ id: item.id, title: item.title })
      if (undoTimer.current) window.clearTimeout(undoTimer.current)
      undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS)
    },
    onError: (err, item) => {
      setExiting((prev) => {
        const next = { ...prev }
        delete next[item.id]
        return next
      })
      setError(err instanceof Error ? err.message : 'Abhaken fehlgeschlagen')
      invalidate()
    },
  })

  const undoComplete = useMutation({
    mutationFn: async (id: string) => {
      if (!spaceId) throw new Error('Kein Space')
      await toggleChecklistItem(id, spaceId, false, null)
    },
    onSuccess: () => {
      setUndo(null)
      if (undoTimer.current) window.clearTimeout(undoTimer.current)
      invalidate()
    },
  })

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!spaceId || !editingId) return
      const title = editTitle.trim()
      if (!title) throw new Error('Titel darf nicht leer sein')
      await updateChecklistItemFields(editingId, spaceId, { title })
    },
    onSuccess: () => {
      setEditingId(null)
      setEditTitle('')
      invalidate()
    },
  })

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      if (!spaceId) throw new Error('Kein Space')
      await softDeleteChecklistItem(id, spaceId)
    },
    onSuccess: () => invalidate(),
  })

  if (isLoading) return <LoadingState label="Einkaufsliste wird geladen…" />
  if (isError) {
    return (
      <ErrorState
        title="Einkauf nicht verfügbar"
        message="Die Liste konnte nicht geladen werden."
        onRetry={() => void refetch()}
      />
    )
  }

  const active = (data?.active ?? []).filter((i) => !exiting[i.id] || exiting[i.id])
  const openCount = active.length

  return (
    <div className="mx-auto max-w-xl px-page py-6 lg:py-8">
      <header className="mb-5">
        <h1 className="font-serif text-3xl text-text">Einkauf</h1>
        <p className="mt-1 text-sm text-text-muted">
          {openCount === 0 ? 'Liste ist leer' : `${openCount} offen`}
        </p>
      </header>

      <form
        className="mb-5"
        onSubmit={(e) => {
          e.preventDefault()
          const title = draft.trim()
          if (!title) return
          addItem.mutate(title)
        }}
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Artikel hinzufügen…"
          enterKeyHint="done"
          autoComplete="off"
          className="min-h-12 w-full rounded-[20px] border border-border/80 bg-surface px-4 text-[16px] text-text shadow-xs outline-none transition focus:border-primary focus:shadow-focus sm:text-[17px]"
          aria-label="Neuen Einkaufsartikel eingeben"
        />
      </form>

      {error ? (
        <p className="mb-4 rounded-[14px] bg-error-subtle px-3 py-2 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      {openCount === 0 ? (
        <EmptyState
          title="Noch nichts auf der Liste"
          description="Artikel tippen und Enter — fertig."
          actionLabel="Artikel hinzufügen"
          onAction={() => inputRef.current?.focus()}
        />
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border/80 bg-surface shadow-xs">
          {active.map((item) => {
            const isExiting = Boolean(exiting[item.id])
            return (
              <li
                key={item.id}
                className={cn(
                  'flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0',
                  'transition-[opacity,transform] duration-300 ease-out',
                  isExiting && 'opacity-0 -translate-x-3',
                )}
              >
                <button
                  type="button"
                  aria-label={`${item.title} erledigen`}
                  className="flex size-11 shrink-0 items-center justify-center"
                  onClick={() => completeItem.mutate(item)}
                  disabled={isExiting}
                >
                  <span className="flex size-6 items-center justify-center rounded-[8px] border-2 border-primary/40" />
                </button>

                {editingId === item.id ? (
                  <form
                    className="flex min-w-0 flex-1"
                    onSubmit={(e) => {
                      e.preventDefault()
                      saveEdit.mutate()
                    }}
                  >
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="min-h-11 w-full rounded-[14px] border border-border bg-bg px-3 text-[16px] sm:text-[17px]"
                      autoFocus
                      enterKeyHint="done"
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left text-base text-text"
                    onClick={() => {
                      setEditingId(item.id)
                      setEditTitle(item.title)
                    }}
                  >
                    {isRecipeItem(item) ? <span className="mr-1.5" aria-hidden>🍽️</span> : null}
                    {item.title}
                  </button>
                )}

                <button
                  type="button"
                  className="min-h-11 min-w-11 text-text-muted"
                  aria-label={`${item.title} löschen`}
                  onClick={() => {
                    if (window.confirm(`„${item.title}“ entfernen?`)) removeItem.mutate(item.id)
                  }}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {(data?.completed.length ?? 0) > 0 ? (
        <section className="mt-8">
          <button
            type="button"
            className="text-sm font-medium text-text-muted"
            onClick={() => setShowCompleted((v) => !v)}
          >
            {showCompleted ? 'Erledigte ausblenden' : 'Erledigte anzeigen'}
          </button>
          {showCompleted ? (
            <ul className="mt-3 space-y-2">
              {data!.completed.slice(0, 20).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-[16px] bg-surface-soft/60 px-3 py-2 text-sm text-text-muted"
                >
                  <span className="line-through">
                    {isRecipeItem(item) ? '🍽️ ' : ''}
                    {item.title}
                  </span>
                  <button
                    type="button"
                    className="min-h-10 text-primary"
                    onClick={() => undoComplete.mutate(item.id)}
                  >
                    Wiederherstellen
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {undo ? (
        <div
          className="fixed inset-x-4 bottom-[calc(var(--nav-bottom-height)+var(--space-safe-bottom)+0.75rem)] z-[var(--z-toast)] mx-auto flex max-w-md items-center justify-between gap-3 rounded-[16px] bg-text px-4 py-3 text-sm text-surface shadow-md lg:bottom-6"
          role="status"
        >
          <span>Erledigt</span>
          <button type="button" className="font-medium underline" onClick={() => undoComplete.mutate(undo.id)}>
            Rückgängig
          </button>
        </div>
      ) : null}
    </div>
  )
}
