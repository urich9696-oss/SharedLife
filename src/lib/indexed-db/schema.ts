/** Mirrored table row types for local IndexedDB (offline-first). */

export const ENTITY_TYPES = [
  'trip',
  'date',
  'goal',
  'event',
  'task',
  'list',
  'wish',
  'moment',
  'project',
  'note',
  'milestone',
  'recipe',
  'gift',
  'household',
  'leisure',
  'journal',
  'expense',
] as const

export type EntityType = (typeof ENTITY_TYPES)[number]

export const ENTITY_STATUSES = [
  'active',
  'archived',
  'completed',
  'cancelled',
  'draft',
] as const

export type EntityStatus = (typeof ENTITY_STATUSES)[number]

export interface EntityRow {
  id: string
  space_id: string
  entity_type: EntityType
  title: string
  subtitle: string | null
  description: string | null
  status: EntityStatus
  color: string | null
  icon: string | null
  starts_at: string | null
  ends_at: string | null
  all_day_start: string | null
  all_day_end: string | null
  cover_media_id: string | null
  parent_entity_id: string | null
  sort_order: number
  metadata: Record<string, unknown>
  version: number
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
}

export const DETAIL_TYPES = [
  'trip',
  'date',
  'goal',
  'event',
  'task',
  'list',
  'wish',
  'moment',
  'project',
  'milestone',
] as const

export type DetailType = (typeof DETAIL_TYPES)[number]

export interface EntityDetailRow {
  entity_id: string
  detail_type: DetailType
  space_id: string
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface NoteRow {
  id: string
  space_id: string
  entity_id: string
  content: string
  content_format: 'markdown' | 'plain'
  word_count: number
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ChecklistRow {
  id: string
  space_id: string
  entity_id: string
  title: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ChecklistItemRow {
  id: string
  space_id: string
  checklist_id: string
  title: string
  is_checked: boolean
  checked_at: string | null
  checked_by: string | null
  assignee_id: string | null
  due_date: string | null
  sort_order: number
  quantity?: string | null
  unit?: string | null
  category?: string | null
  is_favorite?: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface BudgetRow {
  id: string
  space_id: string
  entity_id: string | null
  name: string
  description: string | null
  currency: string
  amount_limit: string | null
  amount_spent: string
  period_start: string | null
  period_end: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface TransactionRow {
  id: string
  space_id: string
  budget_id: string | null
  entity_id: string | null
  amount: string
  currency: string
  description: string
  category: string | null
  transaction_date: string
  paid_by: string | null
  is_income: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface LocationRow {
  id: string
  space_id: string
  name: string
  address_line: string | null
  city: string | null
  country_code: string | null
  latitude: number | null
  longitude: number | null
  place_id: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface EntityLocationRow {
  id: string
  space_id: string
  entity_id: string
  location_id: string
  role: 'venue' | 'start' | 'end' | 'stopover' | 'home' | 'other'
  sort_order: number
  created_at: string
}

export interface MediaAssetRow {
  id: string
  space_id: string
  storage_path: string
  original_filename: string | null
  mime_type: string
  byte_size: number
  width: number | null
  height: number | null
  duration_ms: number | null
  blurhash: string | null
  variant: 'original' | 'display' | 'thumb' | 'blur'
  parent_media_id: string | null
  uploaded_by: string | null
  taken_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface EntityMediaRow {
  id: string
  space_id: string
  entity_id: string
  media_id: string
  role: 'cover' | 'gallery' | 'attachment' | 'avatar'
  sort_order: number
  caption: string | null
  created_at: string
}

export interface TimelineEntryRow {
  id: string
  space_id: string
  entity_id: string | null
  entry_type: 'memory' | 'milestone' | 'trip_day' | 'anniversary' | 'custom'
  title: string
  body: string | null
  occurred_at: string
  occurred_on: string | null
  highlight: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ReminderRow {
  id: string
  space_id: string
  entity_id: string | null
  title: string
  body: string | null
  remind_at: string
  next_trigger_at: string | null
  timezone: string
  recurrence_rule: string | null
  is_active: boolean
  notify_push: boolean
  notify_in_app: boolean
  created_by: string | null
  assigned_to: string | null
  last_triggered_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface WidgetInstanceRow {
  id: string
  space_id: string
  view_layout_id: string | null
  entity_id: string | null
  widget_type: string
  title: string | null
  config: Record<string, unknown>
  grid_x: number
  grid_y: number
  grid_w: number
  grid_h: number
  is_visible: boolean
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ViewLayoutRow {
  id: string
  space_id: string
  user_id: string | null
  view_key: string
  name: string | null
  layout: Record<string, unknown>
  is_default: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface EntityLinkRow {
  id: string
  space_id: string
  source_entity_id: string
  target_entity_id: string
  link_type: string
  label: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type MutationOperation =
  | 'create'
  | 'update'
  | 'soft_delete'
  | 'restore'
  | 'upsert_related'

export type ResourceType =
  | 'entity'
  | 'entity_detail'
  | 'note'
  | 'checklist'
  | 'checklist_item'
  | 'budget'
  | 'transaction'
  | 'location'
  | 'entity_location'
  | 'media_asset'
  | 'entity_media'
  | 'timeline_entry'
  | 'reminder'
  | 'widget_instance'
  | 'view_layout'
  | 'entity_link'

export type OutboxStatus = 'pending' | 'syncing' | 'failed'

export interface OutboxMutationRow {
  mutationId: string
  deviceId: string
  spaceId: string
  resourceType: ResourceType
  resourceId: string
  operation: MutationOperation
  expectedVersion: number | null
  payload: Record<string, unknown>
  createdAt: string
  status: OutboxStatus
  attemptCount: number
  lastAttemptAt: string | null
  nextRetryAt: string | null
  lastError: string | null
}

export interface UploadQueueRow {
  id: string
  spaceId: string
  mediaId: string
  localBlobKey: string
  mimeType: string
  status: 'pending' | 'uploading' | 'failed' | 'done'
  attemptCount: number
  createdAt: string
  lastError: string | null
}

export interface ConflictCopyRow {
  id: string
  mutationId: string
  spaceId: string
  resourceType: ResourceType
  resourceId: string
  clientVersion: number | null
  serverVersion: number | null
  clientPayload: Record<string, unknown>
  serverPayload: Record<string, unknown>
  createdAt: string
  resolvedAt: string | null
}

export interface SyncMetaRow {
  key: string
  value: string
}

export interface DeviceRow {
  id: string
  label: string
  platform: string | null
  createdAt: string
}

export interface LocalMediaBlobRow {
  key: string
  blob: Blob
  mimeType: string
  createdAt: string
}

export interface ActivityLogRow {
  id: string
  space_id: string
  entity_id: string | null
  actor_id: string | null
  device_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  mutation_id: string | null
  payload: Record<string, unknown>
  created_at: string
}
