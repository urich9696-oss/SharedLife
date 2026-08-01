import { describe, expect, it } from 'vitest'
import { localPayloadToDetailColumns } from '@/features/sync/detail-sync-map'

describe('localPayloadToDetailColumns task assignee', () => {
  it('sendet keine Pair-Rollen als UUID nach Supabase', () => {
    const cols = localPayloadToDetailColumns('task', {
      priority: 'high',
      assigneeId: '',
      assigneeRole: 'dennis',
      dueDate: '2026-08-10',
    })
    expect(cols.assignee_id).toBeNull()
    expect(cols.priority).toBe('high')
    expect(cols.due_date).toBe('2026-08-10')
  })

  it('akzeptiert echte Benutzer-UUIDs', () => {
    const cols = localPayloadToDetailColumns('task', {
      priority: 'medium',
      assigneeId: '11111111-1111-4111-8111-111111111111',
      dueDate: '',
    })
    expect(cols.assignee_id).toBe('11111111-1111-4111-8111-111111111111')
    expect(cols.priority).toBe('normal')
  })
})
