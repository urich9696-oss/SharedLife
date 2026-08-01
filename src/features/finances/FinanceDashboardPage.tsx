import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns'
import { de } from 'date-fns/locale'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { useEntities } from '@/features/entities/useEntities'
import { entityDetailPath } from '@/features/entities/entity-types'
import { createBudget, listBudgets } from '@/lib/indexed-db/repositories/budgets'
import { normalizeMoneyInput, parseMoneyAmount } from '@/lib/money'
import { cn } from '@/lib/utilities/cn'

const CATEGORY_COLORS = [
  'bg-primary/70',
  'bg-emotional/70',
  'bg-blue/60',
  'bg-orange/70',
  'bg-green/70',
  'bg-sand',
]

function money(value: number) {
  return value.toLocaleString('de-CH', { style: 'currency', currency: 'CHF' })
}

export function FinanceDashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { spaceId, session } = useAuth()
  const { data: entities = [], isLoading } = useEntities()
  const [budgetDraft, setBudgetDraft] = useState('')
  const [showBudgetEdit, setShowBudgetEdit] = useState(false)
  const [budgetError, setBudgetError] = useState<string | null>(null)
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const { data: budget } = useQuery({
    queryKey: ['monthly-budget', spaceId],
    enabled: Boolean(spaceId),
    queryFn: async () => {
      const budgets = await listBudgets(spaceId!)
      return (
        budgets.find((b) => b.name.toLowerCase() === 'monatsbudget') ??
        budgets[0] ??
        null
      )
    },
  })

  const saveBudget = useMutation({
    mutationFn: async (rawAmount: string) => {
      if (!spaceId) throw new Error('Kein Space')
      const amount = normalizeMoneyInput(rawAmount)
      if (!amount) {
        throw new Error('Ungültiger Betrag — z. B. 3500 oder 3500.50')
      }

      // create = Upsert über Sync — auch wenn ein lokales Budget noch nie remote lag
      await createBudget(
        {
          id: budget?.id ?? uuidv4(),
          space_id: spaceId,
          name: 'Monatsbudget',
          currency: 'CHF',
          amount_limit: amount,
          period_start: format(monthStart, 'yyyy-MM-dd'),
          period_end: format(monthEnd, 'yyyy-MM-dd'),
        },
        session?.userId ?? null,
      )
    },
    onSuccess: async () => {
      setBudgetError(null)
      setShowBudgetEdit(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['monthly-budget', spaceId] }),
        queryClient.invalidateQueries({ queryKey: ['budgets', spaceId] }),
      ])
    },
    onError: (err) => {
      setBudgetError(err instanceof Error ? err.message : 'Budget konnte nicht gespeichert werden')
    },
  })

  const financeEntities = entities.filter((e) => e.entity_type === 'expense' && !e.deleted_at)

  const inMonth = financeEntities.filter((e) => {
    const raw = e.all_day_start ?? e.starts_at?.slice(0, 10)
    if (!raw) return true
    const d = parseISO(raw)
    return d >= monthStart && d <= monthEnd
  })

  const monthlyIncome = inMonth
    .filter((e) => e.metadata?.financeKind === 'income' && e.metadata?.recurrence === 'monthly')
    .reduce((s, e) => s + parseMoneyAmount(e.metadata?.amount), 0)
  const onceIncome = inMonth
    .filter((e) => e.metadata?.financeKind === 'income' && e.metadata?.recurrence !== 'monthly')
    .reduce((s, e) => s + parseMoneyAmount(e.metadata?.amount), 0)
  const monthlyExpense = inMonth
    .filter((e) => e.metadata?.financeKind !== 'income' && e.metadata?.recurrence === 'monthly')
    .reduce((s, e) => s + parseMoneyAmount(e.metadata?.amount), 0)
  const onceExpense = inMonth
    .filter((e) => e.metadata?.financeKind !== 'income' && e.metadata?.recurrence !== 'monthly')
    .reduce((s, e) => s + parseMoneyAmount(e.metadata?.amount), 0)

  const totalIncome = monthlyIncome + onceIncome
  const totalExpense = monthlyExpense + onceExpense
  const budgetLimit = parseMoneyAmount(budget?.amount_limit)
  const remaining = budgetLimit - totalExpense + totalIncome

  const byCategoryMap = new Map<string, number>()
  for (const e of inMonth.filter((x) => x.metadata?.financeKind !== 'income')) {
    const key = String(e.metadata?.category || 'Sonstiges')
    byCategoryMap.set(key, (byCategoryMap.get(key) ?? 0) + parseMoneyAmount(e.metadata?.amount))
  }
  const byCategory = [...byCategoryMap.entries()].sort((a, b) => b[1] - a[1])

  const recent = [...inMonth]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 10)

  if (isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-4xl px-page py-6 lg:py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-text">Finanzen</h1>
          <p className="mt-2 text-sm text-text-muted">
            {format(now, 'MMMM yyyy', { locale: de })}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => void navigate('/planen/neu?type=expense')}
        >
          Eintrag
        </Button>
      </header>

      <section className="mb-4 grid gap-3 sm:grid-cols-2">
        <Card padding="lg" className="bg-[linear-gradient(145deg,var(--color-pastel-1),#fffcfa)]">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
              Monatsbudget
            </p>
            <button
              type="button"
              className="text-xs font-medium text-primary"
              onClick={() => {
                setBudgetDraft(budget?.amount_limit ?? '')
                setBudgetError(null)
                setShowBudgetEdit((v) => !v)
              }}
            >
              {showBudgetEdit ? 'Schließen' : 'Ändern'}
            </button>
          </div>
          <p className="font-numeric mt-4 text-3xl tracking-[-0.03em] text-text">
            {money(budgetLimit)}
          </p>
          {showBudgetEdit ? (
            <form
              className="mt-3 flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!budgetDraft.trim()) return
                saveBudget.mutate(budgetDraft.trim())
              }}
            >
              <div className="flex gap-2">
                <Input
                  label="Betrag"
                  value={budgetDraft}
                  onChange={(e) => setBudgetDraft(e.target.value)}
                  inputMode="decimal"
                  placeholder="z. B. 3500"
                  error={budgetError ?? undefined}
                />
                <div className="flex items-end">
                  <Button type="submit" loading={saveBudget.isPending}>
                    OK
                  </Button>
                </div>
              </div>
            </form>
          ) : null}
        </Card>
        <Card padding="lg">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
            Restbudget
          </p>
          <p className="font-numeric mt-4 text-3xl tracking-[-0.03em] text-text">
            {money(remaining)}
          </p>
          <CardDescription className="mt-2">
            Einnahmen {money(totalIncome)} · Ausgaben {money(totalExpense)}
          </CardDescription>
        </Card>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3">
        {[
          { label: 'Monatliche Einnahmen', value: monthlyIncome },
          { label: 'Einmalige Einnahmen', value: onceIncome },
          { label: 'Monatliche Ausgaben', value: monthlyExpense },
          { label: 'Einmalige Ausgaben', value: onceExpense },
        ].map((item) => (
          <Card key={item.label} padding="md">
            <p className="text-xs text-text-muted">{item.label}</p>
            <p className="font-numeric mt-2 text-xl tracking-[-0.02em] text-text">
              {money(item.value)}
            </p>
          </Card>
        ))}
      </section>

      {byCategory.length > 0 ? (
        <section className="mb-6 rounded-lg border border-border/80 bg-surface p-5 shadow-xs">
          <h2 className="font-serif text-2xl text-text">Ausgaben nach Kategorien</h2>
          <div className="mt-5 flex justify-center">
            <CategoryPie total={totalExpense} slices={byCategory} />
          </div>
          <ul className="mt-4 space-y-2">
            {byCategory.map(([cat, value], i) => (
              <li key={cat} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className={cn('size-2.5 rounded-full', CATEGORY_COLORS[i % CATEGORY_COLORS.length])} />
                  {cat}
                </span>
                <span className="tabular-nums text-text-muted">{money(value)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-serif text-2xl text-text">Letzte Einträge</h2>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void navigate('/planen/neu?type=expense')}
          >
            Neu
          </Button>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title="Noch keine Einträge"
            description="Erfasst Einnahmen und Ausgaben — monatlich oder einmalig."
            actionLabel="Eintrag erstellen"
            onAction={() => void navigate('/planen/neu?type=expense')}
          />
        ) : (
          <ul className="space-y-2">
            {recent.map((entity) => (
              <li key={entity.id}>
                <Link
                  to={entityDetailPath('expense', entity.id)}
                  className="flex min-h-12 items-center justify-between rounded-[20px] border border-border/70 bg-surface px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-text">{entity.title}</p>
                    <p className="text-xs text-text-muted">
                      {entity.metadata?.financeKind === 'income' ? 'Einnahme' : 'Ausgabe'}
                      {entity.metadata?.recurrence === 'monthly' ? ' · monatlich' : ' · einmalig'}
                      {entity.metadata?.paidBy ? ` · ${String(entity.metadata.paidBy)}` : ''}
                    </p>
                  </div>
                  <p className="text-sm tabular-nums text-text">
                    {money(parseMoneyAmount(entity.metadata?.amount))}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function CategoryPie({
  total,
  slices,
}: {
  total: number
  slices: Array<[string, number]>
}) {
  if (total <= 0) return null
  const colors = [
    'var(--color-primary)',
    'var(--color-emotional)',
    'var(--color-blue)',
    'var(--color-orange)',
    'var(--color-green)',
    'var(--color-sand)',
  ]
  let cursor = 0
  const stops: string[] = []
  slices.forEach(([, value], i) => {
    const start = cursor
    const end = cursor + (value / total) * 100
    stops.push(`${colors[i % colors.length]} ${start}% ${end}%`)
    cursor = end
  })

  return (
    <div
      className="relative size-36 rounded-full"
      style={{ background: `conic-gradient(${stops.join(', ')})` }}
      role="img"
      aria-label="Kuchendiagramm Ausgaben"
    >
      <div className="absolute inset-8 rounded-full bg-surface" />
    </div>
  )
}
