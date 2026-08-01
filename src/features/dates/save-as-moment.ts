import { v4 as uuidv4 } from 'uuid'
import { createEntity } from '@/lib/indexed-db/repositories/entities'
import { upsertEntityDetail } from '@/lib/indexed-db/repositories/entity-details'
import { createEntityLink } from '@/lib/indexed-db/repositories/entity-links'
import { db } from '@/lib/indexed-db/db'
import type { EntityRow } from '@/lib/indexed-db/schema'

/** Wandelt ein durchgeführtes Date in einen Moment um und verknüpft beide. */
export async function saveDateAsMoment(input: {
  spaceId: string
  dateEntity: EntityRow
  userId?: string | null
}): Promise<string> {
  const momentId = uuidv4()
  const occurredAt =
    input.dateEntity.starts_at ??
    (input.dateEntity.all_day_start
      ? `${input.dateEntity.all_day_start}T18:00:00.000Z`
      : new Date().toISOString())

  await createEntity(
    {
      id: momentId,
      space_id: input.spaceId,
      entity_type: 'moment',
      title: input.dateEntity.title,
      subtitle: 'Aus Date entstanden',
      description: input.dateEntity.description,
      status: 'active',
      starts_at: occurredAt,
      sort_order: 0,
      metadata: {
        fromDateId: input.dateEntity.id,
        source: 'date-to-moment',
      },
      cover_media_id: input.dateEntity.cover_media_id,
    },
    input.userId ?? null,
  )

  await upsertEntityDetail({
    entityId: momentId,
    spaceId: input.spaceId,
    detailType: 'moment',
    payload: {
      capturedAt: occurredAt.slice(0, 10),
      mood: '',
      weather: '',
      highlight: true,
    },
  })

  // Medien des Dates am Moment spiegeln (Links, keine Duplikate der Assets)
  const mediaLinks = await db.entityMedia.where('entity_id').equals(input.dateEntity.id).toArray()
  for (const [index, link] of mediaLinks.entries()) {
    await db.entityMedia.put({
      ...link,
      id: uuidv4(),
      entity_id: momentId,
      sort_order: index,
      created_at: new Date().toISOString(),
    })
  }

  try {
    await createEntityLink({
      id: uuidv4(),
      spaceId: input.spaceId,
      sourceEntityId: input.dateEntity.id,
      targetEntityId: momentId,
      linkType: 'related',
      userId: input.userId ?? null,
    })
  } catch {
    // Link-Repo kann je nach Stand optional sein — Moment existiert trotzdem
  }

  await db.entities.update(input.dateEntity.id, {
    status: 'completed',
    updated_at: new Date().toISOString(),
    metadata: {
      ...input.dateEntity.metadata,
      convertedToMomentId: momentId,
    },
  })

  return momentId
}
