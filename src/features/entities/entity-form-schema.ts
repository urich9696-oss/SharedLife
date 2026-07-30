import { z } from 'zod'
import { entityStatusSchema } from '@/lib/validation/entity'

export const entityFormSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich').max(500),
  description: z.string().max(5000).optional(),
  status: entityStatusSchema,
  allDay: z.boolean(),
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
})

export type EntityFormValues = z.infer<typeof entityFormSchema>
