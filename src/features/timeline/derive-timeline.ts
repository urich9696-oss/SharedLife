import { humanizeMediaTitle } from '@/features/media/media-url'
import type {
  EntityMediaRow,
  EntityRow,
  MediaAssetRow,
  TimelineEntryRow,
} from '@/lib/indexed-db/schema'

export interface TimelineItem {
  id: string
  title: string
  subtitle?: string | null
  occurredAt: string
  sourceType: 'entity' | 'timeline_entry' | 'media'
  sourceLabel: string
  entityId?: string | null
  highlight?: boolean
  storagePath?: string | null
  coverMediaId?: string | null
}

export interface DeriveTimelineInput {
  entities: EntityRow[]
  timelineEntries: TimelineEntryRow[]
  entityMedia: EntityMediaRow[]
  mediaAssets: MediaAssetRow[]
}

const TIMELINE_ENTITY_TYPES = new Set(['moment', 'trip', 'date', 'milestone', 'event', 'journal'])

export function deriveTimelineItems(input: DeriveTimelineInput): TimelineItem[] {
  const items: TimelineItem[] = []
  const mediaById = new Map(input.mediaAssets.map((m) => [m.id, m]))

  for (const entity of input.entities) {
    if (!TIMELINE_ENTITY_TYPES.has(entity.entity_type)) continue
    const occurredAt = entity.starts_at ?? entity.created_at
    const cover = entity.cover_media_id ? mediaById.get(entity.cover_media_id) : null
    items.push({
      id: `entity:${entity.id}`,
      title: entity.title,
      subtitle: entity.subtitle,
      occurredAt,
      sourceType: 'entity',
      sourceLabel: entity.entity_type,
      entityId: entity.id,
      storagePath: cover?.storage_path ?? null,
      coverMediaId: entity.cover_media_id,
    })
  }

  for (const entry of input.timelineEntries) {
    items.push({
      id: `entry:${entry.id}`,
      title: entry.title,
      subtitle: entry.body,
      occurredAt: entry.occurred_at,
      sourceType: 'timeline_entry',
      sourceLabel: entry.entry_type,
      entityId: entry.entity_id,
      highlight: entry.highlight,
    })
  }

  for (const link of input.entityMedia) {
    const asset = mediaById.get(link.media_id)
    if (!asset || asset.variant !== 'display') continue
    items.push({
      id: `media:${link.id}`,
      title: humanizeMediaTitle(link.caption, asset.original_filename),
      subtitle: null,
      occurredAt: asset.taken_at ?? asset.created_at,
      sourceType: 'media',
      sourceLabel: 'Foto',
      entityId: link.entity_id,
      storagePath: asset.storage_path,
    })
  }

  return items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}
