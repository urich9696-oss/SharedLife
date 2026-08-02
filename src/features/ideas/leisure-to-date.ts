import { v4 as uuidv4 } from 'uuid'
import { createEntity } from '@/lib/indexed-db/repositories/entities'
import { upsertEntityDetail } from '@/lib/indexed-db/repositories/entity-details'
import { createEntityLink } from '@/lib/indexed-db/repositories/entity-links'
import { db } from '@/lib/indexed-db/db'
import { getOrCreateDeviceId } from '@/lib/indexed-db/device'
import { enqueueMutation } from '@/features/sync/outbox'
import type { EntityRow } from '@/lib/indexed-db/schema'
import type { DateDetailValues } from '@/features/dates/DateForm'
import type { EntityFormValues } from '@/features/entities/entity-form-schema'

/** Prefill-Daten aus einer Date-Idee für das Date-Formular */
export function leisurePrefill(leisure: EntityRow): {
  form: Partial<EntityFormValues>
  detail: Partial<DateDetailValues>
} {
  return {
    form: {
      title: leisure.title,
      description: leisure.description ?? '',
      status: 'draft',
    },
    detail: {
      phase: 'planned',
      venueName: String(leisure.metadata?.place ?? ''),
      assigneeRole: 'gemeinsam',
      reservationStatus: 'none',
      reservationReference: '',
      estimatedCost: '',
      occasion: '',
      belongsToEntityId: '',
    },
  }
}

async function linkMediaFromLeisure(input: {
  spaceId: string
  leisureId: string
  dateId: string
}): Promise<void> {
  const mediaLinks = await db.entityMedia.where('entity_id').equals(input.leisureId).toArray()
  if (!mediaLinks.length) return

  const deviceId = await getOrCreateDeviceId()
  const now = new Date().toISOString()

  await db.transaction('rw', [db.entityMedia, db.outbox], async () => {
    for (const [index, link] of mediaLinks.entries()) {
      const newId = uuidv4()
      const row = {
        ...link,
        id: newId,
        entity_id: input.dateId,
        sort_order: index,
        created_at: now,
      }
      await db.entityMedia.put(row)
      await enqueueMutation(
        {
          mutationId: uuidv4(),
          deviceId,
          spaceId: input.spaceId,
          resourceType: 'entity_media',
          resourceId: newId,
          operation: 'create',
          expectedVersion: null,
          payload: {
            entity_id: input.dateId,
            media_id: link.media_id,
            role: link.role,
            sort_order: index,
            caption: link.caption,
          },
          createdAt: now,
        },
        { tx: db },
      )
    }
  })
}

/**
 * Date-Idee → Date speichern (nach Formular-Bestätigung).
 * Die Idee bleibt bestehen; Media-Links werden mit Outbox synchronisiert.
 */
export async function planLeisureAsDate(input: {
  spaceId: string
  leisure: EntityRow
  userId?: string | null
  title?: string
  description?: string | null
  startsAt?: string | null
  allDayStart?: string | null
  belongsToEntityId?: string | null
  detail?: Partial<DateDetailValues>
}): Promise<string> {
  const dateId = uuidv4()
  const prefill = leisurePrefill(input.leisure)
  const detail: DateDetailValues = {
    ...prefill.detail,
    phase: 'planned',
    venueName: '',
    estimatedCost: '',
    reservationStatus: 'none',
    reservationReference: '',
    assigneeRole: 'gemeinsam',
    occasion: '',
    belongsToEntityId: '',
    ...input.detail,
  } as DateDetailValues

  const parentId = input.belongsToEntityId || detail.belongsToEntityId || null
  const start =
    input.startsAt ??
    (input.leisure.all_day_start != null
      ? `${input.leisure.all_day_start}T18:00:00.000Z`
      : input.leisure.starts_at)

  await createEntity(
    {
      id: dateId,
      space_id: input.spaceId,
      entity_type: 'date',
      title: (input.title ?? input.leisure.title).trim(),
      description: input.description ?? input.leisure.description,
      status: 'draft',
      starts_at: start ?? null,
      all_day_start: input.allDayStart ?? (start ? null : (input.leisure.all_day_start ?? null)),
      parent_entity_id: parentId,
      sort_order: 0,
      metadata: {
        fromLeisureId: input.leisure.id,
        place: detail.venueName || String(input.leisure.metadata?.place ?? ''),
        link: input.leisure.metadata?.link ?? '',
        assigneeRole: detail.assigneeRole || 'gemeinsam',
        reservationStatus: detail.reservationStatus || 'none',
        belongsToEntityId: parentId ?? '',
      },
      cover_media_id: input.leisure.cover_media_id,
    },
    input.userId ?? null,
  )

  await upsertEntityDetail({
    entityId: dateId,
    spaceId: input.spaceId,
    detailType: 'date',
    payload: {
      phase: detail.phase,
      venueName: detail.venueName || String(input.leisure.metadata?.place ?? ''),
      estimatedCost: detail.estimatedCost,
      reservationStatus: detail.reservationStatus,
      reservationReference: detail.reservationReference,
      assigneeRole: detail.assigneeRole,
      occasion: detail.occasion,
      belongsToEntityId: parentId ?? '',
    },
  })

  try {
    await linkMediaFromLeisure({
      spaceId: input.spaceId,
      leisureId: input.leisure.id,
      dateId,
    })
  } catch (err) {
    console.warn('[leisure-to-date] media link failed', {
      module: 'date-ideas',
      operation: 'linkMediaFromLeisure',
      message: err instanceof Error ? err.message : String(err),
    })
  }

  try {
    await createEntityLink({
      id: uuidv4(),
      spaceId: input.spaceId,
      sourceEntityId: input.leisure.id,
      targetEntityId: dateId,
      linkType: 'related',
      label: 'Als Date geplant',
      userId: input.userId ?? null,
    })
  } catch (err) {
    console.warn('[leisure-to-date] entity link failed', {
      module: 'date-ideas',
      operation: 'createEntityLink',
      message: err instanceof Error ? err.message : String(err),
    })
  }

  return dateId
}
