import { DEMO_MODE } from '@/lib/demo'
import { db } from '@/lib/indexed-db/db'
import type {
  BudgetRow,
  ChecklistItemRow,
  ChecklistRow,
  DetailType,
  EntityDetailRow,
  EntityLinkRow,
  EntityLocationRow,
  EntityMediaRow,
  EntityRow,
  LocationRow,
  MediaAssetRow,
  NoteRow,
  ReminderRow,
  TimelineEntryRow,
  TransactionRow,
  ViewLayoutRow,
  WidgetInstanceRow,
} from '@/lib/indexed-db/schema'
import { getSupabaseClient } from '@/lib/supabase/client'

const DETAIL_TABLES: Array<{ table: string; type: DetailType }> = [
  { table: 'trip_details', type: 'trip' },
  { table: 'date_details', type: 'date' },
  { table: 'goal_details', type: 'goal' },
  { table: 'event_details', type: 'event' },
  { table: 'task_details', type: 'task' },
  { table: 'list_details', type: 'list' },
  { table: 'wish_details', type: 'wish' },
  { table: 'moment_details', type: 'moment' },
  { table: 'project_details', type: 'project' },
  { table: 'milestone_details', type: 'milestone' },
]

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

/** Mappt Server-Detailzeilen auf das lokale UI-Payload-Format. */
export function detailRowToLocalPayload(
  detailType: DetailType,
  row: Record<string, unknown>,
): Record<string, unknown> {
  switch (detailType) {
    case 'trip':
      return {
        destination: String(row.destination ?? ''),
        budgetId: '',
      }
    case 'date':
      return {
        occasion: row.occasion ?? '',
        venueName: row.venue_name ?? '',
        dressCode: row.dress_code ?? '',
        mood: row.mood ?? '',
        surprise: Boolean(row.surprise),
      }
    case 'goal':
      return {
        progressKind: 'percent',
        current: Number(row.progress_percent ?? 0),
        target: 100,
        milestones: String(row.motivation ?? ''),
      }
    case 'task': {
      const priority = String(row.priority ?? 'normal')
      return {
        priority: priority === 'normal' ? 'medium' : priority === 'urgent' ? 'high' : priority,
        assigneeId: row.assignee_id ? String(row.assignee_id) : '',
        dueDate: row.due_date ? String(row.due_date) : '',
      }
    }
    case 'wish':
      return {
        url: row.url ?? '',
        price: row.price != null ? String(row.price) : '',
        currency: row.currency ?? 'CHF',
        priority: row.priority ?? 'normal',
        fulfilled: Boolean(row.acquired_at),
      }
    case 'moment':
      return {
        capturedAt: row.captured_at ?? '',
        mood: row.mood ?? '',
        weather: row.weather ?? '',
        highlight: Boolean(row.highlight),
      }
    case 'project':
      return {
        category: row.category ?? '',
        startDate: row.start_date ?? '',
        targetEndDate: row.target_end_date ?? '',
        progressPercent: Number(row.progress_percent ?? 0),
      }
    case 'list':
      return {
        listKind: row.list_kind ?? 'generic',
        isCheckable: Boolean(row.is_checkable ?? true),
      }
    case 'event':
      return {
        locationName: row.location_name ?? '',
        recurrenceRule: row.recurrence_rule ?? '',
        calendarColor: row.calendar_color ?? '',
      }
    case 'milestone':
      return {
        projectEntityId: row.project_entity_id ?? '',
        targetDate: row.target_date ?? '',
        achievedAt: row.achieved_at ?? '',
        weight: Number(row.weight ?? 1),
      }
    default:
      return {}
  }
}

async function protectedResourceIds(): Promise<Set<string>> {
  const pending = await db.outbox
    .filter((m) => m.status === 'pending' || m.status === 'syncing' || m.status === 'failed')
    .toArray()
  return new Set(pending.map((m) => m.resourceId))
}

async function replaceSpaceTable<T extends { id: string }>(
  tableName:
    | 'entities'
    | 'notes'
    | 'checklists'
    | 'checklistItems'
    | 'budgets'
    | 'transactions'
    | 'locations'
    | 'entityLocations'
    | 'mediaAssets'
    | 'timelineEntries'
    | 'reminders'
    | 'widgetInstances'
    | 'viewLayouts'
    | 'entityLinks'
    | 'entityMedia',
  spaceId: string,
  rows: T[],
  protectedIds: Set<string>,
): Promise<void> {
  const table = db.table(tableName)
  const existing = (await table.where('space_id').equals(spaceId).toArray()) as T[]
  const keepLocal = existing.filter((row) => protectedIds.has(row.id))
  const remoteSafe = rows.filter((row) => !protectedIds.has(row.id))
  await table.where('space_id').equals(spaceId).delete()
  const merged = [...remoteSafe, ...keepLocal]
  if (merged.length) await table.bulkPut(merged)
}

