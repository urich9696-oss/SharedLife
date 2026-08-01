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

function amountOf(value: unknown) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

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
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const { data: budget } = useQuery({
    queryKey: ['monthly-budget', spaceId],
    enabled: Boolean(spaceId),
    queryFn: async () => {
      const budgets = await db.budgets.where('space_id').equals(spaceId!).toArray()
      return (
        budgets.find((b) => !b.deleted_at && b.name.toLowerCase() === 'monatsbudget') ??
        budgets.find((b) => !b.deleted_at) ??
        null
      )
    },
  })

  const saveBudget = useMutation({
    mutationFn: async (amount: string) => {
      if (!spaceId) throw new Error('Kein Space')
      const nowIso = new Date().toISOString()
      if (budget) {
        await db.budgets.update(budget.id, {
          amount_limit: amount,
          name: 'Monatsbudget',
          updated_at: nowIso,
        })
        return
      }
      await db.budgets.put({
        id: uuidv4(),
        space_id: spaceId,
        entity_id: null,
        name: 'Monatsbudget',
        description: null,
        currency: 'CHF',
        amount_limit: amount,
        amount_spent: '0',
        period_start: monthStart.toISOString().slice(0, 10),
        period_end: monthEnd.toISOString().slice(0, 10),
        created_by: session?.userId ?? null,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      })
    },
    onSuccess: async () => {
      setShowBudgetEdit(false)
      await queryClient.invalidateQueries({ queryKey: ['monthly-budget', spaceId] })
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
    .reduce((s, e) => s + amountOf(e.metadata?.amount), 0)
  const onceIncome = inMonth
    .filter((e) => e.metadata?.financeKind === 'income' && e.metadata?.recurrence !== 'monthly')
    .reduce((s, e) => s + amountOf(e.metadata?.amount), 0)
  const monthlyExpense = inMonth
    .filter((e) => e.metadata?.financeKind !== 'income' && e.metadata?.recurrence === 'monthly')
    .reduce((s, e) => s + amountOf(e.metadata?.amount), 0)
  const onceExpense = inMonth
    .filter((e) => e.metadata?.financeKind !== 'income' && e.metadata?.recurrence !== 'monthly')
    .reduce((s, e) => s + amountOf(e.metadata?.amount), 0)

  const totalIncome = monthlyIncome + onceIncome
  const totalExpense = monthlyExpense + onceExpense
  const budgetLimit = amountOf(budget?.amount_limit)
  const remaining = budgetLimit - totalExpense + totalIncome

  const byCategoryMap = new Map<string, number>()
  for (const e of inMonth.filter((x) => x.metadata?.financeKind !== 'income')) {
    const key = String(e.metadata?.category || 'Sonstiges')
    byCategoryMap.set(key, (byCategoryMap.get(key) ?? 0) + amountOf(e.metadata?.amount))
  }
  const byCategory = [...byCategoryMap.entries()].sort((a, b) => b[1] - a[1])

  const recent = [...inMonth]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 10)

  if (isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:py-8">
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
                setShowBudgetEdit((v) => !v)
              }}
            >
              {showBudgetEdit ? 'Schließen' : 'Ändern'}
            </button>
          </div>
          <p className="mt-2 font-serif text-3xl text-text">{money(budgetLimit)}</p>
          {showBudgetEdit ? (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!budgetDraft.trim()) return
                saveBudget.mutate(budgetDraft.trim())
              }}
            >
              <Input
                label="Betrag"
                value={budgetDraft}
                onChange={(e) => setBudgetDraft(e.target.value)}
                inputMode="decimal"
              />
              <div className="flex items-end">
                <Button type="submit" loading={saveBudget.isPending}>
                  OK
                </Button>
              </div>
            </form>
          ) : null}
        </Card>
        <Card padding="lg">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
            Restbudget
          </p>
          <p className="mt-2 font-serif text-3xl text-text">{money(remaining)}</p>
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
            <p className="mt-1 font-serif text-xl text-text">{money(item.value)}</p>
          </Card>
        ))}
      </section>

      {byCategory.length > 0 ? (
        <section className="mb-6 rounded-[32px] border border-border/80 bg-surface p-5 shadow-xs">
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
                    {money(amountOf(entity.metadata?.amount))}
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
