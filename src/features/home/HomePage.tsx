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
  { key: 'einkauf', label: 'Einkauf', path: '/einkauf?focus=1', hint: 'Liste' },
  { key: 'date', label: 'Date', path: '/planen/neu?type=date', hint: 'Planen' },
  { key: 'ziel', label: 'Aktives Ziel', path: '/planen?tab=vorhaben&filter=goal', hint: 'Fortschritt' },
  { key: 'reise', label: 'Reise', path: '/planen/neu?type=trip', hint: 'Vorhaben' },
] as const

const fadeUp = {
  initial: { opacity: 0, y: 12, scale: 0.985 },
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
          map[d.entity_id] = Math.min(100, Math.max(0, percent))
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

  const progressCards = useMemo(() => {
    const tones = ['sage', 'sand', 'rose', 'sky'] as const
    return entities
      .filter(
        (e) =>
          !e.deleted_at &&
          e.status === 'active' &&
          ['goal', 'project', 'trip', 'household'].includes(e.entity_type),
      )
      .map((e, i) => ({
        id: e.id,
        title: e.title,
        subtitle: getEntityTypeMeta(e.entity_type).label,
        href: entityDetailPath(e.entity_type, e.id),
        progress:
          detailProgress[e.id] ??
          (typeof e.metadata?.progressPercent === 'number'
            ? Number(e.metadata.progressPercent)
            : e.entity_type === 'trip'
              ? 35
              : 20),
        tone: tones[i % tones.length],
      }))
      .slice(0, 6)
  }, [entities, detailProgress])

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
    <div className="mx-auto max-w-5xl px-4 py-4 lg:py-8">
      <motion.section
        className="mb-6"
        {...fadeUp}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
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
            <motion.section
              className="mb-7"
              {...fadeUp}
              transition={{ duration: 0.42, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-3 flex items-end justify-between">
                <h2 className="font-serif text-2xl text-text">Heute</h2>
                <Link to="/planen?tab=kalender" className="text-sm font-medium text-primary">
                  Kalender
                </Link>
              </div>
              <ul className="overflow-hidden rounded-[28px] border border-border/80 bg-surface shadow-xs">
                {todayItems.map((item) => (
                  <li key={item.id} className="border-b border-border/60 last:border-b-0">
                    {item.href ? (
                      <Link
                        to={item.href}
                        className="flex min-h-13 items-center justify-between gap-3 px-4 py-3.5"
                      >
                        <span className="text-sm text-text">{item.label}</span>
                        <span className="shrink-0 text-xs text-text-muted">{item.meta}</span>
                      </Link>
                    ) : (
                      <div className="flex min-h-13 items-center justify-between gap-3 px-4 py-3.5">
                        <span className="text-sm text-text">{item.label}</span>
                        <span className="shrink-0 text-xs text-text-muted">{item.meta}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </motion.section>
          ) : null}

          <motion.section
            className="mb-7"
            {...fadeUp}
            transition={{ duration: 0.42, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="mb-3 font-serif text-2xl text-text">Schnellzugriffe</h2>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.key}
                  to={action.path}
                  className={cn(
                    'flex min-h-[6.5rem] flex-col justify-between rounded-[24px] border border-border/80 bg-surface p-4',
                    'shadow-xs transition duration-280 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] hover:-translate-y-0.5',
                  )}
                >
                  <span className="font-serif text-xl text-text">{action.label}</span>
                  <span className="text-xs text-text-muted">{action.hint}</span>
                </Link>
              ))}
            </div>
          </motion.section>

          {progressCards.length > 0 ? (
            <motion.section
              className="mb-7"
              {...fadeUp}
              transition={{ duration: 0.42, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-3 flex items-end justify-between">
                <h2 className="font-serif text-2xl text-text">Gemeinsamer Fortschritt</h2>
                <Link to="/planen?tab=vorhaben" className="text-sm font-medium text-primary">
                  Vorhaben
                </Link>
              </div>
              <div className="flex snap-x gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {progressCards.map((card) => (
                  <ProgressCard
                    key={card.id}
                    title={card.title}
                    subtitle={card.subtitle}
                    progress={card.progress}
                    href={card.href}
                    tone={card.tone}
                  />
                ))}
              </div>
            </motion.section>
          ) : null}

          {recentMoments.length > 0 && spaceId ? (
            <motion.section
              className="mb-2"
              {...fadeUp}
              transition={{ duration: 0.42, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-3 flex items-end justify-between">
                <h2 className="font-serif text-2xl text-text">Letzte Momente</h2>
                <Link to="/erinnerungen" className="text-sm font-medium text-primary">
                  Alle
                </Link>
              </div>
              <div className="flex snap-x gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {recentMoments.map((moment) => (
                  <Link
                    key={moment.id}
                    to={
                      moment.entityId && moment.entityType
                        ? `/entities/${moment.entityType}/${moment.entityId}`
                        : '/erinnerungen'
                    }
                    className="min-w-[14rem] snap-start overflow-hidden rounded-[28px] border border-border/70 bg-surface shadow-xs transition duration-280 hover:-translate-y-0.5"
                  >
                    {moment.storagePath ? (
                      <MediaImage
                        storagePath={moment.storagePath}
                        spaceId={spaceId}
                        alt={moment.title}
                        aspectRatio={4 / 5}
                      />
                    ) : (
                      <div className="aspect-[4/5] bg-[linear-gradient(145deg,var(--color-pastel-1),var(--color-pastel-2))]" />
                    )}
                    <div className="p-3.5">
                      <p className="font-serif text-lg leading-tight text-text">{moment.title}</p>
                      <p className="mt-1 text-xs text-text-muted">
                        {format(parseISO(moment.occurredAt), 'd. MMM yyyy', { locale: de })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.section>
          ) : null}
        </>
      )}
    </div>
  )
}
