import { describe, expect, it } from 'vitest'
import type { EntityRow } from '@/lib/indexed-db/schema'
import { selectHomeHero } from '@/features/home/hero'

function makeEntity(overrides: Partial<EntityRow>): EntityRow {
  return {
    id: '1',
    space_id: 's1',
    entity_type: 'event',
    title: 'Test',
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
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  }
}

describe('selectHomeHero', () => {
  const now = new Date('2026-08-01T12:00:00.000Z')

  it('picks a happening-today event over later trips', () => {
    const hero = selectHomeHero({
      now,
      entities: [
        makeEntity({
          id: 'trip-later',
          entity_type: 'trip',
          title: 'Herbstreise',
          starts_at: '2026-09-01T10:00:00.000Z',
        }),
        makeEntity({
          id: 'today-date',
          entity_type: 'date',
          title: 'Brunch',
          starts_at: '2026-08-01T18:00:00.000Z',
        }),
      ],
    })
    expect(hero.id).toBe('today-date')
    expect(hero.kind).toBe('happening_today')
  })

  it('is deterministic for equal priority candidates', () => {
    const entities = [
      makeEntity({
        id: 'b-trip',
        entity_type: 'trip',
        title: 'B',
        starts_at: '2026-08-05T10:00:00.000Z',
      }),
      makeEntity({
        id: 'a-trip',
        entity_type: 'trip',
        title: 'A',
        starts_at: '2026-08-05T10:00:00.000Z',
      }),
    ]
    const first = selectHomeHero({ now, entities })
    const second = selectHomeHero({ now, entities: [...entities].reverse() })
    expect(first.id).toBe(second.id)
    expect(first.id).toBe('a-trip')
  })

  it('falls back emotionally without inventing entity copies', () => {
    const hero = selectHomeHero({
      now,
      entities: [],
      partnerAName: 'Dennis',
      partnerBName: 'Lea',
      togetherDays: 100,
      pairCoverPath: 'space/cover.jpg',
    })
    expect(hero.kind).toBe('emotional_fallback')
    expect(hero.href).toBe('/settings/pair')
    expect(hero.mediaPath).toBe('space/cover.jpg')
    expect(hero.entityId).toBeUndefined()
  })

  it('prefers near goal deadline over distant plan', () => {
    const hero = selectHomeHero({
      now,
      entities: [
        makeEntity({
          id: 'far-plan',
          entity_type: 'project',
          title: 'Später',
          starts_at: '2026-12-01T10:00:00.000Z',
        }),
        makeEntity({
          id: 'goal-soon',
          entity_type: 'goal',
          title: 'Sparziel',
          starts_at: '2026-08-10T10:00:00.000Z',
        }),
      ],
    })
    expect(hero.id).toBe('goal-soon')
    expect(hero.kind).toBe('goal_deadline')
  })
})
