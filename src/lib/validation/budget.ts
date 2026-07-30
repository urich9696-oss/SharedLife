import { z } from 'zod'

const moneyStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Ungültiger Betrag')

export const createBudgetPayloadSchema = z.object({
  id: z.uuid(),
  space_id: z.uuid(),
  entity_id: z.uuid().nullable().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  currency: z.string().length(3).default('CHF'),
  amount_limit: moneyStringSchema.nullable().optional(),
  period_start: z.string().date().nullable().optional(),
  period_end: z.string().date().nullable().optional(),
})

export const updateBudgetPayloadSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    currency: z.string().length(3).optional(),
    amount_limit: moneyStringSchema.nullable().optional(),
    period_start: z.string().date().nullable().optional(),
    period_end: z.string().date().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Mindestens ein Feld muss aktualisiert werden.',
  })

export const createTransactionPayloadSchema = z.object({
  id: z.uuid(),
  space_id: z.uuid(),
  budget_id: z.uuid().nullable().optional(),
  entity_id: z.uuid().nullable().optional(),
  amount: moneyStringSchema,
  currency: z.string().length(3).default('CHF'),
  description: z.string().max(500).default(''),
  category: z.string().max(100).nullable().optional(),
  transaction_date: z.string().date(),
  paid_by: z.uuid().nullable().optional(),
  is_income: z.boolean().default(false),
})

export const updateTransactionPayloadSchema = z
  .object({
    amount: moneyStringSchema.optional(),
    currency: z.string().length(3).optional(),
    description: z.string().max(500).optional(),
    category: z.string().max(100).nullable().optional(),
    transaction_date: z.string().date().optional(),
    paid_by: z.uuid().nullable().optional(),
    is_income: z.boolean().optional(),
    budget_id: z.uuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Mindestens ein Feld muss aktualisiert werden.',
  })

export type CreateBudgetPayload = z.infer<typeof createBudgetPayloadSchema>
export type UpdateBudgetPayload = z.infer<typeof updateBudgetPayloadSchema>
export type CreateTransactionPayload = z.infer<typeof createTransactionPayloadSchema>
export type UpdateTransactionPayload = z.infer<typeof updateTransactionPayloadSchema>
