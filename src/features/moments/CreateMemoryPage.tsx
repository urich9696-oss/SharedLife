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

export function CreateMemoryPage() {
  const navigate = useNavigate()
  const { spaceId } = useAuth()
  const createEntity = useCreateEntity()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [story, setStory] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!spaceId) {
      setError('Kein Space geladen.')
      return
    }
    if (!title.trim() || !story.trim()) {
      setError('Titel und Geschichte sind erforderlich.')
      return
    }

    setError(null)
    const id = uuidv4()
    try {
      await createEntity.mutateAsync({
        id,
        space_id: spaceId,
        entity_type: 'moment',
        title: title.trim(),
        description: story.trim(),
        status: 'active',
        all_day_start: date || null,
        all_day_end: date || null,
        sort_order: 0,
        metadata: {},
      })
      await upsertEntityDetail({
        entityId: id,
        spaceId,
        detailType: 'moment',
        payload: {
          capturedAt: date ? `${date}T12:00:00.000Z` : '',
          mood: '',
          weather: '',
          highlight: false,
        },
      })
      void navigate(entityDetailPath('moment', id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <header className="mb-8">
        <h1 className="text-heading">Neue Erinnerung</h1>
        <p className="mt-2 text-text-muted">Haltet einen Moment fest — er landet in euren Erinnerungen.</p>
      </header>

      {error ? (
        <p className="mb-4 rounded-lg bg-error-subtle px-3 py-2 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <form className="flex flex-col gap-5" onSubmit={(e) => void handleSubmit(e)}>
        <Input
          label="Titel"
          placeholder="z. B. Erster Schultag"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input
          label="Datum"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Textarea
          label="Geschichte"
          placeholder="Was ist passiert?"
          rows={5}
          required
          value={story}
          onChange={(e) => setStory(e.target.value)}
        />
        <div className="flex gap-3 pt-2">
          <Button type="submit" fullWidth loading={createEntity.isPending}>
            Festhalten
          </Button>
          <Button type="button" variant="secondary" onClick={() => void navigate('/erinnerungen')}>
            Abbrechen
          </Button>
        </div>
      </form>
    </div>
  )
}
