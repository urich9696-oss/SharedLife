import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  defaultDetailForType,
  detailTypeForEntity,
} from '@/features/entities/detail-payload-utils'
import { entityDetailPath, getEntityTypeMeta } from '@/features/entities/entity-types'
import { useCreateEntity } from '@/features/entities/useEntities'
import { ENTITY_TYPES, type EntityType } from '@/lib/indexed-db/schema'
import { createChecklist } from '@/lib/indexed-db/repositories/checklists'
import { upsertEntityDetail } from '@/lib/indexed-db/repositories/entity-details'

function resolveType(raw: string | null): EntityType {
  if (raw && (ENTITY_TYPES as readonly string[]).includes(raw)) return raw as EntityType
  return 'event'
}

export function CreatePlanningPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const entityType = useMemo(() => resolveType(params.get('type')), [params])
  const meta = getEntityTypeMeta(entityType)

  // Dedicated shopping module replaces generic list creation
  if (entityType === 'list') {
    void navigate('/einkauf?focus=1', { replace: true })
  }
  const { spaceId } = useAuth()
  const createEntity = useCreateEntity()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const needsDate = ['event', 'trip', 'date', 'gift', 'task'].includes(entityType)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!spaceId) {
      setError('Kein Space geladen.')
      return
    }
    if (!title.trim()) {
      setError('Titel ist erforderlich.')
      return
    }
    if (needsDate && !date) {
      setError('Datum ist erforderlich.')
      return
    }

    setError(null)
    const id = uuidv4()
    try {
      await createEntity.mutateAsync({
        id,
        space_id: spaceId,
        entity_type: entityType,
        title: title.trim(),
        description: notes.trim() || null,
        status: entityType === 'date' || entityType === 'trip' || entityType === 'gift' ? 'draft' : 'active',
        all_day_start: date || null,
        all_day_end: date || null,
        sort_order: 0,
        metadata: {},
      })

      const detailType = detailTypeForEntity(entityType)
      if (detailType) {
        await upsertEntityDetail({
          entityId: id,
          spaceId,
          detailType,
          payload: defaultDetailForType(entityType) as Record<string, unknown>,
        })
      }

      if (entityType === 'list') {
        await createChecklist({
          id: uuidv4(),
          spaceId,
          entityId: id,
          title: 'Einkaufsliste',
        })
      }

      void navigate(entityDetailPath(entityType, id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <header className="mb-8">
        <h1 className="font-serif text-3xl text-text">{meta.label} erstellen</h1>
        <p className="mt-2 text-text-muted">{meta.description}</p>
      </header>

      {error ? (
        <p className="mb-4 rounded-[16px] bg-error-subtle px-3 py-2 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <form className="flex flex-col gap-5" onSubmit={(e) => void handleSubmit(e)}>
        <Input
          label="Titel"
          placeholder={`z. B. ${meta.label}`}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        {needsDate ? (
          <Input
            label="Datum"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        ) : null}
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
          <Button type="button" variant="secondary" onClick={() => void navigate(-1)}>
            Abbrechen
          </Button>
        </div>
      </form>
    </div>
  )
}
