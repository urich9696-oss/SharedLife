import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { useAuth } from '@/app/providers'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { MediaImage } from '@/features/media/MediaImage'
import { TimelineBrowser } from '@/features/timeline/TimelineBrowser'
import {
  deriveTimelineItems,
  timelineKindLabel,
  type TimelineItem,
} from '@/features/timeline/derive-timeline'
import { createTimelineEntry } from '@/features/timeline/timeline-entries'
import { db } from '@/lib/indexed-db/db'
import { cn } from '@/lib/utilities/cn'

export function TimelinePage() {
  const { spaceId, session } = useAuth()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [browserIndex, setBrowserIndex] = useState<number | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    if (params.get('compose') === '1') {
      setComposeOpen(true)
      const next = new URLSearchParams(params)
      next.delete('compose')
      setParams(next, { replace: true })
    }
  }, [params, setParams])

  const { data = [], isLoading } = useQuery({
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
    for (const item of data) {
      const key = format(parseISO(item.occurredAt), 'yyyy-MM')
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [data])

  const createEntry = useMutation({
    mutationFn: async () => {
      if (!spaceId) throw new Error('Kein Space')
      if (!title.trim()) throw new Error('Titel erforderlich')
      await createTimelineEntry({
        spaceId,
        title: title.trim(),
        body: body.trim() || null,
        occurredAt: `${date}T12:00:00.000Z`,
        userId: session?.userId ?? null,
      })
    },
    onSuccess: () => {
      setComposeOpen(false)
      setTitle('')
      setBody('')
      void queryClient.invalidateQueries({ queryKey: ['timeline-derived', spaceId] })
      void queryClient.invalidateQueries({ queryKey: ['home-timeline', spaceId] })
    },
  })

  if (isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Unsere Geschichte</p>
          <h1 className="font-serif text-3xl text-text">Timeline</h1>
          <p className="mt-2 text-text-muted">
            Die gemeinsame Geschichte von euch beiden — bildorientiert und chronologisch.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setComposeOpen(true)}>
          Ereignis
        </Button>
      </header>

      {composeOpen ? (
        <form
          className="mb-8 space-y-3 rounded-[20px] border border-border bg-surface p-4 shadow-xs"
          onSubmit={(e) => {
            e.preventDefault()
            createEntry.mutate()
          }}
        >
          <h2 className="font-medium text-text">Manuelles Ereignis</h2>
          <input
            className="min-h-11 w-full rounded-[14px] border border-border bg-bg px-3"
            placeholder="Titel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            type="date"
            className="min-h-11 w-full rounded-[14px] border border-border bg-bg px-3"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <textarea
            className="min-h-24 w-full rounded-[14px] border border-border bg-bg px-3 py-2"
            placeholder="Kurze Beschreibung"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="submit" loading={createEntry.isPending}>
              Speichern
            </Button>
            <Button type="button" variant="secondary" onClick={() => setComposeOpen(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      ) : null}

      {grouped.length === 0 ? (
        <EmptyState
          title="Noch keine Geschichte"
          description="Momente, Reisen und Erinnerungen erscheinen hier automatisch — oder halte ein Ereignis manuell fest."
          actionLabel="Ereignis hinzufügen"
          onAction={() => setComposeOpen(true)}
        />
      ) : (
        <div className="relative space-y-10">
          <div
            className="pointer-events-none absolute bottom-0 left-5 top-2 w-px bg-border md:left-1/2"
            aria-hidden
          />

          {grouped.map(([monthKey, items]) => {
            const d = parseISO(`${monthKey}-01`)
            return (
              <section key={monthKey} className="relative">
                <h2 className="mb-5 pl-12 font-serif text-xl text-text md:pl-0 md:text-center">
                  {format(d, 'MMMM yyyy', { locale: de })}
                </h2>
                <ol className="space-y-6">
                  {items.map((item, itemIndex) => {
                    const globalIndex = data.findIndex((x) => x.id === item.id)
                    const desktopSide = itemIndex % 2 === 0 ? 'left' : 'right'
                    return (
                      <li key={item.id} className="relative">
                        <span
                          className="absolute left-[1.05rem] top-8 z-10 size-3 rounded-full border-2 border-primary bg-surface md:left-1/2 md:-translate-x-1/2"
                          aria-hidden
                        />
                        <button
                          type="button"
                          onClick={() => setBrowserIndex(globalIndex)}
                          className={cn(
                            'ml-12 w-[calc(100%-3rem)] text-left transition duration-200 hover:-translate-y-0.5 md:ml-0 md:w-[46%]',
                            desktopSide === 'left' ? 'md:mr-auto md:pr-8' : 'md:ml-auto md:pl-8',
                          )}
                        >
                          <article className="overflow-hidden rounded-[20px] border border-border bg-surface shadow-xs">
                            <MediaImage
                              storagePath={item.storagePath}
                              spaceId={spaceId ?? undefined}
                              alt={item.title}
                              aspectRatio={16 / 10}
                              fallbackLabel="Moment"
                            />
                            <div className="space-y-1.5 p-4">
                              <p className="text-xs font-medium uppercase tracking-wide text-primary">
                                {timelineKindLabel(item.kind)}
                              </p>
                              <h3 className="font-serif text-xl text-text">{item.title}</h3>
                              <p className="text-xs text-text-muted">
                                {format(parseISO(item.occurredAt), 'd. MMMM yyyy', { locale: de })}
                                {item.location ? ` · ${item.location}` : ''}
                              </p>
                              {item.body || item.subtitle ? (
                                <p className="line-clamp-3 text-sm text-text-muted">
                                  {item.body || item.subtitle}
                                </p>
                              ) : null}
                            </div>
                          </article>
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </section>
            )
          })}
        </div>
      )}

      {browserIndex !== null && spaceId ? (
        <TimelineBrowser
          items={data}
          index={browserIndex}
          spaceId={spaceId}
          onIndexChange={setBrowserIndex}
          onClose={() => setBrowserIndex(null)}
        />
      ) : null}
    </div>
  )
}
