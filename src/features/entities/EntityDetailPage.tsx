import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { Modal } from '@/components/ui/Modal'
import { PageEnter } from '@/components/ui/PageEnter'
import { saveDateAsMoment } from '@/features/dates/save-as-moment'
import { planLeisureAsDate } from '@/features/ideas/leisure-to-date'
import {
  DETAIL_MENU_ICONS,
  DetailChrome,
  type DetailMenuAction,
} from '@/features/entities/detail/DetailChrome'
import { EntityGallery } from '@/features/entities/detail/EntityGallery'
import { HeroMedia } from '@/features/entities/detail/HeroMedia'
import { MetaList, MetaRow, SectionTitle } from '@/features/entities/detail/MetaList'
import {
  RelatedDates,
  RelatedMoments,
  RelatedTasks,
} from '@/features/entities/detail/RelatedSection'
import { groupForEntityType, groupLabel, hasHeroMedia } from '@/features/entities/detail/detail-groups'
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
  useCreateEntity,
  useEntity,
  useEntityDetailPayload,
  useSoftDeleteEntity,
  useUpdateEntity,
} from '@/features/entities/useEntities'
import { ListDetail } from '@/features/lists/ListDetail'
import { CompactNotes } from '@/features/notes/CompactNotes'
import {
  addRecipeIngredientsToShopping,
  getRecipeIngredients,
} from '@/features/recipes/recipe-service'
import { upsertEntityDetail } from '@/lib/indexed-db/repositories/entity-details'
import { useAuth } from '@/features/auth/AuthProvider'
import { db } from '@/lib/indexed-db/db'
import type { EntityType } from '@/lib/indexed-db/schema'
import type { DateDetailValues } from '@/features/dates/DateForm'
import type { MomentDetailValues } from '@/features/moments/MomentForm'
import type { TaskDetailValues } from '@/features/tasks/TaskForm'
import { v4 as uuidv4 } from 'uuid'

interface EntityDetailPageProps {
  type: EntityType
  id: string
}

function assigneeLabelOf(meta: Record<string, unknown> | undefined): string | null {
  const role = String(meta?.assigneeRole ?? '')
  if (role === 'dennis') return 'Dennis'
  if (role === 'lea') return 'Lea'
  if (role === 'gemeinsam') return 'Gemeinsam'
  return null
}

