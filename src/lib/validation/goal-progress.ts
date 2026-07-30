import { z } from 'zod'

export const goalProgressKindSchema = z.enum(['percent', 'amount', 'count', 'manual'])

export const goalProgressInputSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('percent'),
    current: z.number().min(0),
    target: z.number().positive(),
  }),
  z.object({
    kind: z.literal('amount'),
    current: z.number().min(0),
    target: z.number().positive(),
  }),
  z.object({
    kind: z.literal('count'),
    current: z.number().int().min(0),
    target: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal('manual'),
    percent: z.number().min(0).max(100),
  }),
])

export type GoalProgressKind = z.infer<typeof goalProgressKindSchema>
export type GoalProgressInput = z.infer<typeof goalProgressInputSchema>
