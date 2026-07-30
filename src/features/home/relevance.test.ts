import { describe, expect, it } from 'vitest'
import type { EntityRow } from '@/lib/indexed-db/schema'
import {
  getCountdownTarget,
  getGreeting,
  getGoalProgressFromPayload,
  getNextEvent,
  getRecentWishes,
  scoreEntityForHome,
} from '@/features/home/relevance'

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

describe('relevance', () => {
  const now = new Date('2026-07-30T12:00:00.000Z')

  it('scores upcoming events higher', () => {
    const soon = makeEntity({
      entity_type: 'event',
      starts_at: '2026-07-30T18:00:00.000Z',
    })
    const later = makeEntity({
      id: '2',
      entity_type: 'event',
      starts_at: '2026-08-30T18:00:00.000Z',
    })
    expect(scoreEntityForHome(soon, { now })).toBeGreaterThan(scoreEntityForHome(later, { now }))
  })

  it('returns next event', () => {
    const entities = [
      makeEntity({ id: 'a', starts_at: '2026-08-01T10:00:00.000Z' }),
      makeEntity({ id: 'b', starts_at: '2026-07-31T10:00:00.000Z' }),
    ]
    expect(getNextEvent(entities, now)?.id).toBe('b')
  })

  it('computes countdown days', () => {
    const entities = [
      makeEntity({ entity_type: 'trip', starts_at: '2026-08-02T10:00:00.000Z' }),
    ]
    const countdown = getCountdownTarget(entities, now)
    expect(countdown?.days).toBeGreaterThanOrEqual(2)
    expect(countdown?.days).toBeLessThanOrEqual(3)
  })

  it('parses goal progress payload', () => {
    expect(
      getGoalProgressFromPayload({ progressKind: 'percent', current: 25, target: 100 }),
    ).toBe(25)
  })

  it('returns recent wishes', () => {
    const entities = [
      makeEntity({ entity_type: 'wish', id: 'w1', created_at: '2026-07-01T00:00:00.000Z' }),
      makeEntity({ entity_type: 'wish', id: 'w2', created_at: '2026-07-29T00:00:00.000Z' }),
    ]
    expect(getRecentWishes(entities)[0]?.id).toBe('w2')
  })

  it('builds greeting with display name', () => {
    expect(getGreeting(now, 'Lea')).toBe('Guten Tag, Lea')
  })
})
