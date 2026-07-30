import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/features/auth/AuthProvider'
import { useCreateEntity } from '@/features/entities/useEntities'
import { entityDetailPath } from '@/features/entities/entity-types'
import { upsertEntityDetail } from '@/lib/indexed-db/repositories/entity-details'

export function CreatePlanningPage() {
  const navigate = useNavigate()
  const { spaceId } = useAuth()
  const createEntity = useCreateEntity()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!spaceId) {
      setError('Kein Space geladen.')
      return
    }
    if (!title.trim() || !date) {
      setError('Titel und Datum sind erforderlich.')
      return
    }

    setError(null)
    const id = uuidv4()
    try {
      await createEntity.mutateAsync({
        id,
        space_id: spaceId,
        entity_type: 'event',
        title: title.trim(),
        description: notes.trim() || null,
        status: 'active',
        all_day_start: date,
        all_day_end: date,
        sort_order: 0,
        metadata: {},
      })
      await upsertEntityDetail({
        entityId: id,
        spaceId,
        detailType: 'event',
        payload: { locationName: '', recurrenceRule: '', calendarColor: '' },
      })
      void navigate(entityDetailPath('event', id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <header className="mb-8">
        <h1 className="text-heading">Neuer Termin</h1>
        <p className="mt-2 text-text-muted">Schnell einen ganztägigen Termin anlegen.</p>
      </header>

      {error ? (
        <p className="mb-4 rounded-lg bg-error-subtle px-3 py-2 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <form className="flex flex-col gap-5" onSubmit={(e) => void handleSubmit(e)}>
        <Input
          label="Titel"
          placeholder="z. B. Abendessen bei Oma"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input
          label="Datum"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Textarea
          label="Notizen"
          placeholder="Optional…"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex gap-3 pt-2">
          <Button type="submit" fullWidth loading={createEntity.isPending}>
            Speichern
          </Button>
          <Button type="button" variant="secondary" onClick={() => void navigate('/planen')}>
            Abbrechen
          </Button>
        </div>
      </form>
    </div>
  )
}
