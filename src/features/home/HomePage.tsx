import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  endOfDay,
  format,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns'
import { de } from 'date-fns/locale'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { VORHABEN_TYPES } from '@/features/content/content-map'
import { entityDetailPath, getEntityTypeMeta } from '@/features/entities/entity-types'
import { formatEntityDateRange } from '@/features/entities/entity-date-utils'
import { useEntities, useReminders } from '@/features/entities/useEntities'
import { selectHomeHero } from '@/features/home/hero'
import { MediaImage } from '@/features/media/MediaImage'
import { daysTogether, usePairProfile } from '@/features/space/pair-profile'
import { deriveTimelineItems } from '@/features/timeline/derive-timeline'
import { db } from '@/lib/indexed-db/db'
import type { EntityRow } from '@/lib/indexed-db/schema'
import { cn } from '@/lib/utilities/cn'

function entityStart(entity: EntityRow): Date | null {
  if (entity.starts_at) return parseISO(entity.starts_at)
  if (entity.all_day_start) return parseISO(entity.all_day_start)
  return null
}

function isTodayRelevant(entity: EntityRow, now: Date): boolean {
  if (entity.deleted_at || entity.status === 'cancelled' || entity.status === 'archived') return false
  const start = entityStart(entity)
  const end = entity.ends_at
    ? parseISO(entity.ends_at)
    : entity.all_day_end
      ? parseISO(entity.all_day_end)
      : null

  if (entity.entity_type === 'task' && entity.status === 'active') {
    if (!start) return false
    return isSameDay(start, now) || isBefore(start, endOfDay(now))
  }

  if (['event', 'date', 'trip', 'milestone'].includes(entity.entity_type) && start) {
    if (isSameDay(start, now)) return true
    if (end && !isBefore(end, startOfDay(now)) && !isBefore(endOfDay(now), start)) return true
  }

  return false
}

const QUICK_ACTIONS = [
  { key: 'einkauf', label: 'Einkauf', path: '/einkauf?focus=1', hint: 'Artikel' },
  { key: 'aufgabe', label: 'Aufgabe', path: '/planen/neu?type=task', hint: 'Erstellen' },
  { key: 'termin', label: 'Termin', path: '/planen/neu?type=event', hint: 'Planen' },
  { key: 'moment', label: 'Moment', path: '/erinnerungen/neu', hint: 'Festhalten' },
] as const

