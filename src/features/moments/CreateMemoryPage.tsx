import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useAuth } from '@/features/auth/AuthProvider'
import { defaultDetailForType } from '@/features/entities/detail-payload-utils'
import { metadataFromDetail } from '@/features/entities/detail-metadata'
import { EntityForm } from '@/features/entities/EntityForm'
import { EntityTypeDetailFields } from '@/features/entities/EntityTypeDetailFields'
import { formValuesToEntityDates } from '@/features/entities/entity-date-utils'
import type { EntityFormValues } from '@/features/entities/entity-form-schema'
import { entityDetailPath } from '@/features/entities/entity-types'
import { useCreateEntity } from '@/features/entities/useEntities'
import type { MomentDetailValues } from '@/features/moments/MomentForm'
import { upsertEntityDetail } from '@/lib/indexed-db/repositories/entity-details'

export function CreateMemoryPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const belongsTo = params.get('belongsTo') || ''
  const { spaceId } = useAuth()
  const createEntity = useCreateEntity()
  const [detailValues, setDetailValues] = useState(() => {
    const base = defaultDetailForType('moment') as MomentDetailValues
    return { ...base, belongsToEntityId: belongsTo }
  })
  const [error, setError] = useState<string | null>(null)

  const initialDates = useMemo(
    () => ({
      title: '',
      description: '',
      status: 'active' as const,
      allDay: true,
      startDate: '',
    }),
    [],
  )

  const handleSubmit = async (values: EntityFormValues) => {
    if (!spaceId) {
      setError('Kein Space geladen.')
      return
    }
    setError(null)
    const id = uuidv4()
    const dates = formValuesToEntityDates({ ...values, allDay: true })
    const moment = detailValues as MomentDetailValues
    const metadata = metadataFromDetail('moment', detailValues)
    const parentId = moment.belongsToEntityId || belongsTo || null

    try {
      await createEntity.mutateAsync({
        id,
        space_id: spaceId,
        entity_type: 'moment',
        title: values.title.trim(),
        description: values.description?.trim() || null,
        status: 'active',
        ...dates,
        parent_entity_id: parentId,
        sort_order: 0,
        metadata: {
          ...metadata,
          belongsToEntityId: parentId || '',
        },
      })
      await upsertEntityDetail({
        entityId: id,
        spaceId,
        detailType: 'moment',
        payload: {
          ...moment,
          capturedAt: values.startDate
            ? `${values.startDate}T12:00:00.000Z`
            : moment.capturedAt,
          highlight: moment.highlight,
        },
      })
      void navigate(entityDetailPath('moment', id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    }
  }

  return (
    <div className="mx-auto max-w-lg px-page py-6 lg:py-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">Momente</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-text">Neuer Moment</h1>
        <p className="mt-4 text-[17px] text-text-muted">
          Haltet einen Augenblick fest — mit Foto, Ort und Geschichte.
        </p>
      </header>

      {error ? (
        <p className="mb-4 rounded-lg bg-error-subtle px-4 py-2 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <EntityForm
        entityType="moment"
        defaultValues={initialDates}
        onSubmit={handleSubmit}
        onCancel={() => void navigate('/erinnerungen')}
        submitLabel="Festhalten"
        loading={createEntity.isPending}
      >
        <EntityTypeDetailFields
          entityType="moment"
          values={detailValues}
          onChange={(v) => setDetailValues(v as MomentDetailValues)}
        />
      </EntityForm>
    </div>
  )
}
