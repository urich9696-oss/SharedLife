import { describe, expect, it } from 'vitest'
import { outboxMutationSchema } from '@/lib/validation/mutation'

const validMutation = {
  mutationId: '11111111-1111-4111-8111-111111111111',
  deviceId: '22222222-2222-4222-8222-222222222222',
  spaceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  resourceType: 'entity' as const,
  resourceId: '33333333-3333-4333-8333-333333333333',
  operation: 'create' as const,
  expectedVersion: 1,
  payload: { title: 'Test' },
  createdAt: '2026-01-01T12:00:00.000Z',
}

describe('outboxMutationSchema', () => {
  it('accepts a valid mutation envelope', () => {
    const result = outboxMutationSchema.safeParse(validMutation)
    expect(result.success).toBe(true)
  })

  it('rejects invalid UUIDs', () => {
    const result = outboxMutationSchema.safeParse({
      ...validMutation,
      mutationId: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects unknown resource types', () => {
    const result = outboxMutationSchema.safeParse({
      ...validMutation,
      resourceType: 'unknown',
    })
    expect(result.success).toBe(false)
  })

  it('rejects unknown operations', () => {
    const result = outboxMutationSchema.safeParse({
      ...validMutation,
      operation: 'hard_delete',
    })
    expect(result.success).toBe(false)
  })

  it('allows null expectedVersion for related resources', () => {
    const result = outboxMutationSchema.safeParse({
      ...validMutation,
      resourceType: 'checklist_item',
      expectedVersion: null,
    })
    expect(result.success).toBe(true)
  })
})
