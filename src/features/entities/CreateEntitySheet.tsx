import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useAuth } from '@/features/auth/AuthProvider'
import { EntityForm } from '@/features/entities/EntityForm'
import { EntityTypeDetailFields } from '@/features/entities/EntityTypeDetailFields'
import { formValuesToEntityDates } from '@/features/entities/entity-date-utils'
import {
  ENTITY_TYPE_META,
  QUICK_CREATE_ACTIONS,
  QUICK_CREATE_TYPES,
  entityDetailPath,
  getEntityTypeMeta,
} from '@/features/entities/entity-types'
import {
  defaultDetailForType,
  detailTypeForEntity,
} from '@/features/entities/detail-payload-utils'
import type { EntityFormValues } from '@/features/entities/entity-form-schema'
import { useBudgets, useCreateEntity } from '@/features/entities/useEntities'
import { upsertEntityDetail } from '@/lib/indexed-db/repositories/entity-details'
import type { EntityType } from '@/lib/indexed-db/schema'
import { createChecklist } from '@/lib/indexed-db/repositories/checklists'

interface CreateEntitySheetProps {
  open: boolean
  onClose: () => void
}

export function CreateEntitySheet({ open, onClose }: CreateEntitySheetProps) {
  const navigate = useNavigate()
  const { spaceId } = useAuth()
  const createEntity = useCreateEntity()
  const { data: budgets = [] } = useBudgets()
  const [selectedType, setSelectedType] = useState<EntityType | null>(null)
  const [detailValues, setDetailValues] = useState(defaultDetailForType('trip'))
  const [formError, setFormError] = useState<string | null>(null)

  const budgetOptions = budgets.map((b) => ({ value: b.id, label: b.name }))

  const reset = () => {
    setSelectedType(null)
    setDetailValues(defaultDetailForType('trip'))
    setFormError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (values: EntityFormValues) => {
    if (!selectedType) return
    if (!spaceId) {
      setFormError('Kein Space geladen. Bitte neu anmelden oder die Seite aktualisieren.')
      return
    }
    setFormError(null)
    const dates = formValuesToEntityDates(values)
    const id = uuidv4()

    try {
      await createEntity.mutateAsync({
        id,
        space_id: spaceId,
        entity_type: selectedType,
        title: values.title,
        description: values.description || null,
        status: values.status,
        ...dates,
        sort_order: 0,
        metadata: {},
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

      handleClose()
      void navigate(entityDetailPath(selectedType, id))
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erstellen fehlgeschlagen')
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title={selectedType ? `${getEntityTypeMeta(selectedType).label} erstellen` : 'Was möchtest du erstellen?'}
    >
      {!selectedType ? (
        <ul className="flex flex-col gap-2 pb-4">
          {QUICK_CREATE_ACTIONS.map((action) => (
            <li key={action.key}>
              <button
                type="button"
                className="flex min-h-14 w-full items-center gap-3 rounded-[18px] border border-border bg-bg px-4 py-4 text-left transition duration-200 hover:border-sand hover:bg-surface active:scale-[0.99]"
                onClick={() => {
                  handleClose()
                  void navigate(action.path)
                }}
              >
                <span className="text-primary">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </span>
                <span>
                  <span className="block font-medium text-text">{action.label}</span>
                  <span className="mt-0.5 block text-sm text-text-muted">{action.description}</span>
                </span>
              </button>
            </li>
          ))}
          {QUICK_CREATE_TYPES.map((type) => {
            const meta = ENTITY_TYPE_META[type]
            return (
              <li key={type}>
                <button
                  type="button"
                  className="flex min-h-14 w-full items-center gap-3 rounded-[18px] border border-border bg-bg px-4 py-4 text-left transition duration-200 hover:border-sand hover:bg-surface active:scale-[0.99]"
                  onClick={() => {
                    setSelectedType(type)
                    setDetailValues(defaultDetailForType(type))
                  }}
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
        </ul>
      ) : (
        <>
          {formError ? (
            <p className="mb-3 rounded-lg bg-error-subtle px-3 py-2 text-sm text-error" role="alert">
              {formError}
            </p>
          ) : null}
          <EntityForm
            entityType={selectedType}
            onSubmit={handleSubmit}
            onCancel={() => setSelectedType(null)}
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
      )}
    </BottomSheet>
  )
}
