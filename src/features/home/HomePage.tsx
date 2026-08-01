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
import { motion } from 'motion/react'
import { HeroCard } from '@/components/ui/HeroCard'
import { ProgressCard } from '@/components/ui/ProgressCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { entityDetailPath, getEntityTypeMeta } from '@/features/entities/entity-types'
import { useEntities, useReminders } from '@/features/entities/useEntities'
import { selectHomeHero } from '@/features/home/hero'
import { MediaImage } from '@/features/media/MediaImage'
import { daysTogether, usePairProfile } from '@/features/space/pair-profile'
import { deriveTimelineItems } from '@/features/timeline/derive-timeline'
import { db } from '@/lib/indexed-db/db'
import type { EntityRow } from '@/lib/indexed-db/schema'

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

const fadeUp = {
  initial: { opacity: 0, y: 8, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
}

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

  const { data: detailProgress = {} } = useQuery({
    queryKey: ['home-progress', spaceId],
    enabled: Boolean(spaceId),
    queryFn: async () => {
      const details = await db.entityDetails.toArray()
      const map: Record<string, number> = {}
      for (const d of details) {
        if (d.detail_type === 'goal' || d.detail_type === 'project') {
          const payload = d.payload ?? {}
          const percent =
            d.detail_type === 'goal'
              ? Number(payload.current ?? payload.progressPercent ?? 0)
              : Number(payload.progressPercent ?? 0)
          const target = Number(payload.target ?? 100) || 100
          map[d.entity_id] =
            d.detail_type === 'goal' && payload.progressKind === 'amount'
              ? Math.min(100, Math.round((Number(payload.current ?? 0) / target) * 100))
              : Math.min(100, Math.max(0, percent))
        }
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
      .slice(0, 4)
      .map((e) => ({
        id: e.id,
        label: e.title,
        meta: getEntityTypeMeta(e.entity_type).label,
        href: entityDetailPath(e.entity_type, e.id) as string | null,
      }))

    const todayReminders = reminders
      .filter((r) => !r.deleted_at && r.is_active && isSameDay(parseISO(r.remind_at), now))
      .slice(0, 2)
      .map((r) => ({
        id: r.id,
        label: r.title,
        meta: 'Erinnerung',
        href: null as string | null,
      }))

    return [...todayEntities, ...todayReminders].slice(0, 4)
  }, [entities, reminders, now, hero.entityId])

  const activeGoals = useMemo(
    () =>
      entities
        .filter((e) => e.entity_type === 'goal' && !e.deleted_at && e.status === 'active')
        .slice(0, 6)
        .map((e) => ({
          id: e.id,
          title: e.title,
          href: entityDetailPath('goal', e.id),
          progress: detailProgress[e.id] ?? 0,
        })),
    [entities, detailProgress],
  )

  const activeTrips = useMemo(
    () =>
      entities
        .filter(
          (e) =>
            e.entity_type === 'trip' &&
            !e.deleted_at &&
            (e.status === 'active' || e.status === 'draft'),
        )
        .sort((a, b) => (entityStart(a)?.getTime() ?? 0) - (entityStart(b)?.getTime() ?? 0))
        .slice(0, 4),
    [entities],
  )

  const { data: recentMoments = [] } = useQuery({
    queryKey: ['home-recent-moments', spaceId],
    enabled: Boolean(spaceId),
    queryFn: async () => {
      const [ents, entries, mediaLinks, mediaAssets] = await Promise.all([
        db.entities.where('space_id').equals(spaceId!).toArray(),
        db.timelineEntries.where('space_id').equals(spaceId!).toArray(),
        db.entityMedia.toArray(),
        db.mediaAssets.where('space_id').equals(spaceId!).toArray(),
      ])
      return deriveTimelineItems({
        entities: ents.filter((e) => !e.deleted_at),
        timelineEntries: entries.filter((e) => !e.deleted_at),
        entityMedia: mediaLinks,
        mediaAssets: mediaAssets.filter((m) => !m.deleted_at),
      }).slice(0, 12)
    },
  })

  if (isLoading) return <LoadingState />

  const hasAnyContent =
    entities.length > 0 || reminders.some((r) => !r.deleted_at) || recentMoments.length > 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:py-8">
      <motion.section className="mb-8" {...fadeUp} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
        <HeroCard
          title={hero.title}
          subtitle={hero.subtitle}
          eyebrow={hero.kind === 'emotional_fallback' ? 'SharedLife' : 'Heute relevant'}
          ctaLabel={hero.ctaLabel}
          href={hero.href}
          mediaPath={hero.mediaPath}
          spaceId={spaceId}
          aspectClassName="aspect-[4/5] max-h-[26rem] sm:aspect-[16/10] sm:max-h-[22rem]"
        />
      </motion.section>

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
            <section className="mb-8">
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-2xl font-bold tracking-[-0.025em] text-text">Heute</h2>
                <Link to="/planen?tab=kalender" className="text-sm font-medium text-primary">
                  Kalender
                </Link>
              </div>
              <ul className="overflow-hidden rounded-lg border border-border/70 bg-surface shadow-xs">
                {todayItems.map((item) => (
                  <li key={item.id} className="border-b border-border/60 last:border-b-0">
                    {item.href ? (
                      <Link
                        to={item.href}
                        className="flex min-h-14 items-center justify-between gap-4 px-6 py-4"
                      >
                        <span className="text-[17px] text-text">{item.label}</span>
                        <span className="shrink-0 text-sm font-medium text-text-muted">
                          {item.meta}
                        </span>
                      </Link>
                    ) : (
                      <div className="flex min-h-14 items-center justify-between gap-4 px-6 py-4">
                        <span className="text-[17px] text-text">{item.label}</span>
                        <span className="shrink-0 text-sm font-medium text-text-muted">
                          {item.meta}
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {activeGoals.length > 0 ? (
            <section className="mb-8">
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-2xl font-bold tracking-[-0.025em] text-text">Aktive Ziele</h2>
                <Link to="/planen?tab=vorhaben&filter=goal" className="text-sm font-medium text-primary">
                  Alle
                </Link>
              </div>
              <div className="flex snap-x gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {activeGoals.map((goal, i) => (
                  <ProgressCard
                    key={goal.id}
                    title={goal.title}
                    subtitle="Ziel"
                    progress={goal.progress}
                    href={goal.href}
                    tone={(['sage', 'sand', 'rose', 'sky'] as const)[i % 4]}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {activeTrips.length > 0 ? (
            <section className="mb-8">
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-2xl font-bold tracking-[-0.025em] text-text">Aktuelle Reisen</h2>
                <Link to="/planen?tab=vorhaben&filter=trip" className="text-sm font-medium text-primary">
                  Alle
                </Link>
              </div>
              <ul className="space-y-2">
                {activeTrips.map((trip) => (
                  <li key={trip.id}>
                    <Link
                      to={entityDetailPath('trip', trip.id)}
                      className="flex overflow-hidden rounded-lg border border-border/80 bg-surface shadow-xs"
                    >
                      <div className="w-24 shrink-0">
                        {mediaByEntityId[trip.id] && spaceId ? (
                          <MediaImage
                            storagePath={mediaByEntityId[trip.id]}
                            spaceId={spaceId}
                            alt={trip.title}
                            aspectRatio={1}
                            className="rounded-none"
                          />
                        ) : (
                          <div className="aspect-square bg-pastel-1" />
                        )}
                      </div>
                      <div className="p-4">
                        <p className="font-serif text-lg text-text">{trip.title}</p>
                        <p className="mt-1 text-xs text-text-muted">
                          {entityStart(trip)
                            ? format(entityStart(trip)!, 'd. MMM yyyy', { locale: de })
                            : 'Reise'}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {recentMoments.length > 0 && spaceId ? (
            <section className="mb-2">
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-2xl font-bold tracking-[-0.025em] text-text">Letzte Momente</h2>
                <Link to="/erinnerungen" className="text-sm font-medium text-primary">
                  Alle
                </Link>
              </div>
              <div className="flex snap-x gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {recentMoments.map((moment) => (
                  <Link
                    key={moment.id}
                    to={
                      moment.entityId && moment.entityType
                        ? `/entities/${moment.entityType}/${moment.entityId}`
                        : '/erinnerungen'
                    }
                    className="min-w-[14rem] snap-start overflow-hidden rounded-lg border border-border/70 bg-surface shadow-xs"
                  >
                    {moment.storagePath ? (
                      <MediaImage
                        storagePath={moment.storagePath}
                        spaceId={spaceId}
                        alt={moment.title}
                        aspectRatio={4 / 5}
                      />
                    ) : (
                      <div className="aspect-[4/5] bg-pastel-2" />
                    )}
                    <div className="p-4">
                      <p className="text-lg font-bold leading-tight tracking-[-0.025em] text-text">
                        {moment.title}
                      </p>
                      <p className="mt-2 text-sm font-medium text-text-muted">
                        {format(parseISO(moment.occurredAt), 'd. MMM yyyy', { locale: de })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
