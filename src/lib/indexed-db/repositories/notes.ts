import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/indexed-db/db'
import { getOrCreateDeviceId } from '@/lib/indexed-db/device'
import type { NoteRow } from '@/lib/indexed-db/schema'
import { enqueueMutation } from '@/features/sync/outbox'

function nowIso(): string {
  return new Date().toISOString()
}

export async function listNotesForEntity(entityId: string): Promise<NoteRow[]> {
  return db.notes
    .where('entity_id')
    .equals(entityId)
    .filter((n) => !n.deleted_at)
    .toArray()
}

export async function createNote(input: {
  id: string
  spaceId: string
  entityId: string
  content: string
  userId: string | null
}): Promise<NoteRow> {
  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()
  const wordCount = input.content.trim().split(/\s+/).filter(Boolean).length

  const row: NoteRow = {
    id: input.id,
    space_id: input.spaceId,
    entity_id: input.entityId,
    content: input.content,
    content_format: 'plain',
    word_count: wordCount,
    created_by: input.userId,
    updated_by: input.userId,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }

  await db.transaction('rw', [db.notes, db.outbox], async () => {
    await db.notes.put(row)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId: input.spaceId,
        resourceType: 'note',
        resourceId: row.id,
        operation: 'create',
        expectedVersion: null,
        payload: {
          entity_id: input.entityId,
          content: input.content,
          content_format: 'plain',
        },
        createdAt: now,
      },
      { tx: db },
    )
  })

  return row
}

export async function updateNote(
  id: string,
  spaceId: string,
  content: string,
  userId: string | null,
): Promise<NoteRow> {
  const existing = await db.notes.get(id)
  if (!existing || existing.space_id !== spaceId) {
    throw new Error('Notiz nicht gefunden')
  }

  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

  const updated: NoteRow = {
    ...existing,
    content,
    word_count: wordCount,
    updated_by: userId,
    updated_at: now,
  }

  await db.transaction('rw', [db.notes, db.outbox], async () => {
    await db.notes.put(updated)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId,
        resourceType: 'note',
        resourceId: id,
        operation: 'update',
        expectedVersion: null,
        payload: { content },
        createdAt: now,
      },
      { tx: db },
    )
  })

  return updated
}

export async function softDeleteNote(id: string, spaceId: string): Promise<void> {
  const existing = await db.notes.get(id)
  if (!existing || existing.space_id !== spaceId) return

  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  await db.transaction('rw', [db.notes, db.outbox], async () => {
    await db.notes.put({ ...existing, deleted_at: now, updated_at: now })
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId,
        resourceType: 'note',
        resourceId: id,
        operation: 'soft_delete',
        expectedVersion: null,
        payload: {},
        createdAt: now,
      },
      { tx: db },
    )
  })
}
