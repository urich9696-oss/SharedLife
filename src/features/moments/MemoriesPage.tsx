import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, getYear, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { useAuth } from '@/app/providers'
import { AppHeaderMain } from '@/components/shared/AppHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { Gallery } from '@/features/media/Gallery'
import { MediaImage } from '@/features/media/MediaImage'
import { humanizeMediaTitle } from '@/features/media/media-url'
import { MomentSwipeDeck, type MomentDeckCard } from '@/features/moments/MomentSwipeDeck'
import { TimelineBrowser } from '@/features/timeline/TimelineBrowser'
import { deriveTimelineItems, type TimelineItem } from '@/features/timeline/derive-timeline'
import { db } from '@/lib/indexed-db/db'
import { cn } from '@/lib/utilities/cn'

const MOMENT_TABS = [
  { key: 'deck', label: 'Erleben' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'fotos', label: 'Fotos' },
  { key: 'alben', label: 'Alben' },
  { key: 'favoriten', label: 'Favoriten' },
] as const

type MomentTab = (typeof MOMENT_TABS)[number]['key']

export function MemoriesPage() {
  const navigate = useNavigate()
  const { spaceId } = useAuth()
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab')
  const tab: MomentTab =
    tabParam === 'fotos' ||
    tabParam === 'alben' ||
    tabParam === 'favoriten' ||
    tabParam === 'timeline' ||
    tabParam === 'deck'
      ? tabParam
      : 'deck'
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [browserIndex, setBrowserIndex] = useState<number | null>(null)

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
      const items = deriveTimelineItems({
        entities: entities.filter((e) => !e.deleted_at),
        timelineEntries: entries.filter((e) => !e.deleted_at),
        entityMedia: mediaLinks,
        mediaAssets: assets,
      })
      const gallery = mediaLinks
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
            entityId: link.entity_id,
            favorite: Boolean((asset.metadata as { favorite?: boolean } | null)?.favorite),
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))

      return { items, gallery, entities: entities.filter((e) => !e.deleted_at) }
    },
  })

  const setTab = (next: MomentTab) => {
    const nextParams = new URLSearchParams(params)
    nextParams.set('tab', next)
    setParams(nextParams, { replace: true })
  }

  const albums = useMemo(() => {
    const map = new Map<string, { title: string; count: number; cover?: string; href: string }>()
    for (const entity of data?.entities ?? []) {
      if (!['moment', 'trip', 'date', 'journal'].includes(entity.entity_type)) continue
      const photos = (data?.gallery ?? []).filter((g) => g.entityId === entity.id)
      if (photos.length === 0 && entity.entity_type !== 'moment') continue
      map.set(entity.id, {
        title: entity.title,
        count: photos.length,
        cover: photos[0]?.src,
        href: `/entities/${entity.entity_type}/${entity.id}`,
      })
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
  }, [data])

  const favorites = useMemo(
    () => (data?.gallery ?? []).filter((g) => g.favorite).slice(0, 48),
    [data],
  )

  /** Jedes Bild = eigene Swipe-Card; Tap öffnet immer dieselbe Moment-Detailseite */
  const deckCards = useMemo(() => {
    const entitiesById = new Map((data?.entities ?? []).map((e) => [e.id, e]))
    const fromGallery: MomentDeckCard[] = (data?.gallery ?? []).map((g) => {
      const entity = g.entityId ? entitiesById.get(g.entityId) : undefined
      return {
        id: `media-${g.id}`,
        title: entity?.title || humanizeMediaTitle(g.caption, g.originalFilename),
        occurredAt: g.occurredAt,
        location: entity ? String(entity.metadata?.place ?? '') || null : null,
        storagePath: g.src,
        entityId: g.entityId,
        entityType: entity?.entity_type ?? 'moment',
      }
    })
    if (fromGallery.length > 0) return fromGallery
    return (data?.items ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      occurredAt: item.occurredAt,
      location: item.location,
      storagePath: item.storagePath,
      entityId: item.entityId,
      entityType: item.entityType,
    }))
  }, [data])

  const yearItems = useMemo(() => {
    return (data?.items ?? []).filter((item) => getYear(parseISO(item.occurredAt)) === viewYear)
  }, [data, viewYear])

  const byMonth = useMemo(() => {
    const map = new Map<number, TimelineItem[]>()
    for (const item of yearItems) {
      const month = parseISO(item.occurredAt).getMonth()
      const list = map.get(month) ?? []
      list.push(item)
      map.set(month, list)
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0])
  }, [yearItems])

  const hasContent = (data?.items.length ?? 0) > 0 || (data?.gallery.length ?? 0) > 0
  const timelineItems = data?.items ?? []

  return (
    <div className="mx-auto max-w-3xl">
      <AppHeaderMain
        title="Momente"
        description="Große Bilder. Eure gemeinsame Geschichte."
        action={
          <Button type="button" size="sm" onClick={() => void navigate('/erinnerungen/neu')}>
            Neu
          </Button>
        }
      />

      <div className="px-page pt-[26px] pb-6 lg:pb-8">
        {isLoading ? <LoadingState className="min-h-[40dvh] py-10" /> : null}

        {!isLoading ? (
          <>
      <div
        className="mb-[var(--section-gap)] grid grid-cols-5 gap-1 rounded-[20px] border border-border/80 bg-surface-soft/70 p-1"
        role="tablist"
        aria-label="Momente"
      >
        {MOMENT_TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              'min-h-11 rounded-[14px] px-0.5 text-[10px] font-medium transition sm:text-xs',
              tab === item.key ? 'bg-surface text-text shadow-xs' : 'text-text-muted',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {!hasContent ? (
        <EmptyState
          title="Noch keine Momente"
          description="Haltet besondere Augenblicke fest — mit Foto, Text oder beidem."
          actionLabel="Moment festhalten"
          onAction={() => void navigate('/erinnerungen/neu')}
        />
      ) : null}

      {hasContent && tab === 'deck' && spaceId ? (
        <section className="pb-2">
          <MomentSwipeDeck
            items={deckCards}
            spaceId={spaceId}
            onOpen={(item) => {
              if (item.entityId && item.entityType) {
                void navigate(`/entities/${item.entityType}/${item.entityId}`)
                return
              }
              const idx = timelineItems.findIndex((t) => t.id === item.id)
              setBrowserIndex(idx >= 0 ? idx : 0)
            }}
          />
        </section>
      ) : null}

      {hasContent && tab === 'timeline' ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
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
            <p className="text-sm text-text-muted">Keine Einträge in {viewYear}.</p>
          ) : (
            <div className="space-y-6">
              {byMonth.map(([month, items]) => (
                <div key={month}>
                  <h3 className="mb-2 text-sm font-medium text-primary">
                    {format(new Date(viewYear, month, 1), 'MMMM', { locale: de })}
                  </h3>
                  <ul className="card-stack">
                    {items.map((item) => {
                      const globalIndex = timelineItems.findIndex((t) => t.id === item.id)
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => setBrowserIndex(globalIndex >= 0 ? globalIndex : 0)}
                          >
                            <Card padding="sm" className="flex items-center gap-3">
                              {item.storagePath && spaceId ? (
                                <div className="size-14 shrink-0 overflow-hidden rounded-[16px]">
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
                                <p className="text-xs text-text-muted">
                                  {format(parseISO(item.occurredAt), 'd. MMMM yyyy', { locale: de })}
                                </p>
                              </div>
                            </Card>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <Button type="button" variant="secondary" onClick={() => void navigate('/timeline')}>
            Vollständige Timeline öffnen
          </Button>
        </section>
      ) : null}

      {hasContent && tab === 'fotos' && spaceId ? (
        <section>
          <Gallery items={data!.gallery} spaceId={spaceId} />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data!.gallery.map((item) => (
              <figure key={item.id} className="overflow-hidden rounded-[22px] border border-border/80">
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

      {hasContent && tab === 'alben' ? (
        <section>
          {albums.length === 0 ? (
            <p className="text-sm text-text-muted">Noch keine Alben aus Momenten oder Reisen.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {albums.map((album) => (
                <li key={album.href}>
                  <Link to={album.href}>
                    <Card padding="none" className="overflow-hidden">
                      {album.cover && spaceId ? (
                        <MediaImage
                          storagePath={album.cover}
                          spaceId={spaceId}
                          alt={album.title}
                          aspectRatio={16 / 10}
                        />
                      ) : (
                        <div className="aspect-[16/10] bg-[linear-gradient(145deg,var(--color-pastel-1),var(--color-pastel-2))]" />
                      )}
                      <div className="p-3">
                        <p className="font-medium text-text">{album.title}</p>
                        <p className="text-xs text-text-muted">
                          {album.count} {album.count === 1 ? 'Foto' : 'Fotos'}
                        </p>
                      </div>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {hasContent && tab === 'favoriten' ? (
        <section>
          {favorites.length === 0 ? (
            <p className="text-sm text-text-muted">
              Markierte Favoriten erscheinen hier. Einzelne Erinnerungen bleiben weiterhin Momente.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {favorites.map((item) => (
                <figure key={item.id} className="overflow-hidden rounded-[22px] border border-border/80">
                  {spaceId ? (
                    <MediaImage
                      storagePath={item.src}
                      spaceId={spaceId}
                      alt={humanizeMediaTitle(item.caption, item.originalFilename)}
                      aspectRatio={1}
                    />
                  ) : null}
                </figure>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {browserIndex !== null && spaceId && timelineItems.length > 0 ? (
        <TimelineBrowser
          items={timelineItems}
          index={browserIndex}
          spaceId={spaceId}
          onIndexChange={setBrowserIndex}
          onClose={() => setBrowserIndex(null)}
        />
      ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
