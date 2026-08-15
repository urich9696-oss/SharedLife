import { describe, expect, it } from 'vitest'
import {
  momentDisplayTitle,
  selectRecentMoments,
} from '@/features/home/recent-moments'
import { deriveMomentChronicle } from '@/features/timeline/derive-timeline'
import type {
  EntityMediaRow,
  EntityRow,
  MediaAssetRow,
} from '@/lib/indexed-db/schema'

function entity(overrides: Partial<EntityRow>): EntityRow {
  return {
    id: 'e1',
    space_id: 's1',
    entity_type: 'moment',
    title: 'Moment',
    subtitle: null,
    description: null,
    status: 'active',
    color: null,
    icon: null,
    starts_at: '2026-07-01T12:00:00.000Z',
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
    created_at: '2026-07-01T12:00:00.000Z',
    updated_at: '2026-07-01T12:00:00.000Z',
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  }
}

function media(id: string, path: string): MediaAssetRow {
  return {
    id,
    space_id: 's1',
    storage_path: path,
    original_filename: 'IMG_3728.jpg',
    mime_type: 'image/jpeg',
    byte_size: 100,
    width: 100,
    height: 100,
    duration_ms: null,
    blurhash: null,
    variant: 'display',
    parent_media_id: null,
    uploaded_by: null,
    taken_at: '2026-07-01T12:00:00.000Z',
    metadata: {},
    created_at: '2026-07-01T12:00:00.000Z',
    updated_at: '2026-07-01T12:00:00.000Z',
    deleted_at: null,
  }
}

function link(entityId: string, mediaId: string): EntityMediaRow {
  return {
    id: `link-${entityId}-${mediaId}`,
    space_id: 's1',
    entity_id: entityId,
    media_id: mediaId,
    role: 'gallery',
    sort_order: 0,
    caption: null,
    created_at: '2026-07-01T12:00:00.000Z',
  }
}

describe('Momente V8', () => {
  it('Timeline enthält echte Momente', () => {
    const items = deriveMomentChronicle({
      entities: [entity({ id: 'm1', title: 'Sonnenuntergang' })],
      entityMedia: [],
      mediaAssets: [],
    })
    expect(items).toHaveLength(1)
    expect(items[0]?.entityType).toBe('moment')
  })

  it('Rezeptbilder erscheinen nicht', () => {
    const recipe = entity({ id: 'r1', entity_type: 'recipe', title: 'Pasta' })
    const asset = media('img1', 'recipe/pasta.jpg')
    const items = deriveMomentChronicle({
      entities: [recipe],
      entityMedia: [link('r1', 'img1')],
      mediaAssets: [asset],
    })
    expect(items).toHaveLength(0)

    const recent = selectRecentMoments({
      entities: [recipe],
      entityMedia: [link('r1', 'img1')],
      mediaAssets: [asset],
    })
    expect(recent).toHaveLength(0)
  })

  it('Wunsch-/Produktbilder erscheinen nicht', () => {
    const wish = entity({ id: 'w1', entity_type: 'wish', title: 'Kamera' })
    const asset = media('img2', 'wish/cam.jpg')
    const items = deriveMomentChronicle({
      entities: [wish],
      entityMedia: [link('w1', 'img2')],
      mediaAssets: [asset],
    })
    expect(items).toHaveLength(0)
  })

  it('allgemeine Uploads erscheinen nicht als Orphan', () => {
    const items = deriveMomentChronicle({
      entities: [],
      entityMedia: [link('unknown', 'img3')],
      mediaAssets: [media('img3', 'orphan.jpg')],
    })
    expect(items).toHaveLength(0)
  })

  it('echter Moment ohne Titel erhält neutralen UI-Fallback', () => {
    expect(momentDisplayTitle('')).toBe('Gemeinsamer Moment')
    expect(momentDisplayTitle('IMG_3728.jpg')).toBe('Gemeinsamer Moment')
    expect(momentDisplayTitle('Unser Abend')).toBe('Unser Abend')
  })

  it('bestehende Medien von Momenten bleiben erhalten', () => {
    const moment = entity({ id: 'm1', title: 'Spaziergang', cover_media_id: 'img4' })
    const asset = media('img4', 'moment/walk.jpg')
    const recent = selectRecentMoments({
      entities: [moment],
      entityMedia: [link('m1', 'img4')],
      mediaAssets: [asset],
    })
    expect(recent[0]?.storagePath).toBe('moment/walk.jpg')
  })
})
