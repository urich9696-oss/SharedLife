import { z } from 'zod'

export const createReminderPayloadSchema = z.object({
  id: z.uuid(),
  space_id: z.uuid(),
  entity_id: z.uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  body: z.string().max(2000).nullable().optional(),
  remind_at: z.string().datetime({ offset: true }),
  timezone: z.string().default('Europe/Zurich'),
  recurrence_rule: z.string().max(500).nullable().optional(),
  is_active: z.boolean().default(true),
  notify_push: z.boolean().default(true),
  notify_in_app: z.boolean().default(true),
  assigned_to: z.uuid().nullable().optional(),
})

export const updateReminderPayloadSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    body: z.string().max(2000).nullable().optional(),
    remind_at: z.string().datetime({ offset: true }).optional(),
    timezone: z.string().optional(),
    recurrence_rule: z.string().max(500).nullable().optional(),
    is_active: z.boolean().optional(),
    notify_push: z.boolean().optional(),
    notify_in_app: z.boolean().optional(),
    assigned_to: z.uuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Mindestens ein Feld muss aktualisiert werden.',
  })

export type CreateReminderPayload = z.infer<typeof createReminderPayloadSchema>
export type UpdateReminderPayload = z.infer<typeof updateReminderPayloadSchema>
