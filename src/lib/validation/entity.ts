import { z } from 'zod'
import { ENTITY_STATUSES, ENTITY_TYPES } from '@/lib/indexed-db/schema'

export const entityTypeSchema = z.enum(ENTITY_TYPES)
export const entityStatusSchema = z.enum(ENTITY_STATUSES)

export const entityRowSchema = z.object({
  id: z.uuid(),
  space_id: z.uuid(),
  entity_type: entityTypeSchema,
  title: z.string().max(500),
  subtitle: z.string().max(500).nullable(),
  description: z.string().nullable(),
  status: entityStatusSchema,
  color: z.string().max(32).nullable(),
  icon: z.string().max(64).nullable(),
  starts_at: z.string().datetime({ offset: true }).nullable(),
  ends_at: z.string().datetime({ offset: true }).nullable(),
  all_day_start: z.string().date().nullable(),
  all_day_end: z.string().date().nullable(),
  cover_media_id: z.uuid().nullable(),
  parent_entity_id: z.uuid().nullable(),
  sort_order: z.number().int(),
  metadata: z.record(z.string(), z.unknown()),
  version: z.number().int().min(1),
  created_by: z.uuid().nullable(),
  updated_by: z.uuid().nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  deleted_at: z.string().datetime({ offset: true }).nullable(),
  deleted_by: z.uuid().nullable(),
})

export const createEntityPayloadSchema = z.object({
  id: z.uuid(),
  space_id: z.uuid(),
  entity_type: entityTypeSchema,
  title: z.string().max(500).default(''),
  subtitle: z.string().max(500).nullable().optional(),
  description: z.string().nullable().optional(),
  status: entityStatusSchema.default('active'),
  color: z.string().max(32).nullable().optional(),
  icon: z.string().max(64).nullable().optional(),
  starts_at: z.string().datetime({ offset: true }).nullable().optional(),
  ends_at: z.string().datetime({ offset: true }).nullable().optional(),
  all_day_start: z.string().date().nullable().optional(),
  all_day_end: z.string().date().nullable().optional(),
  cover_media_id: z.uuid().nullable().optional(),
  parent_entity_id: z.uuid().nullable().optional(),
  sort_order: z.number().int().default(0),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export const updateEntityPayloadSchema = z
  .object({
    title: z.string().max(500).optional(),
    subtitle: z.string().max(500).nullable().optional(),
    description: z.string().nullable().optional(),
    status: entityStatusSchema.optional(),
    color: z.string().max(32).nullable().optional(),
    icon: z.string().max(64).nullable().optional(),
    starts_at: z.string().datetime({ offset: true }).nullable().optional(),
    ends_at: z.string().datetime({ offset: true }).nullable().optional(),
    all_day_start: z.string().date().nullable().optional(),
    all_day_end: z.string().date().nullable().optional(),
    cover_media_id: z.uuid().nullable().optional(),
    parent_entity_id: z.uuid().nullable().optional(),
    sort_order: z.number().int().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Mindestens ein Feld muss aktualisiert werden.',
  })

export type EntityRowInput = z.infer<typeof entityRowSchema>
export type CreateEntityPayload = z.infer<typeof createEntityPayloadSchema>
export type UpdateEntityPayload = z.infer<typeof updateEntityPayloadSchema>
