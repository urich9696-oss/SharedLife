import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useAuth } from '@/features/auth/AuthProvider'
import { EntityForm } from '@/features/entities/EntityForm'
import { EntityTypeDetailFields } from '@/features/entities/EntityTypeDetailFields'
import { formValuesToEntityDates } from '@/features/entities/entity-date-utils'
import {
  ENTITY_TYPE_META,
  MORE_CREATE_TYPES,
  PRIMARY_CREATE_ACTIONS,
  entityDetailPath,
  getEntityTypeMeta,
  resolveCreateContext,
  type CreateContext,
} from '@/features/entities/entity-types'
import {
  defaultDetailForType,
  detailTypeForEntity,
} from '@/features/entities/detail-payload-utils'
import { metadataFromDetail } from '@/features/entities/detail-metadata'
import type { EntityFormValues } from '@/features/entities/entity-form-schema'
import { useBudgets, useCreateEntity } from '@/features/entities/useEntities'
import { upsertEntityDetail } from '@/lib/indexed-db/repositories/entity-details'
import type { EntityType } from '@/lib/indexed-db/schema'
import { createChecklist, createChecklistItem } from '@/lib/indexed-db/repositories/checklists'
import type { TaskDetailValues } from '@/features/tasks/TaskForm'
import type { TripDetailValues } from '@/features/trips/TripForm'

interface CreateEntitySheetProps {
  open: boolean
  onClose: () => void
}

type SheetView = 'menu' | 'more' | 'chooser' | 'form'

function orderPrimaryActions(context: CreateContext) {
  const preferred = PRIMARY_CREATE_ACTIONS.filter((action) =>
    (action.contexts as readonly string[]).includes(context),
  )
  const rest = PRIMARY_CREATE_ACTIONS.filter(
    (action) => !(action.contexts as readonly string[]).includes(context),
  )
  // Context-first, then remaining unique actions
  const seen = new Set<string>()
  return [...preferred, ...rest].filter((action) => {
    if (seen.has(action.key)) return false
    seen.add(action.key)
    return true
  })
}

