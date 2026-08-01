import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const clear = vi.fn(async () => undefined)
  const count = vi.fn(async () => 2)
  const filter = vi.fn(() => ({ count }))
  const equals = vi.fn(() => ({ filter }))
  const where = vi.fn(() => ({ equals }))
  return { clear, count, filter, equals, where }
})

vi.mock('@/lib/demo', () => ({ DEMO_MODE: true }))
vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}))
vi.mock('@/features/sync/sync-engine', () => ({
  flushOutbox: vi.fn(),
}))
vi.mock('@/lib/indexed-db/device', () => ({
  getOrCreateDeviceId: vi.fn(async () => 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
}))
vi.mock('@/lib/indexed-db/db', () => ({
  db: {
    entities: { where: mocks.where },
    table: vi.fn(() => ({ clear: mocks.clear })),
    outbox: { clear: mocks.clear },
    transaction: vi.fn(async (_mode: string, _tables: unknown[], fn: () => Promise<void>) => fn()),
  },
}))

import { clearSpaceContent } from '@/features/settings/clear-space-content'

describe('clearSpaceContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.count.mockResolvedValue(2)
  })

  it('clears local tables in demo mode', async () => {
    const result = await clearSpaceContent('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', null)
    expect(result.mode).toBe('local')
    expect(result.entityCount).toBe(2)
    expect(result.message).toMatch(/Demo/)
    expect(mocks.clear).toHaveBeenCalled()
  })
})
