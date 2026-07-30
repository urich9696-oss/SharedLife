import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/indexed-db/db'
import { getOrCreateDeviceId } from '@/lib/indexed-db/device'
import type { ReminderRow } from '@/lib/indexed-db/schema'
import {
  createReminderPayloadSchema,
  updateReminderPayloadSchema,
  type CreateReminderPayload,
  type UpdateReminderPayload,
} from '@/lib/validation/reminder'
import { enqueueMutation } from '@/features/sync/outbox'

function nowIso(): string {
  return new Date().toISOString()
}

export async function listReminders(spaceId: string): Promise<ReminderRow[]> {
  return db.reminders
    .where('space_id')
    .equals(spaceId)
    .filter((r) => !r.deleted_at)
    .toArray()
}

export async function getReminder(id: string): Promise<ReminderRow | undefined> {
  return db.reminders.get(id)
}

export async function createReminder(
  payload: CreateReminderPayload,
  userId: string | null,
): Promise<ReminderRow> {
  const parsed = createReminderPayloadSchema.parse(payload)
  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  const row: ReminderRow = {
    id: parsed.id,
    space_id: parsed.space_id,
    entity_id: parsed.entity_id ?? null,
    title: parsed.title,
    body: parsed.body ?? null,
    remind_at: parsed.remind_at,
    timezone: parsed.timezone,
    recurrence_rule: parsed.recurrence_rule ?? null,
    is_active: parsed.is_active,
    notify_push: parsed.notify_push,
    notify_in_app: parsed.notify_in_app,
    created_by: userId,
    assigned_to: parsed.assigned_to ?? null,
    last_triggered_at: null,
    next_trigger_at: parsed.remind_at,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }

  await db.transaction('rw', [db.reminders, db.outbox], async () => {
    await db.reminders.put(row)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId: row.space_id,
        resourceType: 'reminder',
        resourceId: row.id,
        operation: 'create',
        expectedVersion: null,
        payload: {
          ...(parsed as Record<string, unknown>),
          next_trigger_at: parsed.remind_at,
        },
        createdAt: now,
      },
      { tx: db },
    )
  })

  return row
}

export async function updateReminder(
  id: string,
  spaceId: string,
  patch: UpdateReminderPayload,
): Promise<ReminderRow> {
  const parsed = updateReminderPayloadSchema.parse(patch)
  const existing = await db.reminders.get(id)
  if (!existing || existing.space_id !== spaceId) {
    throw new Error('Erinnerung nicht gefunden')
  }

  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  const updated: ReminderRow = {
    ...existing,
    ...parsed,
    body: parsed.body !== undefined ? parsed.body : existing.body,
    recurrence_rule:
      parsed.recurrence_rule !== undefined ? parsed.recurrence_rule : existing.recurrence_rule,
    assigned_to: parsed.assigned_to !== undefined ? parsed.assigned_to : existing.assigned_to,
    updated_at: now,
  }

  await db.transaction('rw', [db.reminders, db.outbox], async () => {
    await db.reminders.put(updated)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId,
        resourceType: 'reminder',
        resourceId: id,
        operation: 'update',
        expectedVersion: null,
        payload: parsed as Record<string, unknown>,
        createdAt: now,
      },
      { tx: db },
    )
  })

  return updated
}

export async function softDeleteReminder(id: string, spaceId: string): Promise<void> {
  const existing = await db.reminders.get(id)
  if (!existing || existing.space_id !== spaceId) return

  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  await db.transaction('rw', [db.reminders, db.outbox], async () => {
    await db.reminders.put({ ...existing, deleted_at: now, updated_at: now })
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId,
        resourceType: 'reminder',
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
