import Dexie, { type Table } from 'dexie'
import type {
  BudgetRow,
  ChecklistItemRow,
  ChecklistRow,
  ConflictCopyRow,
  DeviceRow,
  EntityDetailRow,
  EntityLinkRow,
  EntityLocationRow,
  EntityMediaRow,
  EntityRow,
  ActivityLogRow,
  LocalMediaBlobRow,
  LocationRow,
  MediaAssetRow,
  NoteRow,
  OutboxMutationRow,
  ReminderRow,
  SyncMetaRow,
  TimelineEntryRow,
  TransactionRow,
  UploadQueueRow,
  ViewLayoutRow,
  WidgetInstanceRow,
} from '@/lib/indexed-db/schema'

export class SharedLifeDB extends Dexie {
  entities!: Table<EntityRow, string>
  entityDetails!: Table<EntityDetailRow, [string, string]>
  notes!: Table<NoteRow, string>
  checklists!: Table<ChecklistRow, string>
  checklistItems!: Table<ChecklistItemRow, string>
  budgets!: Table<BudgetRow, string>
  transactions!: Table<TransactionRow, string>
  locations!: Table<LocationRow, string>
  entityLocations!: Table<EntityLocationRow, string>
  mediaAssets!: Table<MediaAssetRow, string>
  entityMedia!: Table<EntityMediaRow, string>
  timelineEntries!: Table<TimelineEntryRow, string>
  reminders!: Table<ReminderRow, string>
  widgetInstances!: Table<WidgetInstanceRow, string>
  viewLayouts!: Table<ViewLayoutRow, string>
  entityLinks!: Table<EntityLinkRow, string>
  outbox!: Table<OutboxMutationRow, string>
  uploadQueue!: Table<UploadQueueRow, string>
  conflictCopies!: Table<ConflictCopyRow, string>
  syncMeta!: Table<SyncMetaRow, string>
  device!: Table<DeviceRow, string>
  localMediaBlobs!: Table<LocalMediaBlobRow, string>
  activityLog!: Table<ActivityLogRow, string>

  constructor() {
    super('SharedLifeDB')

    this.version(1).stores({
      entities: 'id, space_id, entity_type, updated_at, deleted_at, [space_id+entity_type]',
      entityDetails: '[entity_id+detail_type], space_id',
      notes: 'id, space_id, entity_id, deleted_at',
      checklists: 'id, space_id, entity_id, deleted_at',
      checklistItems: 'id, space_id, checklist_id, deleted_at, [checklist_id+sort_order]',
      budgets: 'id, space_id, entity_id, deleted_at',
      transactions: 'id, space_id, budget_id, transaction_date, deleted_at',
      locations: 'id, space_id, deleted_at',
      entityLocations: 'id, space_id, entity_id, location_id',
      mediaAssets: 'id, space_id, deleted_at',
      entityMedia: 'id, space_id, entity_id, media_id',
      timelineEntries: 'id, space_id, occurred_at, deleted_at',
      reminders: 'id, space_id, remind_at, deleted_at, entity_id',
      widgetInstances: 'id, space_id, view_layout_id, entity_id, deleted_at',
      viewLayouts: 'id, space_id, view_key, deleted_at',
      entityLinks: 'id, space_id, source_entity_id, target_entity_id, deleted_at',
      outbox:
        'mutationId, status, spaceId, resourceType, resourceId, [resourceType+resourceId], nextRetryAt, createdAt',
      uploadQueue: 'id, spaceId, mediaId, status',
      conflictCopies: 'id, spaceId, resourceId, resolvedAt, mutationId',
      syncMeta: 'key',
      device: 'id',
      localMediaBlobs: 'key',
    })

    this.version(2).stores({
      activityLog: 'id, space_id, created_at, entity_id, [space_id+created_at]',
    })
  }
}

export const db = new SharedLifeDB()
