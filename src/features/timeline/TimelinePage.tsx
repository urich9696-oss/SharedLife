import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { useAuth } from '@/app/providers'
import { Card } from '@/components/ui/Card'
import { LoadingState } from '@/components/ui/LoadingState'
import { deriveTimelineItems, type TimelineItem } from '@/features/timeline/derive-timeline'
import { db } from '@/lib/indexed-db/db'

export function TimelinePage() {
  const { spaceId } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['timeline-derived', spaceId],
    enabled: Boolean(spaceId),
    queryFn: async () => {
      const [entities, entries, mediaLinks, mediaAssets] = await Promise.all([
        db.entities.where('space_id').equals(spaceId!).toArray(),
        db.timelineEntries.where('space_id').equals(spaceId!).toArray(),
        db.entityMedia.toArray(),
        db.mediaAssets.where('space_id').equals(spaceId!).toArray(),
      ])
      return deriveTimelineItems({
        entities: entities.filter((e) => !e.deleted_at),
        timelineEntries: entries.filter((e) => !e.deleted_at),
        entityMedia: mediaLinks,
        mediaAssets: mediaAssets.filter((m) => !m.deleted_at),
      })
    },
  })

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineItem[]>()
    for (const item of data ?? []) {
      const key = format(parseISO(item.occurredAt), 'yyyy-MM')
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [data])

  if (isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-heading">Zeitleiste</h1>
        <p className="mt-2 text-text-muted">
          Abgeleitet aus Momenten, Reisen, Terminen, Meilensteinen und Medien — ohne Inhaltsduplikate.
        </p>
      </header>

      {grouped.length === 0 ? (
        <Card padding="md" className="text-center text-sm text-text-muted">
          Noch keine Einträge in der Zeitleiste.
        </Card>
      ) : (
        <div className="space-y-8">
          {grouped.map(([monthKey, items]) => {
            const d = parseISO(`${monthKey}-01`)
            return (
              <section key={monthKey}>
                <h2 className="mb-4 font-serif text-xl text-text">
                  {format(d, 'MMMM yyyy', { locale: de })}
                </h2>
                <ol className="space-y-3">
                  {items.map((item) => (
                    <li key={item.id}>
                      <Card padding="sm">
                        <p className="text-sm font-medium text-text">{item.title}</p>
                        <p className="text-xs text-text-muted">
                          {item.sourceLabel} · {format(parseISO(item.occurredAt), 'd. MMM yyyy', { locale: de })}
                        </p>
                        {item.subtitle ? (
                          <p className="mt-1 text-sm text-text-muted">{item.subtitle}</p>
                        ) : null}
                      </Card>
                    </li>
                  ))}
                </ol>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