export function EntityDetailPage({ type, id }: EntityDetailPageProps) {
  const navigate = useNavigate()
  const { spaceId, session } = useAuth()
  const { data: entity, isLoading, error } = useEntity(id)
  const detailType = detailTypeForEntity(type)
  const { data: detailPayload } = useEntityDetailPayload(id, detailType ?? 'trip')
  const updateEntity = useUpdateEntity()
  const softDelete = useSoftDeleteEntity()
  const createEntity = useCreateEntity()
  const { data: budgets = [] } = useBudgets()
  const [editing, setEditing] = useState(false)
  const [detailValues, setDetailValues] = useState(parseDetailPayload(type, null))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState(false)

  const meta = getEntityTypeMeta(type)
  const group = groupForEntityType(type)
  const budgetOptions = budgets.map((b) => ({ value: b.id, label: b.name }))
  const showHero = hasHeroMedia(type) || type === 'event' || type === 'task'

  const { data: coverPath } = useQuery({
    queryKey: ['entity-cover', id, spaceId],
    enabled: Boolean(spaceId && id),
    queryFn: async () => {
      const [links, assets] = await Promise.all([
        db.entityMedia.where('entity_id').equals(id).toArray(),
        db.mediaAssets.where('space_id').equals(spaceId!).toArray(),
      ])
      const sorted = [...links].sort((a, b) => {
        if (a.role === 'cover' && b.role !== 'cover') return -1
        if (b.role === 'cover' && a.role !== 'cover') return 1
        return a.sort_order - b.sort_order
      })
      for (const link of sorted) {
        const asset = assets.find(
          (a) => a.id === link.media_id && !a.deleted_at && a.variant === 'display',
        )
        if (asset) return asset.storage_path
      }
      return null
    },
  })

  const { data: belongingTitle } = useQuery({
    queryKey: ['belonging-title', entity?.metadata?.belongsToEntityId],
    enabled: Boolean(entity?.metadata?.belongsToEntityId),
    queryFn: async () => {
      const row = await db.entities.get(String(entity!.metadata!.belongsToEntityId))
      return row && !row.deleted_at ? row.title : null
    },
  })

  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2400)
  }

  if (isLoading) return <LoadingState />
  if (error || !entity) {
    return (
      <ErrorState
        title="Eintrag nicht gefunden"
        message="Der Eintrag existiert nicht oder wurde gelöscht."
        onRetry={() => void navigate(-1)}
        retryLabel="Zurück"
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
            'taskAssignmentEntityId',
            'assignmentEntityId',
            'belongsToEntityId',
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
            place: entity.metadata?.place ?? (parsed as MomentDetailValues).place,
            category: entity.metadata?.momentCategory ?? (parsed as MomentDetailValues).category,
            belonging: entity.metadata?.belonging ?? '',
            belongsToEntityId: String(entity.metadata?.belongsToEntityId ?? ''),
          }
        : {}),
      ...(type === 'date'
        ? {
            venueName:
              (detailPayload as DateDetailValues | null)?.venueName ||
              String(entity.metadata?.place ?? ''),
            belongsToEntityId: String(entity.metadata?.belongsToEntityId ?? ''),
            reservationStatus: (entity.metadata?.reservationStatus as DateDetailValues['reservationStatus']) || 'none',
            assigneeRole: String(entity.metadata?.assigneeRole ?? 'gemeinsam'),
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
            assignmentEntityId: String(
              entity.metadata?.taskAssignmentEntityId ??
                entity.metadata?.belongsToEntityId ??
                entity.parent_entity_id ??
                '',
            ),
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
    const parentId =
      String(metadata.belongsToEntityId || metadata.taskAssignmentEntityId || '') || null

    await updateEntity.mutateAsync({
      id,
      patch: {
        title: values.title,
        description: values.description || null,
        status: values.status,
        metadata,
        parent_entity_id: parentId,
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
    flash('Gespeichert')
  }

  const handleDelete = async () => {
    await softDelete.mutateAsync(id)
    setConfirmDelete(false)
    void navigate(-1)
  }

  const handleArchive = async () => {
    await updateEntity.mutateAsync({ id, patch: { status: 'archived' } })
    flash('Archiviert')
  }

  const handleDuplicate = async () => {
    if (!spaceId) return
    const newId = uuidv4()
    await createEntity.mutateAsync({
      id: newId,
      space_id: spaceId,
      entity_type: type,
      title: `${entity.title} (Kopie)`,
      description: entity.description,
      status: 'draft',
      starts_at: entity.starts_at,
      ends_at: entity.ends_at,
      all_day_start: entity.all_day_start,
      all_day_end: entity.all_day_end,
      metadata: { ...entity.metadata, duplicatedFrom: entity.id },
      sort_order: 0,
    })
    flash('Dupliziert')
    void navigate(`/entities/${type}/${newId}`)
  }

  const handleSaveAsMoment = async () => {
    if (!spaceId) return
    setBusyAction(true)
    try {
      const momentId = await saveDateAsMoment({
        spaceId,
        dateEntity: entity,
        userId: session?.userId,
      })
      flash('Als Moment gespeichert')
      void navigate(`/entities/moment/${momentId}`)
    } finally {
      setBusyAction(false)
    }
  }

  const handleLeisureToDate = async () => {
    if (!spaceId) return
    setBusyAction(true)
    try {
      const dateId = await planLeisureAsDate({
        spaceId,
        leisure: entity,
        userId: session?.userId,
      })
      flash('Als Date geplant')
      void navigate(`/entities/date/${dateId}`)
    } finally {
      setBusyAction(false)
    }
  }

  const handleRecipeToShopping = async () => {
    if (!spaceId) return
    setBusyAction(true)
    try {
      const result = await addRecipeIngredientsToShopping({
        spaceId,
        entityId: id,
        userId: session?.userId,
      })
      const ingredients = await getRecipeIngredients(id)
      flash(
        ingredients.ingredients.length === 0
          ? 'Keine Zutaten vorhanden'
          : result.added > 0
            ? `${result.added} Zutat(en) zur Einkaufsliste`
            : 'Alles war bereits auf der Liste',
      )
    } finally {
      setBusyAction(false)
    }
  }

  const dateLabel = formatEntityDateRange(entity)
  const alreadyConverted = Boolean(entity.metadata?.convertedToMomentId)
  const assignee = assigneeLabelOf(entity.metadata)
  const packingLines = String(entity.metadata?.packingListText || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const placeLines = String(entity.metadata?.placesText || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const subtasks = String(entity.metadata?.subtasksText || '')
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean)

  const countdown =
    type === 'trip' && entity.all_day_start
      ? differenceInCalendarDays(parseISO(entity.all_day_start), new Date())
      : null

  const menuActions: DetailMenuAction[] = [
    {
      key: 'edit',
      label: 'Bearbeiten',
      icon: DETAIL_MENU_ICONS.edit,
      onSelect: handleEditOpen,
    },
    {
      key: 'duplicate',
      label: 'Duplizieren',
      icon: DETAIL_MENU_ICONS.duplicate,
      onSelect: () => void handleDuplicate(),
    },
    {
      key: 'archive',
      label: 'Archivieren',
      icon: DETAIL_MENU_ICONS.archive,
      onSelect: () => void handleArchive(),
    },
    {
      key: 'delete',
      label: 'Löschen',
      icon: DETAIL_MENU_ICONS.delete,
      danger: true,
      onSelect: () => setConfirmDelete(true),
    },
  ]

  return (
    <PageEnter className="mx-auto max-w-2xl pb-8">
      <DetailChrome title={`${groupLabel(group)} · ${meta.label}`} menuActions={menuActions}>
        {showHero && spaceId && type !== 'expense' ? (
          <div className="mb-8">
            <HeroMedia
              spaceId={spaceId}
              entityId={id}
              userId={session?.userId}
              storagePath={coverPath ?? null}
              title={entity.title}
              aspectClassName={
                type === 'moment' ? 'aspect-[4/5] max-h-[28rem]' : 'aspect-[16/10] max-h-80'
              }
            />
          </div>
        ) : null}

        <header className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
                {meta.label}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-text">
                {entity.title}
              </h1>
              {dateLabel ? (
                <p className="mt-2 text-[17px] font-medium text-text-muted">{dateLabel}</p>
              ) : null}
            </div>
            <Badge variant={entity.status === 'completed' ? 'success' : 'primary'}>
              {getStatusLabel(type, entity.status)}
            </Badge>
          </div>
          {entity.description && type !== 'moment' ? (
            <p className="mt-6 whitespace-pre-wrap text-[17px] leading-relaxed text-text">
              {entity.description}
            </p>
          ) : null}
        </header>

        {/* Modulspezifische Meta */}
        {type === 'expense' ? (
          <MetaList className="mb-8">
            <MetaRow label="Betrag" value={`${entity.metadata?.amount ?? '—'} CHF`} />
            <MetaRow
              label="Art"
              value={entity.metadata?.financeKind === 'income' ? 'Einnahme' : 'Ausgabe'}
            />
            <MetaRow label="Kategorie" value={String(entity.metadata?.category || '')} />
            <MetaRow label="Datum" value={dateLabel} />
            <MetaRow label="Bezahlt von" value={String(entity.metadata?.paidBy || '')} last />
          </MetaList>
        ) : (
          <MetaList className="mb-8">
            {type === 'trip' ? (
              <>
                <MetaRow
                  label="Ziel"
                  value={entity.subtitle || String(entity.metadata?.destination || '') || null}
                />
                <MetaRow label="Zeitraum" value={dateLabel} />
                <MetaRow
                  label="Status"
                  value={
                    countdown !== null
                      ? countdown > 0
                        ? `Noch ${countdown} Tage`
                        : countdown === 0
                          ? 'Heute'
                          : 'Unterwegs / vorbei'
                      : getStatusLabel(type, entity.status)
                  }
                />
                <MetaRow
                  label="Budget"
                  value={
                    entity.metadata?.budgetAmount
                      ? `${entity.metadata.budgetAmount} CHF`
                      : null
                  }
                  last
                />
              </>
            ) : null}
            {type === 'date' ? (
              <>
                <MetaRow label="Ort" value={String(entity.metadata?.place || (detailPayload as DateDetailValues | null)?.venueName || '')} />
                <MetaRow label="Zeit" value={dateLabel} />
                <MetaRow label="Zuständig" value={assignee} />
                <MetaRow
                  label="Reservierung"
                  value={String(entity.metadata?.reservationStatus || 'none')}
                />
                <MetaRow label="Teil von" value={belongingTitle} last />
              </>
            ) : null}
            {type === 'task' ? (
              <>
                <MetaRow label="Fällig" value={dateLabel} />
                <MetaRow label="Zuständig" value={assignee} />
                <MetaRow
                  label="Priorität"
                  value={String((detailPayload as TaskDetailValues | null)?.priority || 'medium')}
                />
                <MetaRow label="Zuordnung" value={belongingTitle} last />
              </>
            ) : null}
            {type === 'moment' ? (
              <>
                <MetaRow label="Ort" value={String(entity.metadata?.place || '')} />
                <MetaRow label="Datum" value={dateLabel} />
                <MetaRow
                  label="Kategorie"
                  value={String(entity.metadata?.momentCategory || '')}
                />
                <MetaRow label="Gehört zu" value={belongingTitle} last />
              </>
            ) : null}
            {type === 'event' ? (
              <>
                <MetaRow label="Zeit" value={dateLabel} />
                <MetaRow label="Zuständig" value={assignee} last />
              </>
            ) : null}
            {type === 'leisure' ? (
              <>
                <MetaRow label="Ort" value={String(entity.metadata?.place || '')} />
                <MetaRow label="Vorschlag" value={dateLabel} />
                <MetaRow
                  label="Link"
                  value={
                    entity.metadata?.link ? (
                      <a
                        href={String(entity.metadata.link)}
                        className="text-primary underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Öffnen
                      </a>
                    ) : null
                  }
                  last
                />
              </>
            ) : null}
            {type === 'wish' || type === 'gift' ? (
              <>
                <MetaRow
                  label="Preis"
                  value={
                    (detailPayload as { price?: string } | null)?.price
                      ? `${(detailPayload as { price?: string }).price} CHF`
                      : null
                  }
                />
                <MetaRow label="Anlass" value={String(entity.metadata?.occasion || '')} />
                <MetaRow label="Status" value={String(entity.metadata?.wishStatus || 'open')} last />
              </>
            ) : null}
            {type === 'goal' ? (
              <>
                <MetaRow label="Status" value={getStatusLabel(type, entity.status)} last />
              </>
            ) : null}
            {type === 'recipe' ? <MetaRow label="Rezept" value="Zutaten unten" last /> : null}
          </MetaList>
        )}

        {type === 'moment' && entity.description ? (
          <p className="mb-8 whitespace-pre-wrap text-[17px] leading-relaxed text-text">
            {entity.description}
          </p>
        ) : null}

        {/* Kontext-Aktionen */}
        <div className="mb-8 flex flex-col gap-2">
          {type === 'date' && !alreadyConverted ? (
            <Button
              variant="accent"
              fullWidth
              loading={busyAction}
              onClick={() => void handleSaveAsMoment()}
            >
              Als Moment speichern
            </Button>
          ) : null}
          {type === 'leisure' ? (
            <Button
              variant="primary"
              fullWidth
              loading={busyAction}
              onClick={() => void handleLeisureToDate()}
            >
              Als Date planen
            </Button>
          ) : null}
          {type === 'recipe' ? (
            <Button
              variant="primary"
              fullWidth
              loading={busyAction}
              onClick={() => void handleRecipeToShopping()}
            >
              Zutaten zur Einkaufsliste hinzufügen
            </Button>
          ) : null}
        </div>

        {type === 'moment' && spaceId ? (
          <section className="mb-8">
            <SectionTitle>Weitere Bilder</SectionTitle>
            <EntityGallery spaceId={spaceId} entityId={id} userId={session?.userId} />
          </section>
        ) : null}

        {type === 'task' && subtasks.length > 0 ? (
          <section className="mb-8">
            <SectionTitle>Unteraufgaben</SectionTitle>
            <ul className="overflow-hidden rounded-lg border border-border/70 bg-surface shadow-xs">
              {subtasks.map((s, i) => (
                <li
                  key={`${s}-${i}`}
                  className={`px-6 py-4 text-[17px] text-text ${i > 0 ? 'border-t border-border/70' : ''}`}
                >
                  {s}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {type === 'trip' ? (
          <>
            <section className="mb-8">
              <SectionTitle>Unterkunft</SectionTitle>
              {entity.metadata?.accommodation ? (
                <p className="text-[17px] text-text">
                  {String(entity.metadata.accommodation)}
                </p>
              ) : (
                <p className="text-sm font-medium text-text-muted">
                  Über Bearbeiten im Menü ergänzen.
                </p>
              )}
            </section>

            {spaceId ? (
              <RelatedTasks
                spaceId={spaceId}
                parentId={id}
                onAdd={() => void navigate(`/planen/neu?type=task&parent=${id}`)}
              />
            ) : null}

            <section className="mb-8">
              <SectionTitle>Packliste</SectionTitle>
              {packingLines.length > 0 ? (
                <ul className="mb-2 overflow-hidden rounded-lg border border-border/70 bg-surface shadow-xs">
                  {packingLines.map((line, i) => (
                    <li
                      key={`${line}-${i}`}
                      className={`px-6 py-4 text-[17px] ${i > 0 ? 'border-t border-border/70' : ''}`}
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm font-medium text-text-muted">Noch keine Packliste.</p>
              )}
            </section>

            <section className="mb-8">
              <SectionTitle>Orte</SectionTitle>
              {placeLines.length > 0 ? (
                <ul className="overflow-hidden rounded-lg border border-border/70 bg-surface shadow-xs">
                  {placeLines.map((line, i) => (
                    <li
                      key={`${line}-${i}`}
                      className={`px-6 py-4 text-[17px] ${i > 0 ? 'border-t border-border/70' : ''}`}
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm font-medium text-text-muted">Noch keine Orte.</p>
              )}
            </section>

            {spaceId ? <RelatedDates spaceId={spaceId} parentId={id} /> : null}

            {spaceId ? (
              <RelatedMoments
                spaceId={spaceId}
                parentId={id}
                title="Momente dieser Reise"
                onAdd={() =>
                  void navigate(`/erinnerungen/neu?belongsTo=${id}&type=moment`)
                }
              />
            ) : null}
          </>
        ) : null}

        {type === 'goal' && spaceId ? (
          <>
            <RelatedTasks
              spaceId={spaceId}
              parentId={id}
              onAdd={() => void navigate(`/planen/neu?type=task&parent=${id}`)}
            />
            <RelatedMoments
              spaceId={spaceId}
              parentId={id}
              title="Zugehörige Momente"
              onAdd={() => void navigate(`/erinnerungen/neu?belongsTo=${id}`)}
            />
          </>
        ) : null}

        {type === 'list' ? <ListDetail entityId={id} /> : null}

        {type === 'recipe' && spaceId ? (
          <section className="mb-8">
            <SectionTitle>Fotos</SectionTitle>
            <EntityGallery spaceId={spaceId} entityId={id} userId={session?.userId} />
          </section>
        ) : null}

        {type !== 'expense' ? <CompactNotes entityId={id} /> : null}

        {toast ? (
          <div className="fixed bottom-[calc(var(--nav-bottom-height)+1.5rem)] left-1/2 z-[var(--z-toast)] -translate-x-1/2 rounded-full bg-text px-5 py-2.5 text-sm font-medium text-surface shadow-md">
            {toast}
          </div>
        ) : null}
      </DetailChrome>

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
        <div className="flex gap-4">
          <Button variant="secondary" fullWidth onClick={() => setConfirmDelete(false)}>
            Abbrechen
          </Button>
          <Button
            variant="danger"
            fullWidth
            loading={softDelete.isPending}
            onClick={() => void handleDelete()}
          >
            Löschen
          </Button>
        </div>
      </Modal>
    </PageEnter>
  )
}
