import { describe, expect, it } from 'vitest'
import { selectRecentMoments } from '@/features/home/recent-moments'
import type {
  EntityDetailRow,
  EntityMediaRow,
  EntityRow,
  MediaAssetRow,
} from '@/lib/indexed-db/schema'

const SPACE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function entity(
  partial: Partial<EntityRow> & Pick<EntityRow, 'id' | 'entity_type' | 'title'>,
): EntityRow {
  return {
    space_id: SPACE,
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

function media(id: string, path: string): MediaAssetRow {
  return {
    id,
    space_id: SPACE,
    storage_path: path,
    original_filename: 'photo.jpg',
    mime_type: 'image/jpeg',
    byte_size: 10,
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
}

describe('selectRecentMoments (V7)', () => {
  it('liefert nur nicht gelöschte moment-Entities', () => {
    const cards = selectRecentMoments({
      entities: [
        entity({ id: 'm1', entity_type: 'moment', title: 'See' }),
        entity({
          id: 'm2',
          entity_type: 'moment',
          title: 'Gelöscht',
          deleted_at: '2026-02-01T00:00:00.000Z',
        }),
        entity({ id: 'w1', entity_type: 'wish', title: 'Kamera' }),
        entity({ id: 'r1', entity_type: 'recipe', title: 'Pasta' }),
        entity({ id: 'l1', entity_type: 'leisure', title: 'Idee' }),
        entity({ id: 'd1', entity_type: 'date', title: 'Dinner' }),
        entity({ id: 't1', entity_type: 'trip', title: 'Paris' }),
      ],
      entityMedia: [],
      mediaAssets: [],
    })

    expect(cards).toHaveLength(1)
    expect(cards[0]?.entityType).toBe('moment')
    expect(cards[0]?.title).toBe('See')
  })

  it('schließt Orphan-Media von wish/recipe/leisure/date/trip aus', () => {
    const wishMedia = media('mw', 'space/wish.jpg')
    const recipeMedia = media('mr', 'space/recipe.jpg')
    const links: EntityMediaRow[] = [
      {
        id: 'lw',
        space_id: SPACE,
        entity_id: 'w1',
        media_id: 'mw',
        role: 'gallery',
        sort_order: 0,
        caption: 'Wunschfoto',
        created_at: '2026-01-02T10:00:00.000Z',
      },
      {
        id: 'lr',
        space_id: SPACE,
        entity_id: 'r1',
        media_id: 'mr',
        role: 'gallery',
        sort_order: 0,
        caption: 'Rezeptfoto',
        created_at: '2026-01-02T10:00:00.000Z',
      },
    ]

    const cards = selectRecentMoments({
      entities: [
        entity({ id: 'w1', entity_type: 'wish', title: 'Kamera' }),
        entity({ id: 'r1', entity_type: 'recipe', title: 'Pasta' }),
        entity({ id: 'l1', entity_type: 'leisure', title: 'Idee' }),
        entity({ id: 'd1', entity_type: 'date', title: 'Dinner' }),
        entity({ id: 't1', entity_type: 'trip', title: 'Paris' }),
      ],
      entityMedia: links,
      mediaAssets: [wishMedia, recipeMedia],
    })

    expect(cards).toEqual([])
  })

  it('ordnet Medien eines echten Moments korrekt zu', () => {
    const momentId = '33333333-3333-4333-8333-333333333333'
    const mediaId = '22222222-2222-4222-8222-222222222222'
    const details: EntityDetailRow[] = [
      {
        entity_id: momentId,
        detail_type: 'moment',
        space_id: SPACE,
        payload: { capturedAt: '2026-07-20T18:00:00.000Z' },
        created_at: '2026-07-20T18:00:00.000Z',
        updated_at: '2026-07-20T18:00:00.000Z',
      },
    ]

    const cards = selectRecentMoments({
      entities: [
        entity({
          id: momentId,
          entity_type: 'moment',
          title: 'Sonnenuntergang',
          created_at: '2026-01-01T00:00:00.000Z',
        }),
      ],
      entityDetails: details,
      entityMedia: [
        {
          id: 'link1',
          space_id: SPACE,
          entity_id: momentId,
          media_id: mediaId,
          role: 'gallery',
          sort_order: 0,
          caption: null,
          created_at: '2026-07-20T18:00:00.000Z',
        },
      ],
      mediaAssets: [media(mediaId, 'space/moment.jpg')],
    })

    expect(cards).toHaveLength(1)
    expect(cards[0]?.storagePath).toBe('space/moment.jpg')
    expect(cards[0]?.occurredAt).toBe('2026-07-20T18:00:00.000Z')
  })
})
