import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns'
import { de } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useAuth } from '@/features/auth/AuthProvider'
import { useEntities } from '@/features/entities/useEntities'
import { entityDetailPath } from '@/features/entities/entity-types'
import { db } from '@/lib/indexed-db/db'
import { cn } from '@/lib/utilities/cn'

const CATEGORY_COLORS = [
  'bg-primary/70',
  'bg-emotional/70',
  'bg-blue/60',
  'bg-orange/70',
  'bg-green/70',
  'bg-sand',
]

function amountOf(value: string | number | null | undefined) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

export function FinanceDashboardPage() {
  const navigate = useNavigate()
  const { spaceId } = useAuth()
  const { data: entities = [], isLoading: entitiesLoading } = useEntities()
  const now = new Date()

  const { data, isLoading } = useQuery({
    queryKey: ['finance-dashboard', spaceId],
    enabled: Boolean(spaceId),
    queryFn: async () => {
      const [budgets, transactions] = await Promise.all([
        db.budgets.where('space_id').equals(spaceId!).toArray(),
        db.transactions.where('space_id').equals(spaceId!).toArray(),
      ])
      return {
        budgets: budgets.filter((b) => !b.deleted_at),
        transactions: transactions.filter((t) => !t.deleted_at),
      }
    },
  })

  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const prevStart = startOfMonth(subMonths(now, 1))
  const prevEnd = endOfMonth(subMonths(now, 1))

  const monthTx = (data?.transactions ?? []).filter((t) => {
    const d = parseISO(t.transaction_date)
    return d >= monthStart && d <= monthEnd
  })
  const prevTx = (data?.transactions ?? []).filter((t) => {
    const d = parseISO(t.transaction_date)
    return d >= prevStart && d <= prevEnd
  })

  const monthTotal = monthTx.reduce((sum, t) => sum + amountOf(t.amount), 0)
  const prevTotal = prevTx.reduce((sum, t) => sum + amountOf(t.amount), 0)

  const byCategoryMap = new Map<string, number>()
  for (const t of monthTx) {
    const key = t.category?.trim() || 'Sonstiges'
    byCategoryMap.set(key, (byCategoryMap.get(key) ?? 0) + amountOf(t.amount))
  }
  const byCategory = [...byCategoryMap.entries()].sort((a, b) => b[1] - a[1])

  const expenseEntities = entities
    .filter((e) => e.entity_type === 'expense' && !e.deleted_at)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 8)

  const savingGoals = entities
    .filter((e) => e.entity_type === 'goal' && !e.deleted_at && e.status === 'active')
    .slice(0, 4)

  if (isLoading || entitiesLoading) return <LoadingState />

  const hasContent =
    (data?.budgets.length ?? 0) > 0 ||
    (data?.transactions.length ?? 0) > 0 ||
    expenseEntities.length > 0

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">Finanzen</p>
          <h1 className="mt-1 font-serif text-3xl text-text">Übersicht</h1>
          <p className="mt-2 text-sm text-text-muted">
            {format(now, 'MMMM yyyy', { locale: de })} · klar und ruhig
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => void navigate('/planen/neu?type=expense')}>
          Ausgabe
        </Button>
      </header>

      {!hasContent ? (
        <EmptyState
          title="Noch keine Finanzen"
          description="Erfasst die erste Ausgabe oder legt ein Budget an."
          actionLabel="Ausgabe erfassen"
          onAction={() => void navigate('/planen/neu?type=expense')}
        />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2">
            <Card padding="lg" className="bg-[linear-gradient(145deg,var(--color-pastel-1),#fffcfa)]">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
                Dieser Monat
              </p>
              <p className="mt-2 font-serif text-4xl text-text">
                {monthTotal.toLocaleString('de-CH', { style: 'currency', currency: 'CHF' })}
              </p>
              <CardDescription className="mt-2">
                Vormonat:{' '}
                {prevTotal.toLocaleString('de-CH', { style: 'currency', currency: 'CHF' })}
              </CardDescription>
            </Card>
            <Card padding="lg">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
                Vergleich
              </p>
              <p className="mt-2 font-serif text-3xl text-text">
                {prevTotal === 0
                  ? '—'
                  : `${Math.round(((monthTotal - prevTotal) / prevTotal) * 100)}%`}
              </p>
              <CardDescription className="mt-2">gegenüber dem Vormonat</CardDescription>
            </Card>
          </section>

          {byCategory.length > 0 ? (
            <section className="rounded-[32px] border border-border/80 bg-surface p-5 shadow-xs">
              <h2 className="font-serif text-2xl text-text">Ausgaben nach Kategorien</h2>
              <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-surface-soft">
                {byCategory.map(([cat, value], i) => (
                  <div
                    key={cat}
                    title={`${cat}: ${value}`}
                    className={cn(CATEGORY_COLORS[i % CATEGORY_COLORS.length])}
                    style={{ width: `${monthTotal > 0 ? (value / monthTotal) * 100 : 0}%` }}
                  />
                ))}
              </div>
              <ul className="mt-4 space-y-2">
                {byCategory.map(([cat, value], i) => (
                  <li key={cat} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'size-2.5 rounded-full',
                          CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                        )}
                      />
                      {cat}
                    </span>
                    <span className="tabular-nums text-text-muted">
                      {value.toLocaleString('de-CH', { style: 'currency', currency: 'CHF' })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {(data?.budgets.length ?? 0) > 0 ? (
            <section>
              <h2 className="mb-3 font-serif text-2xl text-text">Budgets</h2>
              <ul className="space-y-2">
                {data!.budgets.map((budget) => {
                  const limit = amountOf(budget.amount_limit)
                  const spent = amountOf(budget.amount_spent)
                  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0
                  return (
                    <li key={budget.id}>
                      <Card padding="md">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">{budget.name}</CardTitle>
                            <CardDescription>
                              {spent.toLocaleString('de-CH', {
                                style: 'currency',
                                currency: budget.currency || 'CHF',
                              })}
                              {limit
                                ? ` von ${limit.toLocaleString('de-CH', {
                                    style: 'currency',
                                    currency: budget.currency || 'CHF',
                                  })}`
                                : ''}
                            </CardDescription>
                          </div>
                          <span className="text-xs text-text-muted">{Math.round(pct)}%</span>
                        </div>
                        <div className="mt-3">
                          <ProgressBar value={pct} size="sm" />
                        </div>
                      </Card>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          {savingGoals.length > 0 ? (
            <section>
              <h2 className="mb-3 font-serif text-2xl text-text">Sparziele</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {savingGoals.map((goal) => (
                  <li key={goal.id}>
                    <Link to={entityDetailPath('goal', goal.id)}>
                      <Card interactive padding="md">
                        <CardTitle className="text-lg">{goal.title}</CardTitle>
                        <CardDescription>{goal.subtitle || 'Ziel öffnen'}</CardDescription>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="font-serif text-2xl text-text">Timeline</h2>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void navigate('/planen/neu?type=expense')}
              >
                Neu
              </Button>
            </div>
            <ul className="space-y-2">
              {monthTx
                .slice()
                .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
                .slice(0, 12)
                .map((tx) => (
                  <li
                    key={tx.id}
                    className="flex min-h-12 items-center justify-between rounded-[20px] border border-border/70 bg-surface px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-text">
                        {tx.description || tx.category || 'Ausgabe'}
                      </p>
                      <p className="text-xs text-text-muted">
                        {format(parseISO(tx.transaction_date), 'd. MMM', { locale: de })}
                        {tx.category ? ` · ${tx.category}` : ''}
                      </p>
                    </div>
                    <p className="text-sm tabular-nums text-text">
                      {amountOf(tx.amount).toLocaleString('de-CH', {
                        style: 'currency',
                        currency: tx.currency || 'CHF',
                      })}
                    </p>
                  </li>
                ))}
              {expenseEntities.map((entity) => (
                <li key={entity.id}>
                  <Link
                    to={entityDetailPath('expense', entity.id)}
                    className="flex min-h-12 items-center justify-between rounded-[20px] border border-border/70 bg-surface px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-text">{entity.title}</p>
                      <p className="text-xs text-text-muted">Ausgabe</p>
                    </div>
                    <span className="text-xs text-primary">Öffnen</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
