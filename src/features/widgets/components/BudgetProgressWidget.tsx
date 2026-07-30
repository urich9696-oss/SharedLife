import { ProgressBar } from '@/components/ui/ProgressBar'
import { budgetPercentUsed, budgetRemaining, sumTransactions } from '@/lib/dates/budget-calc'
import type { WidgetProps } from '@/features/widgets/registry'
import { useBudgets, useTransactions } from '@/features/widgets/use-widget-data'
import { WidgetShell } from '@/features/widgets/components/WidgetShell'

export function BudgetProgressWidget({
  spaceId,
  entityId,
  config,
  title,
}: WidgetProps<'budget_progress'>) {
  const resolvedEntityId = config.entityId ?? entityId ?? null
  const { data: budgets = [] } = useBudgets(spaceId, resolvedEntityId, config.budgetId)
  const budget = budgets[0]
  const { data: transactions = [] } = useTransactions(spaceId, resolvedEntityId, budget?.id)

  if (!budget) {
    return <WidgetShell title={title ?? config.title ?? 'Budget'} empty="Kein Budget verknüpft." />
  }

  const spent = sumTransactions(transactions)
  const percent = budgetPercentUsed(budget.amount_limit, spent) ?? 0
  const remaining = config.showRemaining ? budgetRemaining(budget.amount_limit, spent) : null

  return (
    <WidgetShell title={title ?? config.title ?? budget.name}>
      <ProgressBar value={percent} label="Ausgaben" showValue />
      <div className="mt-3 flex justify-between text-sm text-text-muted">
        <span>
          {spent.toFixed(2)} {budget.currency}
        </span>
        {remaining !== null ? (
          <span>
            {remaining.toFixed(2)} {budget.currency} übrig
          </span>
        ) : null}
      </div>
    </WidgetShell>
  )
}
