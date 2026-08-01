import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, getYear, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { useAuth } from '@/app/providers'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { Gallery } from '@/features/media/Gallery'
import { MediaImage } from '@/features/media/MediaImage'
import { humanizeMediaTitle } from '@/features/media/media-url'
import { deriveTimelineItems } from '@/features/timeline/derive-timeline'
import { db } from '@/lib/indexed-db/db'

export function MemoriesPage() {
  const navigate = useNavigate()
  const { spaceId } = useAuth()
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())

  const { data, isLoading } = useQuery({
    queryKey: ['memories', spaceId],
    enabled: Boolean(spaceId),
    queryFn: async () => {
      const [entities, entries, mediaLinks, mediaAssets] = await Promise.all([
        db.entities.where('space_id').equals(spaceId!).toArray(),
        db.timelineEntries.where('space_id').equals(spaceId!).toArray(),
        db.entityMedia.toArray(),
        db.mediaAssets.where('space_id').equals(spaceId!).toArray(),
      ])
      const assets = mediaAssets.filter((m) => !m.deleted_at)
      return {
        items: deriveTimelineItems({
          entities: entities.filter((e) => !e.deleted_at),
          timelineEntries: entries.filter((e) => !e.deleted_at),
          entityMedia: mediaLinks,
          mediaAssets: assets,
        }),
        gallery: mediaLinks
          .map((link) => {
            const asset = assets.find((a) => a.id === link.media_id && a.variant === 'display')
            if (!asset) return null
            return {
              id: link.id,
              src: asset.storage_path,
              caption: link.caption,
              originalFilename: asset.original_filename,
              aspectRatio: asset.width && asset.height ? asset.width / asset.height : 4 / 3,
              occurredAt: asset.taken_at ?? asset.created_at,
            }
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
      }
    },
  })

  const onThisDay = useMemo(() => {
    const today = new Date()
    return (data?.items ?? []).filter((item) => {
      const d = parseISO(item.occurredAt)
      return (
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate() &&
        getYear(d) < getYear(today)
      )
    })
  }, [data])

  const yearItems = useMemo(() => {
    return (data?.items ?? []).filter((item) => getYear(parseISO(item.occurredAt)) === viewYear)
  }, [data, viewYear])

  const byMonth = useMemo(() => {
    const map = new Map<number, typeof yearItems>()
    for (const item of yearItems) {
      const month = parseISO(item.occurredAt).getMonth()
      const list = map.get(month) ?? []
      list.push(item)
      map.set(month, list)
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0])
  }, [yearItems])

  if (isLoading) return <LoadingState />

  const hasContent = (data?.items.length ?? 0) > 0 || (data?.gallery.length ?? 0) > 0

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-text">Erinnerungen</h1>
          <p className="mt-2 text-text-muted">
            Festgehaltene Momente, Fotos und Geschichten — euer gemeinsames Tagebuch.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => void navigate('/erinnerungen/neu')}>
          Neu
        </Button>
      </header>

      {!hasContent ? (
        <EmptyState
          title="Noch keine Erinnerungen"
          description="Halte besondere Momente fest — mit Foto, Text oder beidem."
          actionLabel="Erinnerung erstellen"
          onAction={() => void navigate('/erinnerungen/neu')}
        />
      ) : (
        <div className="space-y-8">
          {spaceId && (data?.gallery.length ?? 0) > 0 ? (
            <section>
              <h2 className="mb-3 font-serif text-xl text-text">Fotogalerie</h2>
              <Gallery items={data!.gallery} spaceId={spaceId} horizontal />
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {data!.gallery.slice(0, 9).map((item) => (
                  <figure key={`grid-${item.id}`} className="overflow-hidden rounded-[18px] border border-border">
                    <MediaImage
                      storagePath={item.src}
                      spaceId={spaceId}
                      alt={humanizeMediaTitle(item.caption, item.originalFilename)}
                      aspectRatio={1}
                    />
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          {onThisDay.length > 0 ? (
            <section>
              <h2 className="mb-3 font-serif text-xl text-text">Heute vor einem Jahr</h2>
              <ul className="space-y-2">
                {onThisDay.map((item) => (
                  <li key={item.id}>
                    <Card padding="sm" className="flex gap-3">
                      {item.storagePath && spaceId ? (
                        <div className="size-16 shrink-0 overflow-hidden rounded-xl">
                          <MediaImage
                            storagePath={item.storagePath}
                            spaceId={spaceId}
                            alt={item.title}
                            aspectRatio={1}
                          />
                        </div>
                      ) : null}
                      <div>
                        <p className="font-medium text-text">{item.title}</p>
                        <p className="text-xs text-text-muted">
                          {format(parseISO(item.occurredAt), 'd. MMMM yyyy', { locale: de })}
                        </p>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-xl text-text">Jahresrückblick {viewYear}</h2>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setViewYear((y) => y - 1)}>
                  ←
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setViewYear((y) => y + 1)}>
                  →
                </Button>
              </div>
            </div>
            {byMonth.length === 0 ? (
              <p className="text-sm text-text-muted">Keine Erinnerungen in {viewYear}.</p>
            ) : (
              <div className="space-y-6">
                {byMonth.map(([month, items]) => (
                  <div key={month}>
                    <h3 className="mb-2 text-sm font-medium text-primary">
                      {format(new Date(viewYear, month, 1), 'MMMM', { locale: de })}
                    </h3>
                    <ul className="space-y-2">
                      {items.slice(0, 8).map((item) => (
                        <li key={item.id}>
                          <Card padding="sm" className="flex items-center gap-3">
                            {item.storagePath && spaceId ? (
                              <div className="size-12 shrink-0 overflow-hidden rounded-lg">
                                <MediaImage
                                  storagePath={item.storagePath}
                                  spaceId={spaceId}
                                  alt={item.title}
                                  aspectRatio={1}
                                />
                              </div>
                            ) : null}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-text">{item.title}</p>
                              {item.entityId ? (
                                <Link
                                  to={`/entities/moment/${item.entityId}`}
                                  className="text-xs text-primary"
                                >
                                  Öffnen
                                </Link>
                              ) : null}
                            </div>
                          </Card>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <Button type="button" variant="secondary" onClick={() => void navigate('/timeline')}>
              Zur Zeitleiste
            </Button>
          </section>
        </div>
      )}
    </div>
  )
}
