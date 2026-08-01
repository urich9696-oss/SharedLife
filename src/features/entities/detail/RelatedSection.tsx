import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MediaImage } from '@/features/media/MediaImage'
import { AddRow } from '@/features/entities/detail/AddRow'
import { SectionTitle } from '@/features/entities/detail/MetaList'
import { entityDetailPath } from '@/features/entities/entity-types'
import { db } from '@/lib/indexed-db/db'
import type { EntityRow, EntityType } from '@/lib/indexed-db/schema'

async function relatedByParent(
  spaceId: string,
  parentId: string,
  types: EntityType[],
): Promise<EntityRow[]> {
  const all = await db.entities.where('space_id').equals(spaceId).toArray()
  return all
    .filter(
      (e) =>
        !e.deleted_at &&
        types.includes(e.entity_type) &&
        (e.parent_entity_id === parentId ||
          e.metadata?.belongsToEntityId === parentId ||
          e.metadata?.taskAssignmentEntityId === parentId),
    )
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

async function relatedMoments(spaceId: string, parentId: string): Promise<EntityRow[]> {
  return relatedByParent(spaceId, parentId, ['moment'])
}

async function coversFor(
  spaceId: string,
  entityIds: string[],
): Promise<Record<string, string>> {
  const [links, assets] = await Promise.all([
    db.entityMedia.toArray(),
    db.mediaAssets.where('space_id').equals(spaceId).toArray(),
  ])
  const map: Record<string, string> = {}
  for (const id of entityIds) {
    const sorted = links
      .filter((l) => l.entity_id === id)
      .sort((a, b) => a.sort_order - b.sort_order)
    for (const link of sorted) {
      const asset = assets.find(
        (a) => a.id === link.media_id && !a.deleted_at && a.variant === 'display',
      )
      if (asset) {
        map[id] = asset.storage_path
        break
      }
    }
  }
  return map
}

/** Aufgaben einer Reise / eines Ziels */
export function RelatedTasks({
  spaceId,
  parentId,
  onAdd,
}: {
  spaceId: string
  parentId: string
  onAdd: () => void
}) {
  const { data: tasks = [] } = useQuery({
    queryKey: ['related-tasks', parentId, spaceId],
    queryFn: () => relatedByParent(spaceId, parentId, ['task']),
  })

  return (
    <section className="mb-8">
      <SectionTitle>Aufgaben</SectionTitle>
      {tasks.length > 0 ? (
        <ul className="mb-2 overflow-hidden rounded-lg border border-border/70 bg-surface shadow-xs">
          {tasks.map((task, i) => (
            <li key={task.id} className={i > 0 ? 'border-t border-border/70' : ''}>
              <Link
                to={entityDetailPath('task', task.id)}
                className="flex min-h-14 items-center justify-between gap-4 px-6 py-4"
              >
                <span
                  className={
                    task.status === 'completed'
                      ? 'text-[17px] text-text-muted line-through'
                      : 'text-[17px] text-text'
                  }
                >
                  {task.title}
                </span>
                <span className="text-sm font-medium text-text-muted">
                  {task.status === 'completed' ? 'Erledigt' : 'Offen'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <AddRow label="Aufgabe hinzufügen" onClick={onAdd} />
    </section>
  )
}

/** Dates einer Reise */
export function RelatedDates({
  spaceId,
  parentId,
}: {
  spaceId: string
  parentId: string
}) {
  const { data: dates = [] } = useQuery({
    queryKey: ['related-dates', parentId, spaceId],
    queryFn: () => relatedByParent(spaceId, parentId, ['date']),
  })
  if (dates.length === 0) return null
  return (
    <section className="mb-8">
      <SectionTitle>Dates dieser Reise</SectionTitle>
      <ul className="overflow-hidden rounded-lg border border-border/70 bg-surface shadow-xs">
        {dates.map((d, i) => (
          <li key={d.id} className={i > 0 ? 'border-t border-border/70' : ''}>
            <Link
              to={entityDetailPath('date', d.id)}
              className="flex min-h-14 items-center px-6 py-4 text-[17px] text-text"
            >
              {d.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Momente dieser Reise / dieses Ziels — bilddominant */
export function RelatedMoments({
  spaceId,
  parentId,
  onAdd,
  title = 'Momente',
}: {
  spaceId: string
  parentId: string
  onAdd: () => void
  title?: string
}) {
  const { data: moments = [] } = useQuery({
    queryKey: ['related-moments', parentId, spaceId],
    queryFn: () => relatedMoments(spaceId, parentId),
  })

  const { data: covers = {} } = useQuery({
    queryKey: ['related-moments-covers', parentId, spaceId, moments.map((m) => m.id).join(',')],
    enabled: moments.length > 0,
    queryFn: () => coversFor(spaceId, moments.map((m) => m.id)),
  })

  return (
    <section className="mb-8">
      <SectionTitle>{title}</SectionTitle>
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {moments.map((m) => (
          <Link
            key={m.id}
            to={entityDetailPath('moment', m.id)}
            className="min-w-[9.5rem] snap-start overflow-hidden rounded-lg border border-border/60 bg-surface shadow-xs"
          >
            {covers[m.id] ? (
              <MediaImage
                storagePath={covers[m.id]}
                spaceId={spaceId}
                alt={m.title}
                aspectRatio={4 / 5}
              />
            ) : (
              <div className="aspect-[4/5] bg-pastel-2" />
            )}
            <p className="p-3 text-sm font-bold leading-tight tracking-[-0.02em] text-text">
              {m.title}
            </p>
          </Link>
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-[11rem] min-w-[9.5rem] snap-start flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/80 bg-bg px-3 text-center text-sm font-medium text-primary"
        >
          <span className="text-lg leading-none">+</span>
          Moment hinzufügen
        </button>
      </div>
    </section>
  )
}
