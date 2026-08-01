import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { IconButton } from '@/components/ui/IconButton'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  createChecklist,
  createChecklistItem,
  listChecklistItems,
  listChecklistsForEntity,
  reorderChecklistItem,
  softDeleteChecklistItem,
  toggleChecklistItem,
} from '@/lib/indexed-db/repositories/checklists'

interface ListDetailProps {
  entityId: string
}

export function ListDetail({ entityId }: ListDetailProps) {
  const { spaceId, session } = useAuth()
  const queryClient = useQueryClient()
  const [newItem, setNewItem] = useState('')

  const { data: checklists = [] } = useQuery({
    queryKey: ['checklists', entityId],
    queryFn: () => listChecklistsForEntity(entityId),
    enabled: !!entityId,
  })

  const checklistId = checklists[0]?.id

  const { data: items = [], refetch } = useQuery({
    queryKey: ['checklist-items', checklistId],
    queryFn: () => listChecklistItems(checklistId!),
    enabled: !!checklistId,
  })

  const ensureChecklist = useMutation({
    mutationFn: async () => {
      if (!spaceId) throw new Error('Kein Space')
      if (checklistId) return checklistId
      const row = await createChecklist({
        id: uuidv4(),
        spaceId,
        entityId,
        title: 'Checkliste',
      })
      return row.id
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['checklists', entityId] }),
  })

  const addItem = useMutation({
    mutationFn: async (title: string) => {
      if (!spaceId) throw new Error('Kein Space')
      const clId = checklistId ?? (await ensureChecklist.mutateAsync())
      await createChecklistItem({
        id: uuidv4(),
        spaceId,
        checklistId: clId,
        title,
        sortOrder: items.length,
      })
    },
    onSuccess: () => {
      setNewItem('')
      void refetch()
    },
  })

  const toggle = useMutation({
    mutationFn: ({ id, checked }: { id: string; checked: boolean }) =>
      toggleChecklistItem(id, spaceId!, checked, session?.userId ?? null),
    onSuccess: () => void refetch(),
  })

  const remove = useMutation({
    mutationFn: (id: string) => softDeleteChecklistItem(id, spaceId!),
    onSuccess: () => void refetch(),
  })

  const move = useMutation({
    mutationFn: ({ id, order }: { id: string; order: number }) =>
      reorderChecklistItem(id, spaceId!, order),
    onSuccess: () => void refetch(),
  })

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 font-medium text-text">Checkliste</h3>
      <ul className="flex flex-col gap-2">
        {items.filter((item) => !item.is_checked).map((item, index) => (
          <li key={item.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={item.is_checked}
              onChange={(e) => toggle.mutate({ id: item.id, checked: e.target.checked })}
              className="size-4 rounded border-border text-primary"
            />
            <span className="flex-1 text-sm text-text">
              {item.title}
            </span>
            <IconButton
              label="Nach oben"
              size="sm"
              disabled={index === 0}
              icon={<span aria-hidden>↑</span>}
              onClick={() => move.mutate({ id: item.id, order: index - 1 })}
            />
            <IconButton
              label="Nach unten"
              size="sm"
              disabled={index === items.length - 1}
              icon={<span aria-hidden>↓</span>}
              onClick={() => move.mutate({ id: item.id, order: index + 1 })}
            />
            <IconButton
              label="Entfernen"
              size="sm"
              icon={<span aria-hidden>×</span>}
              onClick={() => remove.mutate(item.id)}
            />
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (newItem.trim()) addItem.mutate(newItem.trim())
        }}
      >
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Neuer Punkt…"
          className="flex-1"
        />
        <Button type="submit" size="sm" loading={addItem.isPending}>
          Hinzufügen
        </Button>
      </form>
    </section>
  )
}
