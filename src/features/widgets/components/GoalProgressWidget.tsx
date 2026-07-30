import { ProgressBar } from '@/components/ui/ProgressBar'
import { getGoalProgressFromPayload } from '@/features/home/relevance'
import type { WidgetProps } from '@/features/widgets/registry'
import { useEntity, useEntityDetail } from '@/features/widgets/use-widget-data'
import { WidgetShell } from '@/features/widgets/components/WidgetShell'

export function GoalProgressWidget({ spaceId, entityId, config, title }: WidgetProps<'goal_progress'>) {
  const resolvedEntityId = config.entityId ?? entityId ?? null
  const { data: entity } = useEntity(spaceId, resolvedEntityId)
  const { data: detail } = useEntityDetail(resolvedEntityId, 'goal')

  const payload = (detail?.payload as Record<string, unknown> | undefined) ?? null
  const percent = getGoalProgressFromPayload(payload) ?? 0

  return (
    <WidgetShell title={title ?? config.title ?? entity?.title ?? 'Ziel'}>
      <ProgressBar value={percent} showValue label="Fortschritt" />
      {config.showMotivation && percent < 100 ? (
        <p className="mt-2 text-sm text-text-muted">Weiter so — ihr seid auf dem richtigen Weg!</p>
      ) : null}
    </WidgetShell>
  )
}
