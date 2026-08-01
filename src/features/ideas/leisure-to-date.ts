import { v4 as uuidv4 } from 'uuid'
import { createEntity } from '@/lib/indexed-db/repositories/entities'
import { upsertEntityDetail } from '@/lib/indexed-db/repositories/entity-details'
import { createEntityLink } from '@/lib/indexed-db/repositories/entity-links'
import { db } from '@/lib/indexed-db/db'
import type { EntityRow } from '@/lib/indexed-db/schema'

/** Date-Idee → Date planen (übernimmt Titel, Ort, Link, Notiz, Hero) */
export async function planLeisureAsDate(input: {
  spaceId: string
  leisure: EntityRow
  userId?: string | null
}): Promise<string> {
  const dateId = uuidv4()
  const start =
    input.leisure.all_day_start != null
      ? `${input.leisure.all_day_start}T18:00:00.000Z`
      : input.leisure.starts_at

  await createEntity(
    {
      id: dateId,
      space_id: input.spaceId,
      entity_type: 'date',
      title: input.leisure.title,
      description: input.leisure.description,
      status: 'draft',
      starts_at: start ?? null,
      all_day_start: start ? null : (input.leisure.all_day_start ?? null),
      sort_order: 0,
      metadata: {
        fromLeisureId: input.leisure.id,
        place: input.leisure.metadata?.place ?? '',
        link: input.leisure.metadata?.link ?? '',
        assigneeRole: 'gemeinsam',
        reservationStatus: 'none',
      },
      cover_media_id: input.leisure.cover_media_id,
    },
    input.userId ?? null,
  )

  await upsertEntityDetail({
    entityId: dateId,
    spaceId: input.spaceId,
    detailType: 'date',
    payload: { phase: 'planned', venueName: String(input.leisure.metadata?.place ?? '') },
  })

  const mediaLinks = await db.entityMedia.where('entity_id').equals(input.leisure.id).toArray()
  for (const [index, link] of mediaLinks.entries()) {
    await db.entityMedia.put({
      ...link,
      id: uuidv4(),
      entity_id: dateId,
      sort_order: index,
      created_at: new Date().toISOString(),
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
  } catch {
    // optional
  }

  return dateId
}
