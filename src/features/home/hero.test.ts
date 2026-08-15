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

describe('selectHomeHero V8', () => {
  const now = new Date('2026-08-01T12:00:00.000Z')

  it('wählt das früheste zukünftige geplante Date', () => {
    const hero = selectHomeHero({
      now,
      entities: [
        makeEntity({
          id: 'date-later',
          entity_type: 'date',
          title: 'Später',
          starts_at: '2026-08-20T18:00:00.000Z',
        }),
        makeEntity({
          id: 'date-soon',
          entity_type: 'date',
          title: 'Bald',
          starts_at: '2026-08-03T18:00:00.000Z',
        }),
      ],
    })
    expect(hero.id).toBe('date-soon')
    expect(hero.kind).toBe('next_date')
    expect(hero.ctaLabel).toBe('Date ansehen')
  })

  it('wählt die früheste zukünftige geplante Reise', () => {
    const hero = selectHomeHero({
      now,
      entities: [
        makeEntity({
          id: 'trip-b',
          entity_type: 'trip',
          title: 'B',
          starts_at: '2026-09-01T10:00:00.000Z',
        }),
        makeEntity({
          id: 'trip-a',
          entity_type: 'trip',
          title: 'A',
          starts_at: '2026-08-10T10:00:00.000Z',
        }),
      ],
    })
    expect(hero.id).toBe('trip-a')
    expect(hero.kind).toBe('next_trip')
  })

  it('vergleicht Date und Reise korrekt miteinander', () => {
    const hero = selectHomeHero({
      now,
      entities: [
        makeEntity({
          id: 'trip',
          entity_type: 'trip',
          title: 'Reise',
          starts_at: '2026-08-15T10:00:00.000Z',
        }),
        makeEntity({
          id: 'date',
          entity_type: 'date',
          title: 'Date',
          starts_at: '2026-08-05T18:00:00.000Z',
        }),
      ],
    })
    expect(hero.id).toBe('date')
  })

  it('ignoriert Ideen ohne verbindliches Datum', () => {
    const hero = selectHomeHero({
      now,
      entities: [
        makeEntity({
          id: 'leisure',
          entity_type: 'leisure',
          title: 'Date-Idee',
          starts_at: '2026-08-04T18:00:00.000Z',
        }),
        makeEntity({
          id: 'trip-idea',
          entity_type: 'trip',
          title: 'Reiseidee',
          starts_at: null,
          all_day_start: null,
          status: 'draft',
        }),
      ],
    })
    expect(hero.kind).toBe('empty')
  })

  it('ignoriert vergangene, abgesagte und archivierte Einträge', () => {
    const hero = selectHomeHero({
      now,
      entities: [
        makeEntity({
          id: 'past',
          entity_type: 'date',
          title: 'Vergangen',
          starts_at: '2026-07-01T18:00:00.000Z',
        }),
        makeEntity({
          id: 'cancelled',
          entity_type: 'trip',
          title: 'Abgesagt',
          starts_at: '2026-08-10T10:00:00.000Z',
          status: 'cancelled',
        }),
        makeEntity({
          id: 'archived',
          entity_type: 'date',
          title: 'Archiv',
          starts_at: '2026-08-12T18:00:00.000Z',
          status: 'archived',
        }),
      ],
    })
    expect(hero.kind).toBe('empty')
  })

  it('zeigt Empty State wenn nichts geeignet ist', () => {
    const hero = selectHomeHero({ now, entities: [] })
    expect(hero.kind).toBe('empty')
    expect(hero.ctaLabel).toBe('Date oder Reise planen')
    expect(hero.href).toContain('type=date')
  })

  it('behandelt ganztägige Datumswerte deterministisch', () => {
    const hero = selectHomeHero({
      now,
      entities: [
        makeEntity({
          id: 'all-day',
          entity_type: 'trip',
          title: 'Ganztägig',
          all_day_start: '2026-08-08',
        }),
      ],
    })
    expect(hero.id).toBe('all-day')
    expect(hero.kind).toBe('next_trip')
  })

  it('ist deterministisch bei gleicher Startzeit', () => {
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
})
