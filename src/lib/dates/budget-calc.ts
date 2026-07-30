import type { TransactionRow } from '@/lib/indexed-db/schema'

function parseMoney(value: string): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export function sumTransactions(transactions: TransactionRow[]): number {
  return roundMoney(
    transactions
      .filter((t) => !t.deleted_at)
      .reduce((sum, t) => {
        const amount = parseMoney(t.amount)
        return sum + (t.is_income ? -amount : amount)
      }, 0),
  )
}

export function budgetRemaining(limit: string | null, spent: number): number | null {
  if (limit === null) return null
  return roundMoney(parseMoney(limit) - spent)
}

export function budgetPercentUsed(limit: string | null, spent: number): number | null {
  if (limit === null) return null
  const limitNum = parseMoney(limit)
  if (limitNum <= 0) return spent > 0 ? 100 : 0
  return Math.min(100, Math.max(0, roundMoney((spent / limitNum) * 100)))
}
