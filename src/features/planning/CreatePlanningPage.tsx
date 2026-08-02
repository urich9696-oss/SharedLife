import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
import type { DateDetailValues } from '@/features/dates/DateForm'
import { leisurePrefill, planLeisureAsDate } from '@/features/ideas/leisure-to-date'
import type { RecipeDetailValues } from '@/features/recipes/RecipeForm'
import { seedRecipeIngredients } from '@/features/recipes/recipe-service'
import { useSync } from '@/features/sync/SyncProvider'
import type { TaskDetailValues } from '@/features/tasks/TaskForm'
import type { TripDetailValues } from '@/features/trips/TripForm'
import { createChecklist, createChecklistItem } from '@/lib/indexed-db/repositories/checklists'
import { getEntity } from '@/lib/indexed-db/repositories/entities'
import { upsertEntityDetail } from '@/lib/indexed-db/repositories/entity-details'
import { ENTITY_TYPES, type EntityType } from '@/lib/indexed-db/schema'

function resolveType(raw: string | null): EntityType {
  // Legacy-Links ?type=gift → immer wish (wish_details / Partner-Sync)
  if (raw === 'gift') return 'wish'
  if (raw && (ENTITY_TYPES as readonly string[]).includes(raw)) return raw as EntityType
  return 'event'
}

export function CreatePlanningPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const entityType = useMemo(() => resolveType(params.get('type')), [params])
  const parentId = params.get('parent') || ''
  const fromLeisureId = params.get('fromLeisure') || ''
  const meta = getEntityTypeMeta(entityType)
  const { spaceId, session } = useAuth()
  const createEntity = useCreateEntity()
  const { pushNow } = useSync()
  const { data: budgets = [] } = useBudgets()
  const submittingRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const [formDefaults, setFormDefaults] = useState<Partial<EntityFormValues> | undefined>()
  const [detailValues, setDetailValues] = useState(() => {
    const base = defaultDetailForType(entityType)
    if (entityType === 'task' && parentId) {
      return { ...base, assignmentEntityId: parentId }
    }
    if ((entityType === 'date' || entityType === 'moment') && parentId) {
      return { ...base, belongsToEntityId: parentId }
    }
    return base
  })
  const [error, setError] = useState<string | null>(null)

  const { data: leisureSource } = useQuery({
    queryKey: ['from-leisure', fromLeisureId],
    enabled: Boolean(fromLeisureId) && entityType === 'date',
    queryFn: () => getEntity(fromLeisureId),
  })

  useEffect(() => {
    if (entityType === 'list') {
      void navigate('/einkauf?focus=1', { replace: true })
    }
  }, [entityType, navigate])

  useEffect(() => {
    if (leisureSource && entityType === 'date') {
      const prefill = leisurePrefill(leisureSource)
      setFormDefaults(prefill.form)
      setDetailValues({
        ...defaultDetailForType('date'),
        ...prefill.detail,
        ...(parentId ? { belongsToEntityId: parentId } : {}),
      })
      return
    }

    const base = defaultDetailForType(entityType)
    if (entityType === 'task' && parentId) {
      setDetailValues({ ...base, assignmentEntityId: parentId })
    } else if ((entityType === 'date' || entityType === 'moment') && parentId) {
      setDetailValues({ ...base, belongsToEntityId: parentId })
    } else if (!fromLeisureId) {
      setDetailValues(base)
      setFormDefaults(undefined)
    }
  }, [entityType, parentId, leisureSource, fromLeisureId])

  const budgetOptions = budgets.map((b) => ({ value: b.id, label: b.name }))

  const handleSubmit = async (values: EntityFormValues) => {
    if (!spaceId) {
      setError('Kein Space geladen.')
      return
    }
    if (submittingRef.current || saving || createEntity.isPending) return
    submittingRef.current = true
    setSaving(true)
    setError(null)

    try {
      // Date-Idee → Date: nach Bestätigung speichern, Idee bleibt erhalten
      if (entityType === 'date' && leisureSource) {
        const dates = formValuesToEntityDates(values)
        const dateId = await planLeisureAsDate({
          spaceId,
          leisure: leisureSource,
          userId: session?.userId ?? null,
          title: values.title.trim(),
          description: values.description?.trim() || null,
          startsAt: dates.starts_at ?? null,
          allDayStart: dates.all_day_start ?? null,
          belongsToEntityId:
            parentId ||
            String((detailValues as DateDetailValues).belongsToEntityId || '') ||
            null,
          detail: detailValues as DateDetailValues,
        })
        try {
          await pushNow()
        } catch (err) {
          console.warn('[create-planning] push after leisure→date failed', {
            module: 'dates',
            operation: 'pushNow',
            message: err instanceof Error ? err.message : String(err),
          })
        }
        void navigate(entityDetailPath('date', dateId))
        return
      }

      const id = uuidv4()
      const dates = formValuesToEntityDates(
        entityType === 'leisure' ? { ...values, allDay: true } : values,
      )
      const metadata = metadataFromDetail(entityType, detailValues)
      const resolvedParent =
        parentId ||
        String(metadata.belongsToEntityId || metadata.taskAssignmentEntityId || '') ||
        null

      await createEntity.mutateAsync({
        id,
        space_id: spaceId,
        entity_type: entityType,
        title: values.title.trim(),
        description: values.description?.trim() || null,
        status: values.status,
        ...dates,
        parent_entity_id: resolvedParent,
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
        await seedRecipeIngredients({
          spaceId,
          entityId: id,
          ingredientsText: (detailValues as RecipeDetailValues).ingredientsText,
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

      try {
        await pushNow()
      } catch (err) {
        console.warn('[create-planning] push after create failed', {
          module: entityType,
          operation: 'pushNow',
          message: err instanceof Error ? err.message : String(err),
        })
      }

      void navigate(entityDetailPath(entityType, id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    } finally {
      submittingRef.current = false
      setSaving(false)
    }
  }

  if (entityType === 'list') return null

  const formKey = `${entityType}:${fromLeisureId}:${formDefaults?.title ?? ''}`

  return (
    <div className="mx-auto max-w-lg px-page py-6 lg:py-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
          {fromLeisureId && entityType === 'date' ? 'Aus Date-Idee' : 'Neu'}
        </p>
        <h1 className="mt-1 font-serif text-3xl text-text">{meta.label}</h1>
        <p className="mt-2 text-sm text-text-muted">
          {fromLeisureId && entityType === 'date'
            ? 'Titel, Ort und Notiz sind vorausgefüllt — Datum wählen und speichern.'
            : meta.description}
        </p>
      </header>

      {error ? (
        <p className="mb-4 rounded-[16px] bg-error-subtle px-3 py-2 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <EntityForm
        key={formKey}
        entityType={entityType}
        defaultValues={formDefaults}
        onSubmit={handleSubmit}
        onCancel={() => void navigate(-1)}
        submitLabel="Speichern"
        loading={saving || createEntity.isPending}
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
