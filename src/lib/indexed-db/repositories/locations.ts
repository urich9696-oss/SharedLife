import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/indexed-db/db'
import { getOrCreateDeviceId } from '@/lib/indexed-db/device'
import type { EntityLocationRow, LocationRow } from '@/lib/indexed-db/schema'
import { enqueueMutation } from '@/features/sync/outbox'

function nowIso(): string {
  return new Date().toISOString()
}

export async function listLocationsForEntity(entityId: string): Promise<
  Array<{ location: LocationRow; link: EntityLocationRow }>
> {
  const links = await db.entityLocations.where('entity_id').equals(entityId).toArray()
  const results: Array<{ location: LocationRow; link: EntityLocationRow }> = []
  for (const link of links) {
    const location = await db.locations.get(link.location_id)
    if (location && !location.deleted_at) {
      results.push({ location, link })
    }
  }
  return results.sort((a, b) => a.link.sort_order - b.link.sort_order)
}

export async function createLocation(input: {
  id: string
  spaceId: string
  name: string
  city?: string | null
  addressLine?: string | null
  userId: string | null
}): Promise<LocationRow> {
  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  const row: LocationRow = {
    id: input.id,
    space_id: input.spaceId,
    name: input.name,
    address_line: input.addressLine ?? null,
    city: input.city ?? null,
    country_code: null,
    latitude: null,
    longitude: null,
    place_id: null,
    metadata: {},
    created_by: input.userId,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }

  await db.transaction('rw', [db.locations, db.outbox], async () => {
    await db.locations.put(row)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId: input.spaceId,
        resourceType: 'location',
        resourceId: row.id,
        operation: 'create',
        expectedVersion: null,
        payload: { name: input.name, city: input.city, address_line: input.addressLine },
        createdAt: now,
      },
      { tx: db },
    )
  })

  return row
}

export async function attachLocationToEntity(input: {
  id: string
  spaceId: string
  entityId: string
  locationId: string
  role?: EntityLocationRow['role']
}): Promise<EntityLocationRow> {
  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  const row: EntityLocationRow = {
    id: input.id,
    space_id: input.spaceId,
    entity_id: input.entityId,
    location_id: input.locationId,
    role: input.role ?? 'venue',
    sort_order: 0,
    created_at: now,
  }

  await db.transaction('rw', [db.entityLocations, db.outbox], async () => {
    await db.entityLocations.put(row)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId: input.spaceId,
        resourceType: 'entity_location',
        resourceId: row.id,
        operation: 'create',
        expectedVersion: null,
        payload: {
          entity_id: input.entityId,
          location_id: input.locationId,
          role: row.role,
        },
        createdAt: now,
      },
      { tx: db },
    )
  })

  return row
}
