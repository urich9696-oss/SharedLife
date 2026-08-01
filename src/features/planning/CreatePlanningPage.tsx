import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  defaultDetailForType,
  detailTypeForEntity,
} from '@/features/entities/detail-payload-utils'
import { metadataFromDetail } from '@/features/entities/detail-metadata'
import { EntityForm } from '@/features/entities/EntityForm'
import { EntityTypeDetailFields } from '@/features/entities/EntityTypeDetailFields'
import { formValuesToEntityDates } from '@/features/entities/entity-date-utils'
import type { EntityFormValues } from '@/features/entities/entity-form-schema'
import { entityDetailPath, getEntityTypeMeta } from '@/features/entities/entity-types'
import { useBudgets, useCreateEntity } from '@/features/entities/useEntities'
import type { TaskDetailValues } from '@/features/tasks/TaskForm'
import type { TripDetailValues } from '@/features/trips/TripForm'
import { createChecklist, createChecklistItem } from '@/lib/indexed-db/repositories/checklists'
import { upsertEntityDetail } from '@/lib/indexed-db/repositories/entity-details'
import { ENTITY_TYPES, type EntityType } from '@/lib/indexed-db/schema'

function resolveType(raw: string | null): EntityType {
  if (raw && (ENTITY_TYPES as readonly string[]).includes(raw)) return raw as EntityType
  return 'event'
}

export function CreatePlanningPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const entityType = useMemo(() => resolveType(params.get('type')), [params])
  const meta = getEntityTypeMeta(entityType)
  const { spaceId } = useAuth()
  const createEntity = useCreateEntity()
  const { data: budgets = [] } = useBudgets()
  const [detailValues, setDetailValues] = useState(() => defaultDetailForType(entityType))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (entityType === 'list') {
      void navigate('/einkauf?focus=1', { replace: true })
    }
  }, [entityType, navigate])

  useEffect(() => {
    setDetailValues(defaultDetailForType(entityType))
  }, [entityType])

  const budgetOptions = budgets.map((b) => ({ value: b.id, label: b.name }))

  const handleSubmit = async (values: EntityFormValues) => {
    if (!spaceId) {
      setError('Kein Space geladen.')
      return
    }
    setError(null)
    const id = uuidv4()
    const dates = formValuesToEntityDates(values)
    const metadata = metadataFromDetail(entityType, detailValues)

    try {
      await createEntity.mutateAsync({
        id,
        space_id: spaceId,
        entity_type: entityType,
        title: values.title.trim(),
        description: values.description?.trim() || null,
        status: values.status,
        ...dates,
        sort_order: 0,
        metadata,
      })

      const detailType = detailTypeForEntity(entityType)
      if (detailType) {
        await upsertEntityDetail({
          entityId: id,
          spaceId,
          detailType,
          payload: detailValues as Record<string, unknown>,
        })
      }

      if (entityType === 'recipe') {
        await createChecklist({
          id: uuidv4(),
          spaceId,
          entityId: id,
          title: 'Zutaten',
        })
      }

      if (entityType === 'task') {
        const subtasks = String((detailValues as TaskDetailValues).subtasksText || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        if (subtasks.length > 0) {
          const checklist = await createChecklist({
            id: uuidv4(),
            spaceId,
            entityId: id,
            title: 'Unteraufgaben',
          })
          for (const [index, title] of subtasks.entries()) {
            await createChecklistItem({
              id: uuidv4(),
              spaceId,
              checklistId: checklist.id,
              title,
              sortOrder: index,
            })
          }
        }
      }

      if (entityType === 'trip') {
        const packing = String((detailValues as TripDetailValues).packingListText || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
        if (packing.length > 0) {
          const checklist = await createChecklist({
            id: uuidv4(),
            spaceId,
            entityId: id,
            title: 'Packliste',
          })
          for (const [index, title] of packing.entries()) {
            await createChecklistItem({
              id: uuidv4(),
              spaceId,
              checklistId: checklist.id,
              title,
              sortOrder: index,
            })
          }
        }
      }

      void navigate(entityDetailPath(entityType, id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    }
  }

  if (entityType === 'list') return null

  return (
    <div className="mx-auto max-w-lg px-4 py-6 lg:py-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">Neu</p>
        <h1 className="mt-1 font-serif text-3xl text-text">{meta.label}</h1>
        <p className="mt-2 text-sm text-text-muted">{meta.description}</p>
      </header>

      {error ? (
        <p className="mb-4 rounded-[16px] bg-error-subtle px-3 py-2 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <EntityForm
        entityType={entityType}
        onSubmit={handleSubmit}
        onCancel={() => void navigate(-1)}
        submitLabel="Speichern"
        loading={createEntity.isPending}
      >
        <EntityTypeDetailFields
          entityType={entityType}
          values={detailValues}
          onChange={setDetailValues}
          budgetOptions={budgetOptions}
        />
      </EntityForm>
    </div>
  )
}
