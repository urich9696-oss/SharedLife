import { z } from 'zod'
import type { EntityType } from '@/lib/indexed-db/schema'
import type { ComponentType } from 'react'
import { CountdownWidget } from '@/features/widgets/components/CountdownWidget'
import { BudgetProgressWidget } from '@/features/widgets/components/BudgetProgressWidget'
import { ExpensesOverviewWidget } from '@/features/widgets/components/ExpensesOverviewWidget'
import { PhotoGalleryWidget } from '@/features/widgets/components/PhotoGalleryWidget'
import { PhotoCollageWidget } from '@/features/widgets/components/PhotoCollageWidget'
import { ChecklistWidget } from '@/features/widgets/components/ChecklistWidget'
import { TimelineWidget } from '@/features/widgets/components/TimelineWidget'
import { UpcomingEventsWidget } from '@/features/widgets/components/UpcomingEventsWidget'
import { GoalProgressWidget } from '@/features/widgets/components/GoalProgressWidget'
import { NoteCardWidget } from '@/features/widgets/components/NoteCardWidget'
import { RemindersWidget } from '@/features/widgets/components/RemindersWidget'
import { PlacesWidget } from '@/features/widgets/components/PlacesWidget'
import { MilestonesWidget } from '@/features/widgets/components/MilestonesWidget'
import { TasksWidget } from '@/features/widgets/components/TasksWidget'
import { RecentActivityWidget } from '@/features/widgets/components/RecentActivityWidget'

export type WidgetSize = 'sm' | 'md' | 'lg' | 'xl'

const baseConfig = z.object({
  title: z.string().max(120).optional(),
})

export const countdownConfigSchema = baseConfig.extend({
  entityId: z.uuid().optional(),
  targetField: z.enum(['starts_at', 'ends_at', 'custom']).default('starts_at'),
  customDate: z.string().datetime().optional(),
})

export const budgetProgressConfigSchema = baseConfig.extend({
  budgetId: z.uuid().optional(),
  entityId: z.uuid().optional(),
  showRemaining: z.boolean().default(true),
})

export const expensesOverviewConfigSchema = baseConfig.extend({
  entityId: z.uuid().optional(),
  budgetId: z.uuid().optional(),
  limit: z.number().int().min(1).max(20).default(5),
})

export const photoGalleryConfigSchema = baseConfig.extend({
  entityId: z.uuid().optional(),
  limit: z.number().int().min(1).max(24).default(12),
})

export const photoCollageConfigSchema = baseConfig.extend({
  entityId: z.uuid().optional(),
  columns: z.number().int().min(2).max(4).default(3),
})

export const checklistConfigSchema = baseConfig.extend({
  checklistId: z.uuid().optional(),
  entityId: z.uuid().optional(),
  showCompleted: z.boolean().default(false),
})

export const timelineConfigSchema = baseConfig.extend({
  entityId: z.uuid().optional(),
  limit: z.number().int().min(1).max(30).default(10),
})

export const upcomingEventsConfigSchema = baseConfig.extend({
  daysAhead: z.number().int().min(1).max(90).default(14),
  entityTypes: z
    .array(z.enum(['event', 'date', 'trip', 'milestone']))
    .default(['event', 'date', 'trip']),
})

export const goalProgressConfigSchema = baseConfig.extend({
  entityId: z.uuid().optional(),
  showMotivation: z.boolean().default(true),
})

export const noteCardConfigSchema = baseConfig.extend({
  entityId: z.uuid().optional(),
  noteId: z.uuid().optional(),
  maxLines: z.number().int().min(3).max(20).default(6),
})

export const remindersConfigSchema = baseConfig.extend({
  daysAhead: z.number().int().min(1).max(30).default(7),
  includeOverdue: z.boolean().default(true),
  entityId: z.uuid().optional(),
})

export const placesConfigSchema = baseConfig.extend({
  entityId: z.uuid().optional(),
  limit: z.number().int().min(1).max(10).default(5),
})

export const milestonesConfigSchema = baseConfig.extend({
  entityId: z.uuid().optional(),
  limit: z.number().int().min(1).max(20).default(8),
})

export const tasksConfigSchema = baseConfig.extend({
  entityId: z.uuid().optional(),
  limit: z.number().int().min(1).max(20).default(8),
  showCompleted: z.boolean().default(false),
})

export const recentActivityConfigSchema = baseConfig.extend({
  limit: z.number().int().min(1).max(30).default(10),
  entityId: z.uuid().optional(),
})

export const widgetTypeSchema = z.enum([
  'countdown',
  'budget_progress',
  'expenses_overview',
  'photo_gallery',
  'photo_collage',
  'checklist',
  'timeline',
  'upcoming_events',
  'goal_progress',
  'note_card',
  'reminders',
  'places',
  'milestones',
  'tasks',
  'recent_activity',
])

