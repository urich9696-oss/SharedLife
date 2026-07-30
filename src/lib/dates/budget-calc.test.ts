import { describe, expect, it } from 'vitest'
import type { TransactionRow } from '@/lib/indexed-db/schema'
import { budgetPercentUsed, budgetRemaining, sumTransactions } from '@/lib/dates/budget-calc'

function tx(partial: Partial<TransactionRow>): TransactionRow {
  return {
    id: '1',
    space_id: 'space',
    budget_id: 'budget',
    entity_id: null,
    amount: '10.00',
    currency: 'CHF',
    description: '',
    category: null,
    transaction_date: '2026-01-01',
    paid_by: null,
    is_income: false,
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    ...partial,
  }
}

describe('budget-calc', () => {
  it('sums expense transactions', () => {
    const total = sumTransactions([
      tx({ amount: '10.50' }),
      tx({ id: '2', amount: '5.25' }),
    ])
    expect(total).toBe(15.75)
  })

  it('subtracts income transactions', () => {
    const total = sumTransactions([
      tx({ amount: '100.00' }),
      tx({ id: '2', amount: '25.00', is_income: true }),
    ])
    expect(total).toBe(75)
  })

  it('ignores soft-deleted transactions', () => {
    const total = sumTransactions([
      tx({ amount: '10.00' }),
      tx({ id: '2', amount: '99.00', deleted_at: '2026-01-02T00:00:00Z' }),
    ])
    expect(total).toBe(10)
  })

  it('computes remaining budget', () => {
    expect(budgetRemaining('100.00', 35.5)).toBe(64.5)
    expect(budgetRemaining(null, 35.5)).toBeNull()
  })

  it('computes percent used', () => {
    expect(budgetPercentUsed('200.00', 50)).toBe(25)
    expect(budgetPercentUsed('0.00', 10)).toBe(100)
    expect(budgetPercentUsed(null, 10)).toBeNull()
  })
})
