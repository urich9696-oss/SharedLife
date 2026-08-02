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
        budgetAmount: row.budget_amount != null ? String(row.budget_amount) : '',
        accommodation: String(row.accommodation ?? ''),
        packingListText: '',
        placesText: '',
      }
    case 'date':
      return {
        phase: 'planned',
        occasion: row.occasion ?? '',
        venueName: row.venue_name ?? '',
        dressCode: row.dress_code ?? '',
        mood: row.mood ?? '',
        surprise: Boolean(row.surprise),
        estimatedCost: row.estimated_cost != null ? String(row.estimated_cost) : '',
        reservationReference: row.reservation_reference ?? '',
        // reservationStatus lebt in entities.metadata; Referenz allein ≠ confirmed
        reservationStatus: row.reservation_reference ? 'confirmed' : 'none',
        assigneeRole: 'gemeinsam',
        belongsToEntityId: '',
      }
    case 'goal':
      return {
        progressKind: 'amount',
        current: Number(row.progress_percent ?? 0),
        target: 100,
        milestones: String(row.motivation ?? ''),
        goalStatus: 'active',
      }
    case 'task': {
      const priority = String(row.priority ?? 'normal')
      return {
        priority: priority === 'normal' ? 'medium' : priority === 'urgent' ? 'high' : priority,
        assigneeId: row.assignee_id ? String(row.assignee_id) : '',
        assigneeRole: '',
        dueDate: row.due_date ? String(row.due_date) : '',
        dueTime: '',
        category: '',
        assignment: '',
        recurrenceRule: 'none',
        note: '',
        subtasksText: '',
      }
    }
    case 'wish':
      return {
        url: row.url ?? '',
        price: row.price != null ? String(row.price) : '',
        currency: row.currency ?? 'CHF',
        priority: row.priority ?? 'normal',
        fulfilled: Boolean(row.acquired_at),
        // occasion/wishStatus (ausser bought) liegen in entities.metadata
        occasion: '',
        wishStatus: row.acquired_at ? 'bought' : 'open',
      }
    case 'moment':
      return {
        place: '',
        category: row.mood ?? '',
        belonging: '',
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
        recurrenceRule: row.recurrence_rule ?? 'none',
        calendarColor: row.calendar_color ?? '',
        assignment: 'termin',
        assigneeRole: 'gemeinsam',
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

  const remoteDetailRows: Array<{
    type: DetailType
    row: Record<string, unknown>
  }> = []
  for (const { table, type } of DETAIL_TABLES) {
    const { data, error } = await supabase.from(table).select('*').eq('space_id', spaceId)
    throwIfError(error)
    for (const row of data ?? []) {
      remoteDetailRows.push({ type, row: row as Record<string, unknown> })
    }
  }

  // protectedIds erst unmittelbar vor dem Replace lesen — sonst löscht ein
  // paralleler Create während des Netzwerk-Fetches lokale Outbox-Einträge.
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
      db.outbox,
      db.syncMeta,
    ],
    async () => {
      const protectedIds = await protectedResourceIds()

      const entitiesById = new Map(entities.map((e) => [e.id, e]))
      const detailRecords: EntityDetailRow[] = []
      for (const { type, row } of remoteDetailRows) {
        const entityId = String(row.entity_id)
        if (protectedIds.has(entityId)) continue
        const payload = detailRowToLocalPayload(type, row)
        const entity = entitiesById.get(entityId)
        const meta = entity?.metadata ?? {}
        // Felder, die nur in entities.metadata leben, beim Pull wieder einspielen
        if (type === 'wish') {
          if (meta.occasion) payload.occasion = meta.occasion
          if (meta.wishStatus && !payload.fulfilled) payload.wishStatus = meta.wishStatus
        }
        if (type === 'date') {
          if (meta.reservationStatus) payload.reservationStatus = meta.reservationStatus
          if (meta.assigneeRole) payload.assigneeRole = meta.assigneeRole
          if (meta.belongsToEntityId) payload.belongsToEntityId = meta.belongsToEntityId
          else if (entity?.parent_entity_id) payload.belongsToEntityId = entity.parent_entity_id
          // Ort in Metadata spiegeln für Partner-Listen ohne Detail-UI
          if (payload.venueName && entity && meta.place !== payload.venueName) {
            entity.metadata = { ...meta, place: String(payload.venueName) }
          }
        }
        detailRecords.push({
          entity_id: entityId,
          detail_type: type,
          space_id: spaceId,
          payload,
          created_at: String(row.created_at ?? new Date().toISOString()),
          updated_at: String(row.updated_at ?? new Date().toISOString()),
        })
      }

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