export type WidgetType = z.infer<typeof widgetTypeSchema>

export const widgetConfigByType = {
  countdown: countdownConfigSchema,
  budget_progress: budgetProgressConfigSchema,
  expenses_overview: expensesOverviewConfigSchema,
  photo_gallery: photoGalleryConfigSchema,
  photo_collage: photoCollageConfigSchema,
  checklist: checklistConfigSchema,
  timeline: timelineConfigSchema,
  upcoming_events: upcomingEventsConfigSchema,
  goal_progress: goalProgressConfigSchema,
  note_card: noteCardConfigSchema,
  reminders: remindersConfigSchema,
  places: placesConfigSchema,
  milestones: milestonesConfigSchema,
  tasks: tasksConfigSchema,
  recent_activity: recentActivityConfigSchema,
} as const

export type WidgetConfigMap = {
  [K in WidgetType]: z.infer<(typeof widgetConfigByType)[K]>
}

export interface WidgetProps<T extends WidgetType = WidgetType> {
  spaceId: string
  entityId?: string | null
  config: WidgetConfigMap[T]
  title?: string | null
}

export interface WidgetDefinition<T extends WidgetType = WidgetType> {
  type: T
  label: string
  description: string
  component: ComponentType<WidgetProps<T>>
  configSchema: (typeof widgetConfigByType)[T]
  allowedEntityTypes: EntityType[] | '*'
  sizes: WidgetSize[]
  defaultSize: WidgetSize
  defaultConfig: () => WidgetConfigMap[T]
}

