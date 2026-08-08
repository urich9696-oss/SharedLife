import { describe, expect, it } from 'vitest'
import {
  selectAnticipationItems,
  selectSharedHighlight,
  selectTodayForUs,
  selectTimelinePreview,
  timelinePreviewTypeLabel,
  todaySectionEmptyKind,
} from '@/features/home/home-dashboard'
import type { TimelineItem } from '@/features/timeline/derive-timeline'
import type { EntityRow, ReminderRow } from '@/lib/indexed-db/schema'

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

describe('home dashboard sections (V7)', () => {
  const now = new Date('2026-08-08T12:00:00.000Z')

  it('blendet Heute-Liste aus wenn nichts ansteht (leeres Ergebnis)', () => {
    const items = selectTodayForUs({
      entities: [entity({ id: 'w1', entity_type: 'wish', title: 'Kamera' })],
      reminders: [],
      now,
    })
    expect(items).toEqual([])
    expect(
      todaySectionEmptyKind({
        todayItems: items,
        entities: [entity({ id: 'w1', entity_type: 'wish', title: 'Kamera' })],
        reminders: [],
        now,
      }),
    ).toBe('calm')
  })

  it('markiert Heute als durch Hero abgedeckt statt ruhig', () => {
    const date = entity({
      id: 'd1',
      entity_type: 'date',
      title: 'Dinner',
      starts_at: '2026-08-08T18:00:00.000Z',
    })
    const todayItems = selectTodayForUs({
      entities: [date],
      reminders: [],
      now,
      excludeEntityId: 'd1',
    })
    expect(todayItems).toEqual([])
    expect(
      todaySectionEmptyKind({
        todayItems,
        entities: [date],
        reminders: [],
        now,
      }),
    ).toBe('covered_by_hero')
  })

  it('schließt Hero-Entity aus Vorfreude aus', () => {
    const items = selectAnticipationItems({
      entities: [
        entity({
          id: 'd1',
          entity_type: 'date',
          title: 'Hero Date',
          starts_at: '2026-08-10T18:00:00.000Z',
        }),
        entity({
          id: 't1',
          entity_type: 'trip',
          title: 'Nächste Reise',
          starts_at: '2026-08-20T08:00:00.000Z',
        }),
      ],
      now,
      excludeEntityId: 'd1',
    })
    expect(items.map((i) => i.id)).toEqual(['t1'])
  })

  it('liefert Highlight nur bei echten Daten', () => {
    expect(selectSharedHighlight({ entities: [] })).toBeNull()
    const withGoal = selectSharedHighlight({
      entities: [entity({ id: 'g1', entity_type: 'goal', title: 'Wohnung' })],
      detailProgress: { g1: 40 },
    })
    expect(withGoal?.kind).toBe('goal_progress')
    expect(withGoal?.progress).toBe(40)
  })

  it('Timeline-Vorschau behält echte Typ-Labels', () => {
    const items: TimelineItem[] = [
      {
        id: 'entity:t1',
        title: 'Paris',
        occurredAt: '2026-06-01T00:00:00.000Z',
        kind: 'trip',
        sourceType: 'entity',
        sourceLabel: 'Reise',
        entityId: 't1',
        entityType: 'trip',
      },
      {
        id: 'entity:d1',
        title: 'Dinner',
        occurredAt: '2026-05-01T00:00:00.000Z',
        kind: 'date',
        sourceType: 'entity',
        sourceLabel: 'Date',
        entityId: 'd1',
        entityType: 'date',
      },
    ]
    const preview = selectTimelinePreview(items, { limit: 2 })
    expect(timelinePreviewTypeLabel(preview[0]!)).toBe('Reise')
    expect(timelinePreviewTypeLabel(preview[1]!)).toBe('Date')
    expect(timelinePreviewTypeLabel(preview[0]!)).not.toBe('Moment')
  })

  it('nimmt heutige Erinnerungen in Heute für uns auf', () => {
    const reminder: ReminderRow = {
      id: 'rem1',
      space_id: SPACE,
      entity_id: null,
      title: 'Blumen holen',
      body: null,
      remind_at: '2026-08-08T09:00:00.000Z',
      next_trigger_at: null,
      timezone: 'Europe/Zurich',
      is_active: true,
      recurrence_rule: null,
      notify_push: true,
      notify_in_app: true,
      created_by: null,
      assigned_to: null,
      last_triggered_at: null,
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-01T00:00:00.000Z',
      deleted_at: null,
    }
    const items = selectTodayForUs({
      entities: [],
      reminders: [reminder],
      now,
    })
    expect(items[0]?.label).toBe('Blumen holen')
    expect(items[0]?.meta).toBe('Erinnerung')
  })
})
