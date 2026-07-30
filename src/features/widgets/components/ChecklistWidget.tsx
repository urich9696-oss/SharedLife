import { toggleChecklistItem } from '@/lib/indexed-db/repositories/checklists'
import type { WidgetProps } from '@/features/widgets/registry'
import { useAuth } from '@/app/providers'
import { useChecklistItems, useChecklists } from '@/features/widgets/use-widget-data'
import { WidgetShell } from '@/features/widgets/components/WidgetShell'

export function ChecklistWidget({ spaceId, entityId, config, title }: WidgetProps<'checklist'>) {
  const { session } = useAuth()
  const resolvedEntityId = config.entityId ?? entityId ?? null
  const { data: checklists = [] } = useChecklists(resolvedEntityId, config.checklistId)
  const checklist = checklists[0]
  const { data: items = [], refetch } = useChecklistItems(checklist?.id)

  const visible = config.showCompleted ? items : items.filter((i) => !i.is_checked)

  const handleToggle = async (id: string, checked: boolean) => {
    await toggleChecklistItem(id, spaceId, checked, session?.userId ?? null)
    await refetch()
  }

  if (!checklist) {
    return <WidgetShell title={title ?? config.title ?? 'Checkliste'} empty="Keine Checkliste." />
  }

  return (
    <WidgetShell title={title ?? config.title ?? checklist.title}>
      {visible.length === 0 ? (
        <p className="text-sm text-text-muted">Alle Punkte erledigt.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.is_checked}
                onChange={(e) => void handleToggle(item.id, e.target.checked)}
                className="size-4 rounded border-border"
              />
              <span className={item.is_checked ? 'text-text-muted line-through' : 'text-text'}>
                {item.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  )
}
