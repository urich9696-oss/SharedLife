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
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Gallery } from '@/features/media/Gallery'
import { MediaImage } from '@/features/media/MediaImage'
import { humanizeMediaTitle } from '@/features/media/media-url'
import { MomentSwipeDeck, type MomentDeckCard } from '@/features/moments/MomentSwipeDeck'
import { momentDisplayTitle } from '@/features/home/recent-moments'
import { TimelineBrowser } from '@/features/timeline/TimelineBrowser'
import { deriveMomentChronicle, type TimelineItem } from '@/features/timeline/derive-timeline'
import { db } from '@/lib/indexed-db/db'
import { cn } from '@/lib/utilities/cn'

const MOMENT_TABS = [
  { key: 'momente', label: 'Momente' },
  { key: 'fotos', label: 'Fotos' },
  { key: 'alben', label: 'Alben' },
] as const

type MomentTab = (typeof MOMENT_TABS)[number]['key']

function resolveTab(raw: string | null): MomentTab {
  if (raw === 'fotos' || raw === 'alben') return raw
  // Legacy: deck / weg / timeline / favoriten → Momente
  return 'momente'
}

export function MemoriesPage() {
  const navigate = useNavigate()
  const { spaceId } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = resolveTab(params.get('tab'))
  const [photosFilter, setPhotosFilter] = useState<'all' | 'favorites'>('all')
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [browserIndex, setBrowserIndex] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['memories-v8', spaceId],
    enabled: Boolean(spaceId),
    queryFn: async () => {
      const [entities, entries, details, mediaLinks, mediaAssets] = await Promise.all([
        db.entities.where('space_id').equals(spaceId!).toArray(),
        db.timelineEntries.where('space_id').equals(spaceId!).toArray(),
        db.entityDetails.toArray(),
        db.entityMedia.toArray(),
        db.mediaAssets.where('space_id').equals(spaceId!).toArray(),
      ])
      const activeEntities = entities.filter((e) => !e.deleted_at)
      const momentIds = new Set(
        activeEntities.filter((e) => e.entity_type === 'moment').map((e) => e.id),
      )
      const assets = mediaAssets.filter((m) => !m.deleted_at)
      const items = deriveMomentChronicle({
        entities: activeEntities,
        entityDetails: details,
        timelineEntries: entries.filter((e) => !e.deleted_at),
        entityMedia: mediaLinks,
        mediaAssets: assets,
      })
      const gallery = mediaLinks
        .filter((link) => momentIds.has(link.entity_id))
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

      return {
        items,
        gallery,
        entities: activeEntities.filter((e) => e.entity_type === 'moment'),
      }
    },
  })

  const setTab = (next: MomentTab) => {
    const nextParams = new URLSearchParams(params)
    if (next === 'momente') nextParams.delete('tab')
    else nextParams.set('tab', next)
    setParams(nextParams, { replace: true })
    if (next !== 'fotos') setPhotosFilter('all')
  }

  const albums = useMemo(() => {
    const map = new Map<string, { title: string; count: number; cover?: string; href: string }>()
    for (const entity of data?.entities ?? []) {
      const photos = (data?.gallery ?? []).filter((g) => g.entityId === entity.id)
      map.set(entity.id, {
        title: momentDisplayTitle(entity.title),
        count: photos.length,
        cover: photos[0]?.src,
        href: `/entities/moment/${entity.id}`,
      })
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
  }, [data])

  const photoItems = useMemo(() => {
    const gallery = data?.gallery ?? []
    if (photosFilter === 'favorites') return gallery.filter((g) => g.favorite)
    return gallery
  }, [data, photosFilter])

  const deckCards = useMemo(() => {
    const entitiesById = new Map((data?.entities ?? []).map((e) => [e.id, e]))
    const fromGallery: MomentDeckCard[] = (data?.gallery ?? []).map((g) => {
      const entity = g.entityId ? entitiesById.get(g.entityId) : undefined
      return {
        id: `media-${g.id}`,
        title: momentDisplayTitle(entity?.title) || humanizeMediaTitle(g.caption, g.originalFilename),
        occurredAt: g.occurredAt,
        location: entity ? String(entity.metadata?.place ?? '') || null : null,
        storagePath: g.src,
        entityId: g.entityId,
        entityType: 'moment',
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
      entityType: item.entityType ?? 'moment',
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
  const favoriteCount = (data?.gallery ?? []).filter((g) => g.favorite).length

  return (
    <div className="mx-auto max-w-3xl">
      <AppHeaderMain
        title="Momente"
        description="Gemeinsam Erlebtes — bewusst festgehalten."
      />

      <div className="px-page pt-[26px] pb-6 lg:pb-8">
        {isLoading ? <LoadingState className="min-h-[40dvh] py-10" /> : null}

        {!isLoading ? (
          <>
            <SegmentedControl
              className="mb-[var(--section-gap)]"
              ariaLabel="Momente"
              options={MOMENT_TABS.map((item) => ({ key: item.key, label: item.label }))}
              value={tab}
              onChange={setTab}
            />

            {!hasContent ? (
              <EmptyState
                title="Noch keine Momente"
                description="Haltet besondere Augenblicke fest — mit Foto, Text oder beidem. Nutzt den Plus-Button."
                actionLabel="Moment festhalten"
                onAction={() => void navigate('/planen/neu?type=moment')}
              />
            ) : null}

            {hasContent && tab === 'momente' ? (
              <section className="space-y-6">
                {spaceId && deckCards.length > 0 ? (
                  <MomentSwipeDeck
                    items={deckCards}
                    spaceId={spaceId}
                    onOpen={(item) => {
                      if (item.entityId) {
                        void navigate(`/entities/moment/${item.entityId}`)
                        return
                      }
                      const idx = timelineItems.findIndex((t) => t.id === item.id)
                      setBrowserIndex(idx >= 0 ? idx : 0)
                    }}
                  />
                ) : null}

                <div>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-text">
                      Unser gemeinsamer Weg
                    </h2>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Vorheriges Jahr"
                        onClick={() => setViewYear((y) => y - 1)}
                      >
                        ←
                      </Button>
                      <span className="min-w-12 text-center text-sm text-text-muted">{viewYear}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Nächstes Jahr"
                        onClick={() => setViewYear((y) => y + 1)}
                      >
                        →
                      </Button>
                    </div>
                  </div>

                  {byMonth.length === 0 ? (
                    <p className="text-sm text-text-muted">Keine Momente in {viewYear}.</p>
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
                                    onClick={() => {
                                      if (item.entityId) {
                                        void navigate(`/entities/moment/${item.entityId}`)
                                        return
                                      }
                                      setBrowserIndex(globalIndex >= 0 ? globalIndex : 0)
                                    }}
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
                                        <p className="truncate text-[16px] font-medium text-text">
                                          {item.title}
                                        </p>
                                        <p className="text-[13px] text-text-muted">
                                          {format(parseISO(item.occurredAt), 'd. MMMM yyyy', {
                                            locale: de,
                                          })}
                                          {item.location ? ` · ${item.location}` : ''}
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
                </div>
              </section>
            ) : null}

            {hasContent && tab === 'fotos' && spaceId ? (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <button
                    type="button"
                    className={cn(
                      'min-h-11 rounded-[16px] px-3 text-sm font-medium transition',
                      photosFilter === 'all'
                        ? 'bg-primary/12 text-primary'
                        : 'bg-surface-soft text-text-muted',
                    )}
                    onClick={() => setPhotosFilter('all')}
                  >
                    Alle
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'min-h-11 rounded-[16px] px-3 text-sm font-medium transition',
                      photosFilter === 'favorites'
                        ? 'bg-primary/12 text-primary'
                        : 'bg-surface-soft text-text-muted',
                    )}
                    onClick={() => setPhotosFilter('favorites')}
                  >
                    Favoriten{favoriteCount > 0 ? ` · ${favoriteCount}` : ''}
                  </button>
                </div>

                {photoItems.length === 0 ? (
                  <p className="text-sm text-text-muted">
                    {photosFilter === 'favorites'
                      ? 'Noch keine Favoriten markiert.'
                      : 'Noch keine Fotos zu Momenten.'}
                  </p>
                ) : (
                  <>
                    <Gallery items={photoItems} spaceId={spaceId} />
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {photoItems.map((item) => (
                        <figure
                          key={item.id}
                          className="overflow-hidden rounded-[22px] border border-border/80"
                        >
                          <MediaImage
                            storagePath={item.src}
                            spaceId={spaceId}
                            alt={humanizeMediaTitle(item.caption, item.originalFilename)}
                            aspectRatio={1}
                          />
                        </figure>
                      ))}
                    </div>
                  </>
                )}
              </section>
            ) : null}

            {hasContent && tab === 'alben' ? (
              <section>
                {albums.length === 0 ? (
                  <p className="text-sm text-text-muted">Noch keine Alben aus Momenten.</p>
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
