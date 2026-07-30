import type { WidgetProps } from '@/features/widgets/registry'
import { useNotes } from '@/features/widgets/use-widget-data'
import { WidgetShell } from '@/features/widgets/components/WidgetShell'

export function NoteCardWidget({ entityId, config, title }: WidgetProps<'note_card'>) {
  const resolvedEntityId = config.entityId ?? entityId ?? null
  const { data: notes = [] } = useNotes(resolvedEntityId, config.noteId)
  const note = notes[0]

  if (!note) {
    return <WidgetShell title={title ?? config.title ?? 'Notiz'} empty="Keine Notiz vorhanden." />
  }

  const lines = note.content.split('\n').slice(0, config.maxLines)

  return (
    <WidgetShell title={title ?? config.title ?? 'Notiz'}>
      <div
        className="text-sm text-text whitespace-pre-wrap"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: config.maxLines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {lines.join('\n')}
      </div>
    </WidgetShell>
  )
}