export const WIDGET_REGISTRY: { [K in WidgetType]: WidgetDefinition<K> } = {
  countdown: {
    type: 'countdown',
    label: 'Countdown',
    description: 'Zeigt die verbleibende Zeit bis zu einem Termin',
    component: CountdownWidget,
    configSchema: countdownConfigSchema,
    allowedEntityTypes: ['trip', 'date', 'event', 'goal', 'milestone'],
    sizes: ['sm', 'md'],
    defaultSize: 'sm',
    defaultConfig: () => countdownConfigSchema.parse({}),
  },
  budget_progress: {
    type: 'budget_progress',
    label: 'Budget-Fortschritt',
    description: 'Ausgaben im Verhältnis zum Limit',
    component: BudgetProgressWidget,
    configSchema: budgetProgressConfigSchema,
    allowedEntityTypes: ['trip', 'project', 'event'],
    sizes: ['sm', 'md', 'lg'],
    defaultSize: 'md',
    defaultConfig: () => budgetProgressConfigSchema.parse({}),
  },
  expenses_overview: {
    type: 'expenses_overview',
    label: 'Ausgaben-Übersicht',
    description: 'Letzte Transaktionen auf einen Blick',
    component: ExpensesOverviewWidget,
    configSchema: expensesOverviewConfigSchema,
    allowedEntityTypes: ['trip', 'project', 'event'],
    sizes: ['md', 'lg'],
    defaultSize: 'md',
    defaultConfig: () => expensesOverviewConfigSchema.parse({}),
  },
  photo_gallery: {
    type: 'photo_gallery',
    label: 'Fotogalerie',
    description: 'Bilder einer Entity als Galerie',
    component: PhotoGalleryWidget,
    configSchema: photoGalleryConfigSchema,
    allowedEntityTypes: ['moment', 'trip', 'date', 'milestone'],
    sizes: ['md', 'lg', 'xl'],
    defaultSize: 'lg',
    defaultConfig: () => photoGalleryConfigSchema.parse({}),
  },
  photo_collage: {
    type: 'photo_collage',
    label: 'Fotocollage',
    description: 'Kompakte Bildcollage',
    component: PhotoCollageWidget,
    configSchema: photoCollageConfigSchema,
    allowedEntityTypes: ['moment', 'trip', 'date'],
    sizes: ['md', 'lg'],
    defaultSize: 'md',
    defaultConfig: () => photoCollageConfigSchema.parse({}),
  },
  checklist: {
    type: 'checklist',
    label: 'Checkliste',
    description: 'Offene Punkte einer Checkliste',
    component: ChecklistWidget,
    configSchema: checklistConfigSchema,
    allowedEntityTypes: ['trip', 'project', 'event', 'task', 'list'],
    sizes: ['sm', 'md', 'lg'],
    defaultSize: 'md',
    defaultConfig: () => checklistConfigSchema.parse({}),
  },
  timeline: {
    type: 'timeline',
    label: 'Zeitleiste',
    description: 'Chronologische Einträge',
    component: TimelineWidget,
    configSchema: timelineConfigSchema,
    allowedEntityTypes: '*',
    sizes: ['md', 'lg', 'xl'],
    defaultSize: 'lg',
    defaultConfig: () => timelineConfigSchema.parse({}),
  },
  upcoming_events: {
    type: 'upcoming_events',
    label: 'Kommende Termine',
    description: 'Anstehende Events, Dates und Reisen',
    component: UpcomingEventsWidget,
    configSchema: upcomingEventsConfigSchema,
    allowedEntityTypes: '*',
    sizes: ['md', 'lg'],
    defaultSize: 'md',
    defaultConfig: () => upcomingEventsConfigSchema.parse({}),
  },
  goal_progress: {
    type: 'goal_progress',
    label: 'Ziel-Fortschritt',
    description: 'Fortschritt eines Ziels',
    component: GoalProgressWidget,
    configSchema: goalProgressConfigSchema,
    allowedEntityTypes: ['goal'],
    sizes: ['sm', 'md'],
    defaultSize: 'sm',
    defaultConfig: () => goalProgressConfigSchema.parse({}),
  },
  note_card: {
    type: 'note_card',
    label: 'Notiz',
    description: 'Notizinhalt als Karte',
    component: NoteCardWidget,
    configSchema: noteCardConfigSchema,
    allowedEntityTypes: ['note', 'trip', 'project', 'moment'],
    sizes: ['sm', 'md', 'lg'],
    defaultSize: 'md',
    defaultConfig: () => noteCardConfigSchema.parse({}),
  },
  reminders: {
    type: 'reminders',
    label: 'Erinnerungen',
    description: 'Anstehende Erinnerungen',
    component: RemindersWidget,
    configSchema: remindersConfigSchema,
    allowedEntityTypes: '*',
    sizes: ['sm', 'md', 'lg'],
    defaultSize: 'md',
    defaultConfig: () => remindersConfigSchema.parse({}),
  },
  places: {
    type: 'places',
    label: 'Orte',
    description: 'Verknüpfte Standorte',
    component: PlacesWidget,
    configSchema: placesConfigSchema,
    allowedEntityTypes: ['trip', 'date', 'event', 'moment'],
    sizes: ['sm', 'md'],
    defaultSize: 'md',
    defaultConfig: () => placesConfigSchema.parse({}),
  },
  milestones: {
    type: 'milestones',
    label: 'Meilensteine',
    description: 'Wichtige Meilensteine',
    component: MilestonesWidget,
    configSchema: milestonesConfigSchema,
    allowedEntityTypes: ['goal', 'project', 'trip'],
    sizes: ['md', 'lg'],
    defaultSize: 'md',
    defaultConfig: () => milestonesConfigSchema.parse({}),
  },
  tasks: {
    type: 'tasks',
    label: 'Aufgaben',
    description: 'Offene Aufgaben',
    component: TasksWidget,
    configSchema: tasksConfigSchema,
    allowedEntityTypes: ['project', 'trip', 'event'],
    sizes: ['sm', 'md', 'lg'],
    defaultSize: 'md',
    defaultConfig: () => tasksConfigSchema.parse({}),
  },
  recent_activity: {
    type: 'recent_activity',
    label: 'Letzte Aktivität',
    description: 'Kürzlich aktualisierte Einträge',
    component: RecentActivityWidget,
    configSchema: recentActivityConfigSchema,
    allowedEntityTypes: '*',
    sizes: ['md', 'lg'],
    defaultSize: 'md',
    defaultConfig: () => recentActivityConfigSchema.parse({}),
  },
}

export function parseWidgetConfig<T extends WidgetType>(
  type: T,
  config: unknown,
): WidgetConfigMap[T] {
  return widgetConfigByType[type].parse(config) as WidgetConfigMap[T]
}

export function listWidgetsForEntityType(entityType: EntityType): WidgetDefinition<WidgetType>[] {
  return Object.values(WIDGET_REGISTRY).filter(
    (w) => w.allowedEntityTypes === '*' || w.allowedEntityTypes.includes(entityType),
  ) as WidgetDefinition<WidgetType>[]
}

export function isWidgetAllowedForEntity(widgetType: WidgetType, entityType: EntityType): boolean {
  const def = WIDGET_REGISTRY[widgetType]
  return def.allowedEntityTypes === '*' || def.allowedEntityTypes.includes(entityType)
}

export const WIDGET_SIZE_GRID: Record<WidgetSize, { w: number; h: number }> = {
  sm: { w: 1, h: 1 },
  md: { w: 2, h: 1 },
  lg: { w: 2, h: 2 },
  xl: { w: 3, h: 2 },
}
