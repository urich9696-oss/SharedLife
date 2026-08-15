import { describe, expect, it } from 'vitest'
import type { EntityRow } from '@/lib/indexed-db/schema'
import { getNextPlannedDateOrTrip, selectHomeHero } from '@/features/home/hero'

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

describe('getNextPlannedDateOrTrip', () => {
  const now = new Date('2026-08-15T12:00:00.000Z')

  it('zeigt zukünftige geplante Reise (status draft = Geplant)', () => {
    const hero = getNextPlannedDateOrTrip({
      now,
      entitiesLoaded: true,
      entities: [
        makeEntity({
          id: 'trip-planned',
          entity_type: 'trip',
          title: 'Griechenland',
          status: 'draft',
          all_day_start: '2026-09-20',
          all_day_end: '2026-09-30',
        }),
      ],
    })
    expect(hero.kind).toBe('next_trip')
    expect(hero.id).toBe('trip-planned')
    expect(hero.ctaLabel).toBe('Reise ansehen')
  })

  it('nächste Reise gewinnt gegen ein späteres Date', () => {
    const hero = getNextPlannedDateOrTrip({
      now,
      entitiesLoaded: true,
      entities: [
        makeEntity({
          id: 'date-later',
          entity_type: 'date',
          title: 'Späteres Date',
          status: 'active',
          starts_at: '2026-10-01T18:00:00.000Z',
        }),
        makeEntity({
          id: 'trip-soon',
          entity_type: 'trip',
          title: 'Baldige Reise',
          status: 'draft',
          all_day_start: '2026-08-25',
        }),
      ],
    })
    expect(hero.id).toBe('trip-soon')
    expect(hero.kind).toBe('next_trip')
  })

  it('früheres Date gewinnt gegen eine spätere Reise', () => {
    const hero = getNextPlannedDateOrTrip({
      now,
      entitiesLoaded: true,
      entities: [
        makeEntity({
          id: 'trip-later',
          entity_type: 'trip',
          title: 'Später',
          status: 'active',
          starts_at: '2026-09-15T10:00:00.000Z',
        }),
        makeEntity({
          id: 'date-soon',
          entity_type: 'date',
          title: 'Bald',
          status: 'active',
          starts_at: '2026-08-18T18:00:00.000Z',
        }),
      ],
    })
    expect(hero.id).toBe('date-soon')
    expect(hero.kind).toBe('next_date')
  })

  it('Reiseidee ohne Planung wird ausgeschlossen', () => {
    const hero = getNextPlannedDateOrTrip({
      now,
      entitiesLoaded: true,
      entities: [
        makeEntity({
          id: 'idea',
          entity_type: 'trip',
          title: 'Irgendwann Island',
          status: 'draft',
          starts_at: null,
          all_day_start: null,
        }),
        makeEntity({
          id: 'leisure',
          entity_type: 'leisure',
          title: 'Date-Idee',
          starts_at: '2026-08-20T18:00:00.000Z',
        }),
      ],
    })
    expect(hero.kind).toBe('empty')
  })

  it('abgesagte oder vergangene Reise wird ausgeschlossen', () => {
    const hero = getNextPlannedDateOrTrip({
      now,
      entitiesLoaded: true,
      entities: [
        makeEntity({
          id: 'cancelled',
          entity_type: 'trip',
          title: 'Abgesagt',
          status: 'cancelled',
          all_day_start: '2026-09-01',
        }),
        makeEntity({
          id: 'past',
          entity_type: 'trip',
          title: 'Vorbei',
          status: 'active',
          all_day_start: '2026-07-01',
          all_day_end: '2026-07-10',
        }),
        makeEntity({
          id: 'completed',
          entity_type: 'trip',
          title: 'Erledigt',
          status: 'completed',
          all_day_start: '2026-09-01',
        }),
      ],
    })
    expect(hero.kind).toBe('empty')
  })

  it('date-only-Startdatum wird lokal korrekt behandelt', () => {
    // all_day_start morgen — darf nicht durch UTC-Mitternacht als „vergangen“ gelten
    const localNow = new Date(2026, 7, 15, 22, 30, 0) // 15. Aug 22:30 lokal
    const hero = getNextPlannedDateOrTrip({
      now: localNow,
      entitiesLoaded: true,
      entities: [
        makeEntity({
          id: 'all-day-tomorrow',
          entity_type: 'trip',
          title: 'Ganztägig morgen',
          status: 'draft',
          all_day_start: '2026-08-16',
        }),
      ],
    })
    expect(hero.kind).toBe('next_trip')
    expect(hero.id).toBe('all-day-tomorrow')
  })

  it('während des Ladens erscheint kein falscher Empty State', () => {
    const hero = getNextPlannedDateOrTrip({
      now,
      entitiesLoaded: false,
      entities: [],
    })
    expect(hero.kind).toBe('loading')
    expect(hero.kind).not.toBe('empty')
  })

  it('ist deterministisch bei gleicher Startzeit', () => {
    const entities = [
      makeEntity({
        id: 'b-trip',
        entity_type: 'trip',
        title: 'B',
        status: 'draft',
        starts_at: '2026-08-20T10:00:00.000Z',
      }),
      makeEntity({
        id: 'a-trip',
        entity_type: 'trip',
        title: 'A',
        status: 'draft',
        starts_at: '2026-08-20T10:00:00.000Z',
      }),
    ]
    const first = getNextPlannedDateOrTrip({ now, entitiesLoaded: true, entities })
    const second = getNextPlannedDateOrTrip({
      now,
      entitiesLoaded: true,
      entities: [...entities].reverse(),
    })
    expect(first.id).toBe(second.id)
    expect(first.id).toBe('a-trip')
  })

  it('selectHomeHero bleibt als Alias kompatibel', () => {
    const hero = selectHomeHero({
      now,
      entities: [
        makeEntity({
          id: 't1',
          entity_type: 'trip',
          title: 'Trip',
          status: 'draft',
          all_day_start: '2026-09-01',
        }),
      ],
    })
    expect(hero.kind).toBe('next_trip')
  })
})
