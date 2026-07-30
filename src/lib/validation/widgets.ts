import { z } from 'zod'

const baseWidgetConfigSchema = z.object({
  title: z.string().max(120).optional(),
})

export const upcomingEventsWidgetConfigSchema = baseWidgetConfigSchema.extend({
  daysAhead: z.number().int().min(1).max(90).default(7),
  entityTypes: z.array(z.enum(['event', 'date', 'trip'])).default(['event', 'date']),
})

export const goalProgressWidgetConfigSchema = baseWidgetConfigSchema.extend({
  entityId: z.uuid(),
  showMotivation: z.boolean().default(true),
})

export const budgetSummaryWidgetConfigSchema = baseWidgetConfigSchema.extend({
  budgetId: z.uuid().optional(),
  showRemaining: z.boolean().default(true),
})

export const checklistWidgetConfigSchema = baseWidgetConfigSchema.extend({
  checklistId: z.uuid().optional(),
  entityId: z.uuid().optional(),
  showCompleted: z.boolean().default(false),
})

export const recentMomentsWidgetConfigSchema = baseWidgetConfigSchema.extend({
  limit: z.number().int().min(1).max(20).default(6),
  highlightOnly: z.boolean().default(false),
})

export const remindersWidgetConfigSchema = baseWidgetConfigSchema.extend({
  daysAhead: z.number().int().min(1).max(30).default(7),
  includeOverdue: z.boolean().default(true),
})

export const quickActionsWidgetConfigSchema = baseWidgetConfigSchema.extend({
  actions: z
    .array(
      z.object({
        label: z.string().max(40),
        route: z.string().max(200),
        icon: z.string().max(32).optional(),
      }),
    )
    .max(6)
    .default([]),
})

export const widgetTypeSchema = z.enum([
  'upcoming_events',
  'goal_progress',
  'budget_summary',
  'checklist',
  'recent_moments',
  'reminders',
  'quick_actions',
])

export const widgetConfigByType = {
  upcoming_events: upcomingEventsWidgetConfigSchema,
  goal_progress: goalProgressWidgetConfigSchema,
  budget_summary: budgetSummaryWidgetConfigSchema,
  checklist: checklistWidgetConfigSchema,
  recent_moments: recentMomentsWidgetConfigSchema,
  reminders: remindersWidgetConfigSchema,
  quick_actions: quickActionsWidgetConfigSchema,
} as const

export type WidgetType = z.infer<typeof widgetTypeSchema>

export function parseWidgetConfig<T extends WidgetType>(
  type: T,
  config: unknown,
): z.infer<(typeof widgetConfigByType)[T]> {
  return widgetConfigByType[type].parse(config) as z.infer<(typeof widgetConfigByType)[T]>
}
