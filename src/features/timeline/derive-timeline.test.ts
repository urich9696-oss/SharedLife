import { describe, expect, it } from 'vitest'
import { deriveTimelineItems } from '@/features/timeline/derive-timeline'
import type { EntityRow, MediaAssetRow } from '@/lib/indexed-db/schema'

function entity(partial: Partial<EntityRow> & Pick<EntityRow, 'id' | 'entity_type' | 'title'>): EntityRow {
  return {
    space_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    subtitle: null,
    description: null,
    status: 'active',
    color: null,
    icon: null,
    starts_at: null,
    ends_at: null,
    all_day_start: null,
    all_day_end: null,
    cover_media_id: null,
    parent_entity_id: null,
    sort_order: 0,
    metadata: {},
    version: 1,
    created_by: null,
    updated_by: null,
    created_at: '2026-01-01T10:00:00.000Z',
    updated_at: '2026-01-01T10:00:00.000Z',
    deleted_at: null,
    deleted_by: null,
    ...partial,
  }
}

describe('deriveTimelineItems', () => {
  it('uses all_day_start when starts_at is missing', () => {
    const items = deriveTimelineItems({
      entities: [
        entity({
          id: '11111111-1111-4111-8111-111111111111',
          entity_type: 'moment',
          title: 'Spaziergang',
          all_day_start: '2026-03-10',
        }),
      ],
      timelineEntries: [],
      entityMedia: [],
      mediaAssets: [],
    })
    expect(items[0]?.occurredAt.startsWith('2026-03-10')).toBe(true)
  })

  it('attaches cover media and avoids duplicate photo cards', () => {
    const mediaId = '22222222-2222-4222-8222-222222222222'
    const entityId = '33333333-3333-4333-8333-333333333333'
    const asset: MediaAssetRow = {
      id: mediaId,
      space_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      storage_path: 'space/media/app/photo.jpg',
      original_filename: 'photo.jpg',
      mime_type: 'image/jpeg',
      byte_size: 100,
      width: 800,
      height: 600,
      duration_ms: null,
      blurhash: null,
      variant: 'display',
      parent_media_id: null,
      uploaded_by: null,
      taken_at: null,
      metadata: {},
      created_at: '2026-01-02T10:00:00.000Z',
      updated_at: '2026-01-02T10:00:00.000Z',
      deleted_at: null,
    }

    const items = deriveTimelineItems({
      entities: [
        entity({
          id: entityId,
          entity_type: 'trip',
          title: 'Paris',
          cover_media_id: mediaId,
          starts_at: '2026-06-01T08:00:00.000Z',
        }),
      ],
      timelineEntries: [],
      entityMedia: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          space_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          entity_id: entityId,
          media_id: mediaId,
          role: 'gallery',
          sort_order: 0,
          caption: null,
          created_at: '2026-01-02T10:00:00.000Z',
        },
      ],
      mediaAssets: [asset],
    })

    expect(items).toHaveLength(1)
    expect(items[0]?.storagePath).toBe('space/media/app/photo.jpg')
    expect(items[0]?.kind).toBe('trip')
  })

  it('behält breite Timeline-Aggregation für Non-Moment-Typen (V7)', () => {
    const items = deriveTimelineItems({
      entities: [
        entity({
          id: '55555555-5555-4555-8555-555555555555',
          entity_type: 'date',
          title: 'Dinner',
          starts_at: '2026-08-01T18:00:00.000Z',
        }),
        entity({
          id: '66666666-6666-4666-8666-666666666666',
          entity_type: 'trip',
          title: 'Paris',
          starts_at: '2026-09-01T08:00:00.000Z',
        }),
        entity({
          id: '77777777-7777-4777-8777-777777777777',
          entity_type: 'wish',
          title: 'Kamera',
        }),
      ],
      timelineEntries: [],
      entityMedia: [],
      mediaAssets: [],
    })

    expect(items.map((i) => i.entityType)).toEqual(['trip', 'date'])
    expect(items.some((i) => i.entityType === 'wish')).toBe(false)
  })
})
