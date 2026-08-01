import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { Modal } from '@/components/ui/Modal'
import { EntityLinksSection } from '@/features/entity-links/EntityLinksSection'
import { EntityForm, entityFormDefaultsFromRow } from '@/features/entities/EntityForm'
import { EntityTypeDetailFields } from '@/features/entities/EntityTypeDetailFields'
import { formValuesToEntityDates, formatEntityDateRange } from '@/features/entities/entity-date-utils'
import {
  detailTypeForEntity,
  parseDetailPayload,
} from '@/features/entities/detail-payload-utils'
import {
  getEntityTypeMeta,
  getStatusLabel,
} from '@/features/entities/entity-types'
import type { EntityFormValues } from '@/features/entities/entity-form-schema'
import {
  useBudgets,
  useEntity,
  useEntityDetailPayload,
  useSoftDeleteEntity,
  useUpdateEntity,
} from '@/features/entities/useEntities'
import { ListDetail } from '@/features/lists/ListDetail'
import { LocationAttach } from '@/features/locations/LocationAttach'
import { NotesSection } from '@/features/notes/NotesSection'
import { WidgetBoard } from '@/features/widgets/WidgetBoard'
import { MediaPicker } from '@/features/media/MediaPicker'
import { upsertEntityDetail } from '@/lib/indexed-db/repositories/entity-details'
import { useAuth } from '@/features/auth/AuthProvider'
import type { EntityType } from '@/lib/indexed-db/schema'

interface EntityDetailPageProps {
  type: EntityType
  id: string
}

export function EntityDetailPage({ type, id }: EntityDetailPageProps) {
  const navigate = useNavigate()
  const { spaceId, session } = useAuth()
  const { data: entity, isLoading, error } = useEntity(id)
  const detailType = detailTypeForEntity(type)
  const { data: detailPayload } = useEntityDetailPayload(id, detailType ?? 'trip')
  const updateEntity = useUpdateEntity()
  const softDelete = useSoftDeleteEntity()
  const { data: budgets = [] } = useBudgets()
  const [editing, setEditing] = useState(false)
  const [detailValues, setDetailValues] = useState(parseDetailPayload(type, null))
  const [confirmDelete, setConfirmDelete] = useState(false)

  const meta = getEntityTypeMeta(type)
  const budgetOptions = budgets.map((b) => ({ value: b.id, label: b.name }))

  if (isLoading) return <LoadingState />
  if (error || !entity) {
    return (
      <ErrorState
        title="Eintrag nicht gefunden"
        message="Der Eintrag existiert nicht oder wurde gelöscht."
        onRetry={() => void navigate('/planen')}
        retryLabel="Zur Planung"
      />
    )
  }

  const handleEditOpen = () => {
    setDetailValues(parseDetailPayload(type, detailPayload as Record<string, unknown> | null))
    setEditing(true)
  }

  const handleSave = async (values: EntityFormValues) => {
    if (!spaceId) return
    const dates = formValuesToEntityDates(values)
    await updateEntity.mutateAsync({
      id,
      patch: {
        title: values.title,
        description: values.description || null,
        status: values.status,
        ...dates,
      },
    })
    if (detailType) {
      await upsertEntityDetail({
        entityId: id,
        spaceId,
        detailType,
        payload: detailValues as Record<string, unknown>,
      })
    }
    setEditing(false)
  }

  const handleDelete = async () => {
    await softDelete.mutateAsync(id)
    setConfirmDelete(false)
    void navigate('/planen')
  }

  const dateLabel = formatEntityDateRange(entity)

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 sm:py-8">
      <header className="mb-5">
        <div className="mb-2 flex items-center gap-2 text-primary">{meta.icon}</div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-text-muted">{meta.label}</p>
            <h1 className="text-heading text-balance">{entity.title}</h1>
          </div>
          <Badge variant="primary">{getStatusLabel(type, entity.status)}</Badge>
        </div>
        {dateLabel ? <p className="mt-2 text-sm text-text-muted">{dateLabel}</p> : null}
        {entity.description ? (
          <p className="mt-4 text-text whitespace-pre-wrap">{entity.description}</p>
        ) : null}
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={handleEditOpen}>
          Bearbeiten
        </Button>
        <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
          Löschen
        </Button>
      </div>

      {spaceId ? (
        <section className="mb-6">
          <h2 className="mb-1 font-serif text-xl text-text">Fotos</h2>
          <p className="mb-3 text-sm text-text-muted">
            Fotos jederzeit hinzufügen — auch wenn der Eintrag noch geplant ist.
          </p>
          <MediaPicker spaceId={spaceId} entityId={id} userId={session?.userId ?? null} />
        </section>
      ) : null}

      {spaceId ? (
        <section className="mb-6">
          <WidgetBoard spaceId={spaceId} entityId={id} entityType={type} editable />
        </section>
      ) : null}

      {type === 'list' ? <ListDetail entityId={id} /> : null}

      {['trip', 'date', 'moment', 'event'].includes(type) ? (
        <div className="mt-6">
          <LocationAttach entityId={id} />
        </div>
      ) : null}

      <div className="mt-6">
        <NotesSection entityId={id} />
      </div>

      <div className="mt-6">
        <EntityLinksSection entityId={id} />
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title={`${meta.label} bearbeiten`}>
        <EntityForm
          entityType={type}
          defaultValues={entityFormDefaultsFromRow(entity)}
          onSubmit={handleSave}
          onCancel={() => setEditing(false)}
          loading={updateEntity.isPending}
        >
          <EntityTypeDetailFields
            entityType={type}
            values={detailValues}
            onChange={setDetailValues}
            budgetOptions={budgetOptions}
          />
        </EntityForm>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Eintrag löschen?"
        description="Der Eintrag wird in den Papierkorb verschoben und kann dort wiederhergestellt werden."
      >
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setConfirmDelete(false)}>
            Abbrechen
          </Button>
          <Button variant="danger" fullWidth loading={softDelete.isPending} onClick={() => void handleDelete()}>
            Löschen
          </Button>
        </div>
      </Modal>
    </div>
  )
}