/** Lädt Space-Daten aus Supabase in Dexie (Hydrate nach Login / Online-Reconnect). */
export async function pullSpaceIntoDexie(spaceId: string): Promise<void> {
  if (DEMO_MODE) return

  const supabase = getSupabaseClient()
  const protectedIds = await protectedResourceIds()

  const [
    entitiesRes,
    notesRes,
    checklistsRes,
    checklistItemsRes,
    budgetsRes,
    transactionsRes,
    locationsRes,
    entityLocationsRes,
    mediaRes,
    entityMediaRes,
    timelineRes,
    remindersRes,
    widgetsRes,
    layoutsRes,
    linksRes,
  ] = await Promise.all([
    supabase.from('entities').select('*').eq('space_id', spaceId),
    supabase.from('notes').select('*').eq('space_id', spaceId),
    supabase.from('checklists').select('*').eq('space_id', spaceId),
    supabase.from('checklist_items').select('*').eq('space_id', spaceId),
    supabase.from('budgets').select('*').eq('space_id', spaceId),
    supabase.from('transactions').select('*').eq('space_id', spaceId),
    supabase.from('locations').select('*').eq('space_id', spaceId),
    supabase.from('entity_locations').select('*').eq('space_id', spaceId),
    supabase.from('media_assets').select('*').eq('space_id', spaceId),
    supabase.from('entity_media').select('*').eq('space_id', spaceId),
    supabase.from('timeline_entries').select('*').eq('space_id', spaceId),
    supabase.from('reminders').select('*').eq('space_id', spaceId),
    supabase.from('widget_instances').select('*').eq('space_id', spaceId),
    supabase.from('view_layouts').select('*').eq('space_id', spaceId),
    supabase.from('entity_links').select('*').eq('space_id', spaceId),
  ])

  for (const res of [
    entitiesRes,
    notesRes,
    checklistsRes,
    checklistItemsRes,
    budgetsRes,
    transactionsRes,
    locationsRes,
    entityLocationsRes,
    mediaRes,
    entityMediaRes,
    timelineRes,
    remindersRes,
    widgetsRes,
    layoutsRes,
    linksRes,
  ]) {
    throwIfError(res.error)
  }

  const entities = (entitiesRes.data ?? []) as EntityRow[]
  const notes = (notesRes.data ?? []) as NoteRow[]
  const checklists = (checklistsRes.data ?? []) as ChecklistRow[]
  const checklistItems = (checklistItemsRes.data ?? []) as ChecklistItemRow[]
  const budgets = (budgetsRes.data ?? []) as BudgetRow[]
  const transactions = (transactionsRes.data ?? []) as TransactionRow[]
  const locations = (locationsRes.data ?? []) as LocationRow[]
  const entityLocations = (entityLocationsRes.data ?? []) as EntityLocationRow[]
  const mediaAssets = (mediaRes.data ?? []) as MediaAssetRow[]
  const entityMedia = (entityMediaRes.data ?? []) as EntityMediaRow[]
  const timelineEntries = (timelineRes.data ?? []) as TimelineEntryRow[]
  const reminders = (remindersRes.data ?? []).map((row) => {
    const r = row as ReminderRow
    return {
      ...r,
      next_trigger_at: r.next_trigger_at ?? r.remind_at,
    } satisfies ReminderRow
  })
  const widgetInstances = (widgetsRes.data ?? []) as WidgetInstanceRow[]
  const viewLayouts = (layoutsRes.data ?? []) as ViewLayoutRow[]
  const entityLinks = (linksRes.data ?? []) as EntityLinkRow[]

  const detailRecords: EntityDetailRow[] = []
  for (const { table, type } of DETAIL_TABLES) {
    const { data, error } = await supabase.from(table).select('*').eq('space_id', spaceId)
    throwIfError(error)
    for (const row of data ?? []) {
      const r = row as Record<string, unknown>
      const entityId = String(r.entity_id)
      if (protectedIds.has(entityId)) continue
      detailRecords.push({
        entity_id: entityId,
        detail_type: type,
        space_id: spaceId,
        payload: detailRowToLocalPayload(type, r),
        created_at: String(r.created_at ?? new Date().toISOString()),
        updated_at: String(r.updated_at ?? new Date().toISOString()),
      })
    }
  }

  await db.transaction(
    'rw',
    [
      db.entities,
      db.entityDetails,
      db.notes,
      db.checklists,
      db.checklistItems,
      db.budgets,
      db.transactions,
      db.locations,
      db.entityLocations,
      db.mediaAssets,
      db.entityMedia,
      db.timelineEntries,
      db.reminders,
      db.widgetInstances,
      db.viewLayouts,
      db.entityLinks,
      db.syncMeta,
    ],
    async () => {
      await replaceSpaceTable('entities', spaceId, entities, protectedIds)
      await replaceSpaceTable('notes', spaceId, notes, protectedIds)
      await replaceSpaceTable('checklists', spaceId, checklists, protectedIds)
      await replaceSpaceTable('checklistItems', spaceId, checklistItems, protectedIds)
      await replaceSpaceTable('budgets', spaceId, budgets, protectedIds)
      await replaceSpaceTable('transactions', spaceId, transactions, protectedIds)
      await replaceSpaceTable('locations', spaceId, locations, protectedIds)
      await replaceSpaceTable('entityLocations', spaceId, entityLocations, protectedIds)
      await replaceSpaceTable('mediaAssets', spaceId, mediaAssets, protectedIds)
      await replaceSpaceTable('entityMedia', spaceId, entityMedia, protectedIds)
      await replaceSpaceTable('timelineEntries', spaceId, timelineEntries, protectedIds)
      await replaceSpaceTable('reminders', spaceId, reminders, protectedIds)
      await replaceSpaceTable('widgetInstances', spaceId, widgetInstances, protectedIds)
      await replaceSpaceTable('viewLayouts', spaceId, viewLayouts, protectedIds)
      await replaceSpaceTable('entityLinks', spaceId, entityLinks, protectedIds)

      const existingDetails = await db.entityDetails.where('space_id').equals(spaceId).toArray()
      const keepDetails = existingDetails.filter((d) => protectedIds.has(d.entity_id))
      await db.entityDetails.where('space_id').equals(spaceId).delete()
      const detailsMerged = [...detailRecords, ...keepDetails]
      if (detailsMerged.length) await db.entityDetails.bulkPut(detailsMerged)

      await db.syncMeta.put({ key: 'lastPullAt', value: new Date().toISOString() })
    },
  )
}
