import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/indexed-db/db'
import { getOrCreateDeviceId } from '@/lib/indexed-db/device'
import type { BudgetRow, TransactionRow } from '@/lib/indexed-db/schema'
import {
  createBudgetPayloadSchema,
  createTransactionPayloadSchema,
  updateBudgetPayloadSchema,
  updateTransactionPayloadSchema,
  type CreateBudgetPayload,
  type CreateTransactionPayload,
  type UpdateBudgetPayload,
  type UpdateTransactionPayload,
} from '@/lib/validation/budget'
import { enqueueMutation } from '@/features/sync/outbox'

function nowIso(): string {
  return new Date().toISOString()
}

export async function listBudgets(spaceId: string): Promise<BudgetRow[]> {
  return db.budgets
    .where('space_id')
    .equals(spaceId)
    .filter((b) => !b.deleted_at)
    .toArray()
}

export async function listTransactionsForBudget(budgetId: string): Promise<TransactionRow[]> {
  return db.transactions
    .where('budget_id')
    .equals(budgetId)
    .filter((t) => !t.deleted_at)
    .toArray()
}

export async function createBudget(
  payload: CreateBudgetPayload,
  userId: string | null,
): Promise<BudgetRow> {
  const parsed = createBudgetPayloadSchema.parse(payload)
  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  const row: BudgetRow = {
    id: parsed.id,
    space_id: parsed.space_id,
    entity_id: parsed.entity_id ?? null,
    name: parsed.name,
    description: parsed.description ?? null,
    currency: parsed.currency,
    amount_limit: parsed.amount_limit ?? null,
    amount_spent: '0.00',
    period_start: parsed.period_start ?? null,
    period_end: parsed.period_end ?? null,
    created_by: userId,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }

  await db.transaction('rw', [db.budgets, db.outbox], async () => {
    await db.budgets.put(row)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId: row.space_id,
        resourceType: 'budget',
        resourceId: row.id,
        operation: 'create',
        expectedVersion: null,
        payload: parsed as Record<string, unknown>,
        createdAt: now,
      },
      { tx: db },
    )
  })

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const { flushResources } = await import('@/features/sync/sync-engine')
      await flushResources([row.id])
    } catch (err) {
      console.warn('[budgets] flush after create failed', {
        module: 'finances',
        operation: 'createBudget',
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return row
}

export async function updateBudget(
  id: string,
  spaceId: string,
  patch: UpdateBudgetPayload,
): Promise<BudgetRow> {
  const parsed = updateBudgetPayloadSchema.parse(patch)
  const existing = await db.budgets.get(id)
  if (!existing || existing.space_id !== spaceId) {
    throw new Error('Budget nicht gefunden')
  }

  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  const updated: BudgetRow = {
    ...existing,
    ...parsed,
    description: parsed.description !== undefined ? parsed.description : existing.description,
    amount_limit: parsed.amount_limit !== undefined ? parsed.amount_limit : existing.amount_limit,
    period_start: parsed.period_start !== undefined ? parsed.period_start : existing.period_start,
    period_end: parsed.period_end !== undefined ? parsed.period_end : existing.period_end,
    updated_at: now,
  }

  await db.transaction('rw', [db.budgets, db.outbox], async () => {
    await db.budgets.put(updated)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId,
        resourceType: 'budget',
        resourceId: id,
        // Upsert: Update funktioniert auch, wenn das Budget nur lokal existierte
        operation: 'upsert_related',
        expectedVersion: null,
        payload: {
          name: updated.name,
          description: updated.description,
          currency: updated.currency,
          amount_limit: updated.amount_limit,
          period_start: updated.period_start,
          period_end: updated.period_end,
          entity_id: updated.entity_id,
        },
        createdAt: now,
      },
      { tx: db },
    )
  })

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const { flushResources } = await import('@/features/sync/sync-engine')
      await flushResources([id])
    } catch (err) {
      console.warn('[budgets] flush after update failed', {
        module: 'finances',
        operation: 'updateBudget',
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return updated
}

export async function createTransaction(
  payload: CreateTransactionPayload,
  userId: string | null,
): Promise<TransactionRow> {
  const parsed = createTransactionPayloadSchema.parse(payload)
  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  const row: TransactionRow = {
    id: parsed.id,
    space_id: parsed.space_id,
    budget_id: parsed.budget_id ?? null,
    entity_id: parsed.entity_id ?? null,
    amount: parsed.amount,
    currency: parsed.currency,
    description: parsed.description,
    category: parsed.category ?? null,
    transaction_date: parsed.transaction_date,
    paid_by: parsed.paid_by ?? userId,
    is_income: parsed.is_income,
    created_by: userId,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }

  await db.transaction('rw', [db.transactions, db.budgets, db.outbox], async () => {
    await db.transactions.put(row)
    if (row.budget_id && !row.is_income) {
      const budget = await db.budgets.get(row.budget_id)
      if (budget) {
        const spent = (Number(budget.amount_spent) + Number(row.amount)).toFixed(2)
        await db.budgets.put({ ...budget, amount_spent: spent, updated_at: now })
      }
    }
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId: row.space_id,
        resourceType: 'transaction',
        resourceId: row.id,
        operation: 'create',
        expectedVersion: null,
        payload: parsed as Record<string, unknown>,
        createdAt: now,
      },
      { tx: db },
    )
  })

  return row
}

export async function updateTransaction(
  id: string,
  spaceId: string,
  patch: UpdateTransactionPayload,
): Promise<TransactionRow> {
  const parsed = updateTransactionPayloadSchema.parse(patch)
  const existing = await db.transactions.get(id)
  if (!existing || existing.space_id !== spaceId) {
    throw new Error('Transaktion nicht gefunden')
  }

  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  const updated: TransactionRow = {
    ...existing,
    ...parsed,
    category: parsed.category !== undefined ? parsed.category : existing.category,
    paid_by: parsed.paid_by !== undefined ? parsed.paid_by : existing.paid_by,
    budget_id: parsed.budget_id !== undefined ? parsed.budget_id : existing.budget_id,
    updated_at: now,
  }

  await db.transaction('rw', [db.transactions, db.outbox], async () => {
    await db.transactions.put(updated)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId,
        resourceType: 'transaction',
        resourceId: id,
        operation: 'update',
        expectedVersion: null,
        payload: parsed as Record<string, unknown>,
        createdAt: now,
      },
      { tx: db },
    )
  })

  return updated
}
