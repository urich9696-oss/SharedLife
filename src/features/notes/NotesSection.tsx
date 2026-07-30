import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/features/auth/AuthProvider'
import { createNote, listNotesForEntity, softDeleteNote } from '@/lib/indexed-db/repositories/notes'
import { formatInAppTz } from '@/lib/dates/timezone'

interface NotesSectionProps {
  entityId: string
}

export function NotesSection({ entityId }: NotesSectionProps) {
  const { spaceId, session } = useAuth()
  const queryClient = useQueryClient()
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
      void queryClient.invalidateQueries({ queryKey: ['notes', entityId] })
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => softDeleteNote(id, spaceId!),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notes', entityId] }),
  })

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 font-medium text-text">Notizen</h3>
      <ul className="mb-4 flex flex-col gap-3">
        {notes.map((note) => (
          <li key={note.id} className="rounded-lg bg-bg p-3">
            <p className="text-sm text-text whitespace-pre-wrap">{note.content}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
              <span>{formatInAppTz(note.created_at, 'dd.MM.yyyy HH:mm')}</span>
              <button
                type="button"
                className="text-error hover:underline"
                onClick={() => remove.mutate(note.id)}
              >
                Löschen
              </button>
            </div>
          </li>
        ))}
        {notes.length === 0 ? (
          <p className="text-sm text-text-muted">Noch keine Notizen.</p>
        ) : null}
      </ul>
      <Textarea
        label="Neue Notiz"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
      />
      <Button
        className="mt-2"
        size="sm"
        onClick={() => addNote.mutate()}
        loading={addNote.isPending}
        disabled={!content.trim()}
      >
        Notiz hinzufügen
      </Button>
    </section>
  )
}
