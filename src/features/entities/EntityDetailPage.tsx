import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { HeroCard } from '@/components/ui/HeroCard'
import { LoadingState } from '@/components/ui/LoadingState'
import { Modal } from '@/components/ui/Modal'
import { saveDateAsMoment } from '@/features/dates/save-as-moment'
import { EntityLinksSection } from '@/features/entity-links/EntityLinksSection'
import { EntityForm, entityFormDefaultsFromRow } from '@/features/entities/EntityForm'
import { EntityTypeDetailFields } from '@/features/entities/EntityTypeDetailFields'
import { formValuesToEntityDates, formatEntityDateRange } from '@/features/entities/entity-date-utils'
import {
  detailTypeForEntity,
  parseDetailPayload,
} from '@/features/entities/detail-payload-utils'
import { metadataFromDetail } from '@/features/entities/detail-metadata'
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
import {
  addRecipeIngredientsToShopping,
  getRecipeIngredients,
} from '@/features/recipes/recipe-service'
import { upsertEntityDetail } from '@/lib/indexed-db/repositories/entity-details'
import { useAuth } from '@/features/auth/AuthProvider'
import { db } from '@/lib/indexed-db/db'
import type { EntityType } from '@/lib/indexed-db/schema'
import type { TaskDetailValues } from '@/features/tasks/TaskForm'

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
  const [converting, setConverting] = useState(false)
  const [recipeMsg, setRecipeMsg] = useState<string | null>(null)

  const meta = getEntityTypeMeta(type)
  const budgetOptions = budgets.map((b) => ({ value: b.id, label: b.name }))

  const { data: coverPath } = useQuery({
    queryKey: ['entity-cover', id, spaceId],
    enabled: Boolean(spaceId && id),
    queryFn: async () => {
      const [links, assets] = await Promise.all([
        db.entityMedia.where('entity_id').equals(id).toArray(),
        db.mediaAssets.where('space_id').equals(spaceId!).toArray(),
      ])
      const sorted = links.sort((a, b) => a.sort_order - b.sort_order)
      for (const link of sorted) {
        const asset = assets.find(
          (a) => a.id === link.media_id && !a.deleted_at && a.variant === 'display',
        )
        if (asset) return asset.storage_path
      }
      return null
    },
  })

  const assigneeLabel = useMemo(() => {
    if (type !== 'task') return null
    const role =
      (detailPayload as TaskDetailValues | null)?.assigneeRole ||
      String(entity?.metadata?.assigneeRole ?? '')
    if (role === 'dennis') return 'Dennis'
    if (role === 'lea') return 'Lea'
    if (role === 'gemeinsam') return 'Gemeinsam'
    return null
  }, [type, detailPayload, entity?.metadata])

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
    const parsed = parseDetailPayload(type, detailPayload as Record<string, unknown> | null)
    setDetailValues({
      ...parsed,
      ...Object.fromEntries(
        Object.entries(entity.metadata ?? {}).filter(([key]) =>
          [
            'assigneeRole',
            'taskCategory',
            'taskAssignment',
            'recurrenceRule',
            'subtasksText',
            'eventAssignment',
            'reservationStatus',
            'place',
            'momentCategory',
            'belonging',
            'packingListText',
            'placesText',
            'budgetAmount',
            'occasion',
            'wishStatus',
            'link',
            'amount',
            'category',
            'paidBy',
            'financeKind',
            'recurrence',
          ].includes(key),
        ),
      ),
      ...(type === 'event'
        ? { assignment: entity.metadata?.eventAssignment ?? (parsed as { assignment?: string }).assignment }
        : {}),
      ...(type === 'moment'
        ? {
            place: entity.metadata?.place ?? (parsed as { place?: string }).place,
            category: entity.metadata?.momentCategory ?? (parsed as { category?: string }).category,
            belonging: entity.metadata?.belonging ?? '',
          }
        : {}),
      ...(type === 'leisure'
        ? {
            place: entity.metadata?.place ?? '',
            link: entity.metadata?.link ?? '',
          }
        : {}),
      ...(type === 'expense'
        ? {
            amount: entity.metadata?.amount ?? '',
            category: entity.metadata?.category ?? '',
            paidBy: entity.metadata?.paidBy ?? 'gemeinsam',
            kind: entity.metadata?.financeKind ?? 'expense',
            recurrence: entity.metadata?.recurrence ?? 'once',
          }
        : {}),
      ...(type === 'task'
        ? {
            assigneeRole: entity.metadata?.assigneeRole ?? (parsed as TaskDetailValues).assigneeRole,
            assignment: entity.metadata?.taskAssignment ?? '',
            recurrenceRule: entity.metadata?.recurrenceRule ?? 'none',
            subtasksText: entity.metadata?.subtasksText ?? '',
            category: entity.metadata?.taskCategory ?? '',
          }
        : {}),
    })
    setEditing(true)
  }

  const handleSave = async (values: EntityFormValues) => {
    if (!spaceId) return
    const dates = formValuesToEntityDates(type === 'leisure' ? { ...values, allDay: true } : values)
    const metadata = metadataFromDetail(type, detailValues, entity.metadata)
    await updateEntity.mutateAsync({
      id,
      patch: {
        title: values.title,
        description: values.description || null,
        status: values.status,
        metadata,
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

  const handleSaveAsMoment = async () => {
    if (!spaceId) return
    setConverting(true)
    try {
      const momentId = await saveDateAsMoment({
        spaceId,
        dateEntity: entity,
        userId: session?.userId,
      })
      void navigate(`/entities/moment/${momentId}`)
    } finally {
      setConverting(false)
    }
  }

  const handleRecipeToShopping = async () => {
    if (!spaceId) return
    const result = await addRecipeIngredientsToShopping({
      spaceId,
      entityId: id,
      userId: session?.userId,
    })
    const ingredients = await getRecipeIngredients(id)
    setRecipeMsg(
      ingredients.ingredients.length === 0
        ? 'Keine Zutaten vorhanden'
        : result.added > 0
          ? `${result.added} Zutat(en) zur Einkaufsliste hinzugefügt`
          : 'Alle Zutaten waren bereits vorhanden',
    )
  }

  const dateLabel = formatEntityDateRange(entity)
  const alreadyConverted = Boolean(entity.metadata?.convertedToMomentId)

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 sm:py-8">
      <div className="mb-5">
        <HeroCard
          title={entity.title}
          subtitle={dateLabel || entity.subtitle || meta.label}
          eyebrow={meta.label}
          mediaPath={coverPath}
          spaceId={spaceId}
          aspectClassName="aspect-[16/10] max-h-72"
          ctaLabel={undefined}
        />
      </div>

      <header className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {assigneeLabel ? (
              <p className="text-sm text-text-muted">Zuständig: {assigneeLabel}</p>
            ) : null}
          </div>
          <Badge variant="primary">{getStatusLabel(type, entity.status)}</Badge>
        </div>
        {entity.description ? (
          <p className="mt-4 text-text whitespace-pre-wrap">{entity.description}</p>
        ) : null}
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={handleEditOpen}>
          Bearbeiten
        </Button>
        {type === 'date' && !alreadyConverted ? (
          <Button
            variant="accent"
            size="sm"
            loading={converting}
            onClick={() => void handleSaveAsMoment()}
          >
            Als Moment speichern
          </Button>
        ) : null}
        {type === 'recipe' ? (
          <Button variant="primary" size="sm" onClick={() => void handleRecipeToShopping()}>
            Zutaten einkaufen
          </Button>
        ) : null}
        <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
          Löschen
        </Button>
      </div>
      {recipeMsg ? <p className="mb-4 text-sm text-text-muted">{recipeMsg}</p> : null}

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