export function HomePage() {
  const navigate = useNavigate()
  const { spaceId } = useAuth()
  const { data: pair } = usePairProfile()
  const { data: entities = [], isLoading } = useEntities()
  const { data: reminders = [] } = useReminders()
  const now = useMemo(() => new Date(), [])
  const together = daysTogether(pair?.togetherSince ?? null, now)

  const { data: mediaByEntityId = {} } = useQuery({
    queryKey: ['home-entity-covers', spaceId],
    enabled: Boolean(spaceId),
    queryFn: async () => {
      const [links, assets] = await Promise.all([
        db.entityMedia.toArray(),
        db.mediaAssets.where('space_id').equals(spaceId!).toArray(),
      ])
      const display = assets.filter((m) => !m.deleted_at && m.variant === 'display')
      const map: Record<string, string> = {}
      for (const link of links.sort((a, b) => a.sort_order - b.sort_order)) {
        if (map[link.entity_id]) continue
        const asset = display.find((a) => a.id === link.media_id)
        if (asset) map[link.entity_id] = asset.storage_path
      }
      return map
    },
  })

  const hero = useMemo(
    () =>
      selectHomeHero({
        now,
        entities,
        mediaByEntityId,
        pairCoverPath: pair?.coverMediaPath ?? null,
        partnerAName: pair?.partnerAName,
        partnerBName: pair?.partnerBName,
        togetherDays: together,
        coupleBlurb: pair?.coupleBlurb,
      }),
    [now, entities, mediaByEntityId, pair, together],
  )

  const todayItems = useMemo(() => {
    const todayEntities = entities
      .filter((e) => isTodayRelevant(e, now))
      .filter((e) => e.id !== hero.entityId)
      .slice(0, 6)
      .map((e) => ({
        id: e.id,
        label: e.title,
        meta: getEntityTypeMeta(e.entity_type).label,
        href: entityDetailPath(e.entity_type, e.id) as string | null,
      }))

    const todayReminders = reminders
      .filter((r) => !r.deleted_at && r.is_active && isSameDay(parseISO(r.remind_at), now))
      .slice(0, 3)
      .map((r) => ({
        id: r.id,
        label: r.title,
        meta: 'Erinnerung',
        href: null as string | null,
      }))

    return [...todayEntities, ...todayReminders]
  }, [entities, reminders, now, hero.entityId])

  const upcoming = useMemo(
    () =>
      entities
        .filter((e) => {
          if (e.deleted_at || e.status === 'cancelled' || e.status === 'archived') return false
          if (hero.entityId && e.id === hero.entityId) return false
          if (![...VORHABEN_TYPES, 'event' as const].includes(e.entity_type)) return false
          const start = entityStart(e)
          return start !== null && !isBefore(start, startOfDay(now))
        })
        .sort((a, b) => (entityStart(a)?.getTime() ?? 0) - (entityStart(b)?.getTime() ?? 0))
        .slice(0, 4),
    [entities, hero.entityId, now],
  )

  const { data: latestMoment } = useQuery({
    queryKey: ['home-latest-moment', spaceId],
    enabled: Boolean(spaceId),
    queryFn: async () => {
      const [ents, entries, mediaLinks, mediaAssets] = await Promise.all([
        db.entities.where('space_id').equals(spaceId!).toArray(),
        db.timelineEntries.where('space_id').equals(spaceId!).toArray(),
        db.entityMedia.toArray(),
        db.mediaAssets.where('space_id').equals(spaceId!).toArray(),
      ])
      const items = deriveTimelineItems({
        entities: ents.filter((e) => !e.deleted_at),
        timelineEntries: entries.filter((e) => !e.deleted_at),
        entityMedia: mediaLinks,
        mediaAssets: mediaAssets.filter((m) => !m.deleted_at),
      })
      return items[0] ?? null
    },
  })

  if (isLoading) return <LoadingState />

  const hasAnyContent =
    entities.length > 0 || reminders.some((r) => !r.deleted_at) || Boolean(latestMoment)

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 lg:py-8">
      <section className="mb-5 overflow-hidden rounded-[22px] border border-border bg-surface shadow-sm">
        <Link
          to={hero.href}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="relative aspect-[16/10] max-h-64 w-full">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#e7efe4,transparent_45%),radial-gradient(circle_at_80%_30%,#f3e4df,transparent_40%),linear-gradient(135deg,#f6f2ec,#efe8df)]" />
            {hero.mediaPath ? (
              <MediaImage
                storagePath={hero.mediaPath}
                alt={hero.title}
                className="absolute inset-0 rounded-none"
                aspectRatio={16 / 10}
                lazy={false}
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-text/55 via-text/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-surface sm:p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-surface/80">
                {hero.kind === 'emotional_fallback' ? 'SharedLife' : 'Jetzt relevant'}
              </p>
              <p className="mt-1 font-serif text-2xl sm:text-3xl">{hero.title}</p>
              <p className="mt-1 text-sm text-surface/90">{hero.subtitle}</p>
              <span className="mt-3 inline-flex min-h-10 items-center rounded-full bg-surface/95 px-4 text-sm font-medium text-text">
                {hero.ctaLabel}
              </span>
            </div>
          </div>
        </Link>
      </section>

      {!hasAnyContent ? (
        <EmptyState
          title="Willkommen zu Hause"
          description="Startet mit einem Moment, einem Termin oder dem gemeinsamen Einkauf."
          actionLabel="Einkauf öffnen"
          onAction={() => void navigate('/einkauf')}
        />
      ) : (
        <>
          {todayItems.length > 0 ? (
            <section className="mb-6">
              <div className="mb-3 flex items-end justify-between">
                <h2 className="font-serif text-xl text-text">Heute</h2>
                <Link to="/planen?tab=kalender" className="text-sm font-medium text-primary">
                  Alle anzeigen
                </Link>
              </div>
              <ul className="overflow-hidden rounded-[20px] border border-border bg-surface shadow-xs">
                {todayItems.slice(0, 4).map((item) => (
                  <li key={item.id} className="border-b border-border/70 last:border-b-0">
                    {item.href ? (
                      <Link
                        to={item.href}
                        className="flex min-h-12 items-center justify-between gap-3 px-4 py-3"
                      >
                        <span className="text-sm text-text">{item.label}</span>
                        <span className="shrink-0 text-xs text-text-muted">{item.meta}</span>
                      </Link>
                    ) : (
                      <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-3">
                        <span className="text-sm text-text">{item.label}</span>
                        <span className="shrink-0 text-xs text-text-muted">{item.meta}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mb-6">
            <h2 className="mb-3 font-serif text-xl text-text">Schnellzugriffe</h2>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.key}
                  to={action.path}
                  className={cn(
                    'flex min-h-[5.5rem] flex-col justify-between rounded-[18px] border border-border bg-surface p-3',
                    'text-left shadow-xs transition duration-200 active:scale-[0.98] hover:-translate-y-0.5',
                  )}
                >
                  <span className="text-sm font-medium text-text">{action.label}</span>
                  <span className="text-xs text-text-muted">{action.hint}</span>
                </Link>
              ))}
            </div>
          </section>

          {upcoming.length > 0 ? (
            <section className="mb-6">
              <div className="mb-3 flex items-end justify-between">
                <h2 className="font-serif text-xl text-text">Als Nächstes</h2>
                <Link to="/planen?tab=vorhaben" className="text-sm font-medium text-primary">
                  Vorhaben
                </Link>
              </div>
              <ul className="flex flex-col gap-2">
                {upcoming.map((entity) => {
                  const meta = getEntityTypeMeta(entity.entity_type)
                  return (
                    <li key={entity.id}>
                      <Link to={entityDetailPath(entity.entity_type, entity.id)}>
                        <Card interactive padding="md">
                          <p className="text-xs font-medium text-primary">{meta.label}</p>
                          <CardTitle className="mt-1 text-base">{entity.title}</CardTitle>
                          <CardDescription>
                            {formatEntityDateRange(entity) || meta.label}
                          </CardDescription>
                        </Card>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          {latestMoment && spaceId ? (
            <section className="mb-2">
              <div className="mb-3 flex items-end justify-between">
                <h2 className="font-serif text-xl text-text">Letzter gemeinsamer Moment</h2>
                <Link to="/erinnerungen" className="text-sm font-medium text-primary">
                  Momente
                </Link>
              </div>
              <Link to="/timeline">
                <Card padding="none" className="overflow-hidden transition hover:-translate-y-0.5">
                  {latestMoment.storagePath ? (
                    <MediaImage
                      storagePath={latestMoment.storagePath}
                      spaceId={spaceId}
                      alt={latestMoment.title}
                      aspectRatio={16 / 10}
                    />
                  ) : (
                    <div className="aspect-[16/10] bg-[linear-gradient(135deg,#e7efe4,#f3e4df)]" />
                  )}
                  <div className="p-4">
                    <CardTitle>{latestMoment.title}</CardTitle>
                    <CardDescription>
                      {format(parseISO(latestMoment.occurredAt), 'd. MMMM yyyy', { locale: de })}
                    </CardDescription>
                  </div>
                </Card>
              </Link>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
