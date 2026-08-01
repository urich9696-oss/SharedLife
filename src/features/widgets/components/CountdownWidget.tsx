import { differenceInCalendarDays, differenceInHours, parseISO } from 'date-fns'
import type { WidgetProps } from '@/features/widgets/registry'
import { useEntity } from '@/features/widgets/use-widget-data'
import { WidgetShell } from '@/features/widgets/components/WidgetShell'
import { parseAllDayDate } from '@/lib/dates/timezone'

export function CountdownWidget({ spaceId, entityId, config, title }: WidgetProps<'countdown'>) {
  const resolvedEntityId = config.entityId ?? entityId ?? null
  const { data: entity } = useEntity(spaceId, resolvedEntityId)

  let target: Date | null = null
  if (config.targetField === 'custom' && config.customDate) {
    target = parseISO(config.customDate)
  } else if (entity) {
    if (config.targetField === 'ends_at') {
      if (entity.all_day_end) {
        const raw = entity.all_day_end.includes('T')
          ? entity.all_day_end.slice(0, 10)
          : entity.all_day_end
        target = parseAllDayDate(raw)
      } else if (entity.ends_at) {
        target = parseISO(entity.ends_at)
      }
    } else if (entity.all_day_start) {
      const raw = entity.all_day_start.includes('T')
        ? entity.all_day_start.slice(0, 10)
        : entity.all_day_start
      target = parseAllDayDate(raw)
    } else if (entity.starts_at) {
      target = parseISO(entity.starts_at)
    }
  }

  if (!target || Number.isNaN(target.getTime())) {
    return <WidgetShell title={title ?? config.title ?? 'Countdown'} empty="Kein Zieldatum gesetzt." />
  }

  const now = new Date()
  const days = differenceInCalendarDays(target, now)
  const hours = differenceInHours(target, now) % 24
  const past = days < 0

  return (
    <WidgetShell title={title ?? config.title ?? 'Countdown'} description={entity?.title}>
      <p className="font-numeric text-3xl tabular-nums text-primary">
        {past ? 'Vorbei' : days === 0 ? 'Heute' : `${days}T ${Math.max(0, hours)}h`}
      </p>
      <p className="mt-1 text-sm text-text-muted">
        {past ? 'Seit' : 'Noch bis'}{' '}
        {target.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
    </WidgetShell>
  )
}
