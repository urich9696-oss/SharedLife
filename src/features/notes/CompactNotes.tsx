import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { AddRow } from '@/features/entities/detail/AddRow'
import { SectionTitle } from '@/features/entities/detail/MetaList'
import { useAuth } from '@/features/auth/AuthProvider'
import { createNote, listNotesForEntity, softDeleteNote } from '@/lib/indexed-db/repositories/notes'
import { formatInAppTz } from '@/lib/dates/timezone'

/** Notizen am Seitenende — kompakt, ohne leere Karte */
export function CompactNotes({ entityId }: { entityId: string }) {
  const { spaceId, session } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', entityId],
    queryFn: () => listNotesForEntity(entityId),
    enabled: !!entityId,
  })

  const addNote = useMutation({
    mutationFn: async () => {
      if (!spaceId || !content.trim()) return
      await createNote({
        id: uuidv4(),
        spaceId,
        entityId,
        content: content.trim(),
        userId: session?.userId ?? null,
      })
    },
    onSuccess: () => {
      setContent('')
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['notes', entityId] })
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => softDeleteNote(id, spaceId!),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notes', entityId] }),
  })

  return (
    <section className="mb-8">
      <SectionTitle>Notiz</SectionTitle>
      {notes.length > 0 ? (
        <ul className="mb-2 flex flex-col gap-4">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-border/60 bg-surface px-6 py-4 shadow-xs">
              <p className="whitespace-pre-wrap text-[17px] text-text">{note.content}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
                <span>{formatInAppTz(note.created_at, 'dd.MM.yyyy HH:mm')}</span>
                <button
                  type="button"
                  className="font-medium text-error"
                  onClick={() => remove.mutate(note.id)}
                >
                  Entfernen
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <div className="space-y-4 rounded-lg border border-border/60 bg-surface p-6 shadow-xs">
          <Textarea
            label="Notiz"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="Gedanke festhalten…"
          />
          <div className="flex gap-4">
            <Button variant="secondary" fullWidth onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button fullWidth loading={addNote.isPending} onClick={() => addNote.mutate()}>
              Speichern
            </Button>
          </div>
        </div>
      ) : (
        <AddRow label="Notiz hinzufügen" onClick={() => setOpen(true)} />
      )}
    </section>
  )
}
