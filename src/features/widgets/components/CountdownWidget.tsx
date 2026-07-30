import { differenceInDays, differenceInHours, parseISO } from 'date-fns'
import type { WidgetProps } from '@/features/widgets/registry'
import { useEntity } from '@/features/widgets/use-widget-data'
import { WidgetShell } from '@/features/widgets/components/WidgetShell'

export function CountdownWidget({ spaceId, entityId, config, title }: WidgetProps<'countdown'>) {
  const resolvedEntityId = config.entityId ?? entityId ?? null
  const { data: entity } = useEntity(spaceId, resolvedEntityId)

  let target: Date | null = null
  if (config.targetField === 'custom' && config.customDate) {
    target = parseISO(config.customDate)
  } else if (entity) {
    const field = config.targetField === 'ends_at' ? entity.ends_at : entity.starts_at
    if (field) target = parseISO(field)
  }

  if (!target || Number.isNaN(target.getTime())) {
    return <WidgetShell title={title ?? config.title ?? 'Countdown'} empty="Kein Zieldatum gesetzt." />
  }

  const now = new Date()
  const days = differenceInDays(target, now)
  const hours = differenceInHours(target, now) % 24
  const past = target < now

  return (
    <WidgetShell title={title ?? config.title ?? 'Countdown'} description={entity?.title}>
      <p className="text-3xl font-serif tabular-nums text-primary">
        {past ? 'Vorbei' : `${days}T ${hours}h`}
      </p>
      <p className="mt-1 text-sm text-text-muted">
        {past ? 'Seit' : 'Noch bis'}{' '}
        {target.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
    </WidgetShell>
  )
}
