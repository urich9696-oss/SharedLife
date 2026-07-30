import type { WidgetProps } from '@/features/widgets/registry'
import { useTransactions } from '@/features/widgets/use-widget-data'
import { formatDateDe } from '@/features/widgets/components/widget-format'
import { WidgetShell } from '@/features/widgets/components/WidgetShell'

export function ExpensesOverviewWidget({
  spaceId,
  entityId,
  config,
  title,
}: WidgetProps<'expenses_overview'>) {
  const resolvedEntityId = config.entityId ?? entityId ?? null
  const { data: transactions = [] } = useTransactions(spaceId, resolvedEntityId, config.budgetId)
  const items = transactions.slice(0, config.limit)

  return (
    <WidgetShell title={title ?? config.title ?? 'Ausgaben'}>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">Keine Transaktionen.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-2 text-sm">
              <div>
                <p className="font-medium text-text">{t.description}</p>
                <p className="text-text-muted">{formatDateDe(t.transaction_date)}</p>
              </div>
              <span className="tabular-nums text-text">
                {t.is_income ? '+' : '−'}
                {Number(t.amount).toFixed(2)} {t.currency}
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  )
}
