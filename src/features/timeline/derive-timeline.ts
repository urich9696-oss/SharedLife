import { humanizeMediaTitle } from '@/features/media/media-url'
import type {
  EntityMediaRow,
  EntityRow,
  MediaAssetRow,
  TimelineEntryRow,
} from '@/lib/indexed-db/schema'

export type TimelineMomentKind =
  | 'moment'
  | 'trip'
  | 'goal'
  | 'anniversary'
  | 'date'
  | 'memory'
  | 'manual'
  | 'event'
  | 'journal'
  | 'photo'

export interface TimelineItem {
  id: string
  title: string
  subtitle?: string | null
  body?: string | null
  occurredAt: string
  location?: string | null
  kind: TimelineMomentKind
  sourceType: 'entity' | 'timeline_entry' | 'media'
  sourceLabel: string
  entityId?: string | null
  entityType?: string | null
  highlight?: boolean
  storagePath?: string | null
  coverMediaId?: string | null
  favorite?: boolean
}

export interface DeriveTimelineInput {
  entities: EntityRow[]
  timelineEntries: TimelineEntryRow[]
  entityMedia: EntityMediaRow[]
  mediaAssets: MediaAssetRow[]
}

const TIMELINE_ENTITY_TYPES = new Set([
  'moment',
  'trip',
  'date',
  'milestone',
  'event',
  'journal',
  'goal',
])

const KIND_LABELS: Record<TimelineMomentKind, string> = {
  moment: 'Gemeinsamer Moment',
  trip: 'Reise',
  goal: 'Ziel erreicht',
  anniversary: 'Jahrestag',
  date: 'Date',
  memory: 'Erinnerung',
  manual: 'Ereignis',
  event: 'Termin',
  journal: 'Journal',
  photo: 'Foto',
}

function entityOccurredAt(entity: EntityRow): string {
  return entity.starts_at ?? (entity.all_day_start ? `${entity.all_day_start}T12:00:00.000Z` : entity.created_at)
}

function kindForEntity(entity: EntityRow): TimelineMomentKind {
  if (entity.entity_type === 'moment') return 'memory'
  if (entity.entity_type === 'milestone' || entity.entity_type === 'goal') {
    return entity.status === 'completed' ? 'goal' : 'goal'
  }
  if (entity.entity_type === 'trip') return 'trip'
  if (entity.entity_type === 'date') return 'date'
  if (entity.entity_type === 'journal') return 'journal'
  if (entity.entity_type === 'event') {
    const meta = entity.metadata ?? {}
    if (meta.kind === 'anniversary' || meta.anniversary === true) return 'anniversary'
    return 'event'
  }
  return 'moment'
}

function firstMediaForEntity(
  entityId: string,
  coverMediaId: string | null,
  mediaById: Map<string, MediaAssetRow>,
  entityMedia: EntityMediaRow[],
): MediaAssetRow | null {
  if (coverMediaId) {
    const cover = mediaById.get(coverMediaId)
    if (cover && !cover.deleted_at) return cover
  }
  const link = entityMedia.find((l) => l.entity_id === entityId)
  if (!link) return null
  return mediaById.get(link.media_id) ?? null
}

export function timelineKindLabel(kind: TimelineMomentKind): string {
  return KIND_LABELS[kind]
}

export function deriveTimelineItems(input: DeriveTimelineInput): TimelineItem[] {
  const items: TimelineItem[] = []
  const mediaById = new Map(input.mediaAssets.map((m) => [m.id, m]))
  const entitiesWithMedia = new Set<string>()

  for (const entity of input.entities) {
    if (!TIMELINE_ENTITY_TYPES.has(entity.entity_type)) continue
    if (entity.entity_type === 'goal' && entity.status !== 'completed') continue

    const media = firstMediaForEntity(
      entity.id,
      entity.cover_media_id,
      mediaById,
      input.entityMedia,
    )
    if (media) entitiesWithMedia.add(entity.id)

    const kind = kindForEntity(entity)
    items.push({
      id: `entity:${entity.id}`,
      title: entity.title || KIND_LABELS[kind],
      subtitle: entity.subtitle,
      body: entity.description,
      occurredAt: entityOccurredAt(entity),
      location: (entity.metadata?.location as string | undefined) ?? null,
      kind,
      sourceType: 'entity',
      sourceLabel: KIND_LABELS[kind],
      entityId: entity.id,
      entityType: entity.entity_type,
      storagePath: media?.storage_path ?? null,
      coverMediaId: entity.cover_media_id,
      favorite: Boolean(entity.metadata?.favorite),
    })
  }

  for (const entry of input.timelineEntries) {
    items.push({
      id: `entry:${entry.id}`,
      title: entry.title,
      subtitle: null,
      body: entry.body,
      occurredAt: entry.occurred_at,
      kind: 'manual',
      sourceType: 'timeline_entry',
      sourceLabel: KIND_LABELS.manual,
      entityId: entry.entity_id,
      highlight: entry.highlight,
      favorite: entry.highlight,
    })
  }

  // Orphan gallery photos that aren't already represented by an entity card
  for (const link of input.entityMedia) {
    if (entitiesWithMedia.has(link.entity_id)) continue
    const asset = mediaById.get(link.media_id)
    if (!asset || asset.variant !== 'display' || asset.deleted_at) continue
    items.push({
      id: `media:${link.id}`,
      title: humanizeMediaTitle(link.caption, asset.original_filename),
      subtitle: null,
      body: link.caption && !link.caption.includes('/') ? link.caption : null,
      occurredAt: asset.taken_at ?? asset.created_at,
      kind: 'photo',
      sourceType: 'media',
      sourceLabel: KIND_LABELS.photo,
      entityId: link.entity_id,
      storagePath: asset.storage_path,
    })
  }

  return items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}