export function CreateEntitySheet({ open, onClose }: CreateEntitySheetProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { spaceId } = useAuth()
  const createEntity = useCreateEntity()
  const { data: budgets = [] } = useBudgets()
  const [view, setView] = useState<SheetView>('menu')
  const [selectedType, setSelectedType] = useState<EntityType | null>(null)
  const [chooserTypes, setChooserTypes] = useState<EntityType[]>([])
  const [detailValues, setDetailValues] = useState(defaultDetailForType('trip'))
  const [formError, setFormError] = useState<string | null>(null)

  const context = resolveCreateContext(location.pathname, location.search)
  const primaryActions = useMemo(() => orderPrimaryActions(context), [context])
  const budgetOptions = budgets.map((b) => ({ value: b.id, label: b.name }))

  const reset = () => {
    setView('menu')
    setSelectedType(null)
    setChooserTypes([])
    setDetailValues(defaultDetailForType('trip'))
    setFormError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const openForm = (type: EntityType) => {
    setSelectedType(type)
    setDetailValues(defaultDetailForType(type))
    setView('form')
  }

  const handleSubmit = async (values: EntityFormValues) => {
    if (!selectedType) return
    if (!spaceId) {
      setFormError('Kein Space geladen. Bitte neu anmelden oder die Seite aktualisieren.')
      return
    }
    setFormError(null)
    const dates = formValuesToEntityDates(
      selectedType === 'leisure' ? { ...values, allDay: true } : values,
    )
    const id = uuidv4()

    try {
      const metadata = metadataFromDetail(selectedType, detailValues)

      await createEntity.mutateAsync({
        id,
        space_id: spaceId,
        entity_type: selectedType,
        title: values.title,
        description: values.description || null,
        status: values.status,
        ...dates,
        sort_order: 0,
        metadata,
      })

      const detailType = detailTypeForEntity(selectedType)
      if (detailType) {
        await upsertEntityDetail({
          entityId: id,
          spaceId,
          detailType,
          payload: detailValues as Record<string, unknown>,
        })
      }

      if (selectedType === 'list') {
        await createChecklist({
          id: uuidv4(),
          spaceId,
          entityId: id,
          title: 'Checkliste',
        })
      }

      if (selectedType === 'recipe') {
        await createChecklist({
          id: uuidv4(),
          spaceId,
          entityId: id,
          title: 'Zutaten',
        })
      }

      if (selectedType === 'task') {
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

      if (selectedType === 'trip') {
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

      handleClose()
      void navigate(entityDetailPath(selectedType, id))
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erstellen fehlgeschlagen')
    }
  }

  const title =
    view === 'form' && selectedType
      ? `${getEntityTypeMeta(selectedType).label} erstellen`
      : view === 'more'
        ? 'Mehr erstellen'
        : view === 'chooser'
          ? 'Reise oder Date'
          : 'Neu'

  return (
    <BottomSheet open={open} onClose={handleClose} title={title}>
      {view === 'menu' ? (
        <ul className="flex flex-col gap-2 pb-4">
          {primaryActions.map((action) => (
            <li key={action.key}>
              <button
                type="button"
                className="flex min-h-14 w-full items-center gap-3 rounded-[22px] border border-border/80 bg-bg px-4 py-4 text-left transition duration-280 hover:border-sand hover:bg-surface active:scale-[0.99]"
                onClick={() => {
                  if (action.kind === 'route') {
                    handleClose()
                    void navigate(action.path)
                    return
                  }
                  openForm(action.entityType)
                }}
              >
                <span className="text-primary">
                  {action.kind === 'entity'
                    ? ENTITY_TYPE_META[action.entityType].icon
                    : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                      </svg>
                    )}
                </span>
                <span>
                  <span className="block font-medium text-text">{action.label}</span>
                  <span className="mt-0.5 block text-sm text-text-muted">{action.description}</span>
                </span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="flex min-h-14 w-full items-center gap-3 rounded-[18px] border border-dashed border-border bg-transparent px-4 py-4 text-left transition hover:bg-surface"
              onClick={() => setView('more')}
            >
              <span>
                <span className="block font-medium text-text">Mehr erstellen</span>
                <span className="mt-0.5 block text-sm text-text-muted">
                  Projekt, Notiz, Zuhause und weitere Inhalte
                </span>
              </span>
            </button>
          </li>
        </ul>
      ) : null}

      {view === 'chooser' ? (
        <ul className="flex flex-col gap-2 pb-4">
          {chooserTypes.map((type) => {
            const meta = ENTITY_TYPE_META[type]
            return (
              <li key={type}>
                <button
                  type="button"
                  className="flex min-h-14 w-full items-center gap-3 rounded-[18px] border border-border bg-bg px-4 py-4 text-left"
                  onClick={() => openForm(type)}
                >
                  <span className="text-primary">{meta.icon}</span>
                  <span>
                    <span className="block font-medium text-text">{meta.label}</span>
                    <span className="mt-0.5 block text-sm text-text-muted">{meta.description}</span>
                  </span>
                </button>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              className="min-h-11 text-sm font-medium text-primary"
              onClick={() => setView('menu')}
            >
              Zurück
            </button>
          </li>
        </ul>
      ) : null}

      {view === 'more' ? (
        <ul className="flex flex-col gap-2 pb-4">
          {MORE_CREATE_TYPES.map((type) => {
            const meta = ENTITY_TYPE_META[type]
            return (
              <li key={type}>
                <button
                  type="button"
                  className="flex min-h-14 w-full items-center gap-3 rounded-[18px] border border-border bg-bg px-4 py-4 text-left"
                  onClick={() => openForm(type)}
                >
                  <span className="text-primary">{meta.icon}</span>
                  <span>
                    <span className="block font-medium text-text">{meta.label}</span>
                    <span className="mt-0.5 block text-sm text-text-muted">{meta.description}</span>
                  </span>
                </button>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              className="min-h-11 text-sm font-medium text-primary"
              onClick={() => setView('menu')}
            >
              Zurück
            </button>
          </li>
        </ul>
      ) : null}

      {view === 'form' && selectedType ? (
        <>
          {formError ? (
            <p className="mb-3 rounded-lg bg-error-subtle px-3 py-2 text-sm text-error" role="alert">
              {formError}
            </p>
          ) : null}
          <EntityForm
            entityType={selectedType}
            onSubmit={handleSubmit}
            onCancel={() => {
              setSelectedType(null)
              setView('menu')
            }}
            submitLabel="Erstellen"
            loading={createEntity.isPending}
          >
            <EntityTypeDetailFields
              entityType={selectedType}
              values={detailValues}
              onChange={setDetailValues}
              budgetOptions={budgetOptions}
            />
          </EntityForm>
        </>
      ) : null}
    </BottomSheet>
  )
}
