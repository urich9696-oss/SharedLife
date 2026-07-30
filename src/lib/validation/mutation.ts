import { z } from 'zod'

export const mutationOperationSchema = z.enum([
  'create',
  'update',
  'soft_delete',
  'restore',
  'upsert_related',
])

export const resourceTypeSchema = z.enum([
  'entity',
  'entity_detail',
  'note',
  'checklist',
  'checklist_item',
  'budget',
  'transaction',
  'location',
  'entity_location',
  'media_asset',
  'entity_media',
  'timeline_entry',
  'reminder',
  'widget_instance',
  'view_layout',
  'entity_link',
])

export const outboxMutationSchema = z.object({
  mutationId: z.uuid(),
  deviceId: z.uuid(),
  spaceId: z.uuid(),
  resourceType: resourceTypeSchema,
  resourceId: z.uuid(),
  operation: mutationOperationSchema,
  expectedVersion: z.number().int().min(1).nullable(),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime({ offset: true }),
})

export const outboxMutationEnvelopeSchema = outboxMutationSchema.extend({
  status: z.enum(['pending', 'syncing', 'failed']).optional(),
  attemptCount: z.number().int().min(0).optional(),
  lastAttemptAt: z.string().datetime({ offset: true }).nullable().optional(),
  nextRetryAt: z.string().datetime({ offset: true }).nullable().optional(),
  lastError: z.string().nullable().optional(),
})

export type OutboxMutationInput = z.infer<typeof outboxMutationSchema>
export type OutboxMutationEnvelope = z.infer<typeof outboxMutationEnvelopeSchema>
