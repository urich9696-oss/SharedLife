import type {
  EntityDetailRow,
  EntityMediaRow,
  EntityRow,
  MediaAssetRow,
} from '@/lib/indexed-db/schema'

/** Karte für die Home-Sektion „Letzte Momente“ — ausschließlich echte Moments. */
export interface RecentMomentCard {
  id: string
  entityId: string
  entityType: 'moment'
  title: string
  occurredAt: string
  storagePath: string | null
}

export interface SelectRecentMomentsInput {
  entities: EntityRow[]
  entityDetails?: EntityDetailRow[]
  entityMedia: EntityMediaRow[]
  mediaAssets: MediaAssetRow[]
  limit?: number
}

const NEUTRAL_MOMENT_TITLE = 'Gemeinsamer Moment'

function entityDateIso(entity: EntityRow): string | null {
  if (entity.starts_at) return entity.starts_at
  if (entity.all_day_start) return `${entity.all_day_start}T12:00:00.000Z`
  return null
}

function capturedAtFromDetails(
  entityId: string,
  details: EntityDetailRow[] | undefined,
): string | null {
  if (!details?.length) return null
  const detail = details.find((d) => d.entity_id === entityId && d.detail_type === 'moment')
  const raw = detail?.payload?.capturedAt ?? detail?.payload?.captured_at
  return typeof raw === 'string' && raw.trim() ? raw : null
}

/** Fachliches Sortierdatum: captured_at → Entity-Datum → created_at */
export function momentOccurredAt(entity: EntityRow, details?: EntityDetailRow[]): string {
  return (
    capturedAtFromDetails(entity.id, details) ?? entityDateIso(entity) ?? entity.created_at
  )
}

/** Neutraler UI-Fallback — überschreibt nie einen bewussten Titel. */
export function momentDisplayTitle(title: string | null | undefined): string {
  const trimmed = title?.trim()
  if (!trimmed) return NEUTRAL_MOMENT_TITLE
  // Technische Dateinamen nicht als Momenttitel zeigen
  if (/^IMG[_\-\s]?\d+/i.test(trimmed) || /\.(jpe?g|png|heic|webp)$/i.test(trimmed)) {
    return NEUTRAL_MOMENT_TITLE
  }
  return trimmed
}

function firstMomentMediaPath(
  entity: EntityRow,
  entityMedia: EntityMediaRow[],
  mediaById: Map<string, MediaAssetRow>,
): string | null {
  if (entity.cover_media_id) {
    const cover = mediaById.get(entity.cover_media_id)
    if (cover && !cover.deleted_at) return cover.storage_path
  }
  const links = entityMedia
    .filter((l) => l.entity_id === entity.id)
    .sort((a, b) => a.sort_order - b.sort_order)
  for (const link of links) {
    const asset = mediaById.get(link.media_id)
    if (asset && !asset.deleted_at && asset.variant === 'display') {
      return asset.storage_path
    }
  }
  return null
}

/**
 * Home-spezifischer Selector: nur nicht gelöschte `moment`-Entities.
 * Keine Orphan-Media anderer Typen, keine Timeline-Aggregation.
 */
export function selectRecentMoments(input: SelectRecentMomentsInput): RecentMomentCard[] {
  const limit = input.limit ?? 12
  const mediaById = new Map(input.mediaAssets.map((m) => [m.id, m]))

  const moments = input.entities.filter((e) => e.entity_type === 'moment' && !e.deleted_at)

  const cards = moments.map((entity) => {
    const occurredAt = momentOccurredAt(entity, input.entityDetails)
    return {
      id: entity.id,
      entityId: entity.id,
      entityType: 'moment' as const,
      title: momentDisplayTitle(entity.title),
      occurredAt,
      storagePath: firstMomentMediaPath(entity, input.entityMedia, mediaById),
    }
  })

  cards.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  return cards.slice(0, limit)
}
