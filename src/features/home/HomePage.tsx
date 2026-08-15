import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { motion } from 'motion/react'
import { AppHeaderHome } from '@/components/shared/AppHeader'
import { HeroCard } from '@/components/ui/HeroCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { entityDetailPath } from '@/features/entities/entity-types'
import { useEntities, useReminders } from '@/features/entities/useEntities'
import { getNextPlannedDateOrTrip } from '@/features/home/hero'
import {
  selectTodayForUs,
  todaySectionEmptyKind,
} from '@/features/home/home-dashboard'
import { selectRecentMoments } from '@/features/home/recent-moments'
import { MediaImage } from '@/features/media/MediaImage'
import { daysTogether, usePairProfile } from '@/features/space/pair-profile'
import { db } from '@/lib/indexed-db/db'

const fadeUp = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
}

export function HomePage() {
  const navigate = useNavigate()
  const { spaceId } = useAuth()
  const { data: pair } = usePairProfile()
  const entitiesQuery = useEntities()
  const { data: entities = [], isPending: entitiesPending, isFetching } = entitiesQuery
  const entitiesLoaded = Boolean(spaceId) && !entitiesPending
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
      getNextPlannedDateOrTrip({
        now,
        entities,
        mediaByEntityId,
        entitiesLoaded,
      }),
    [now, entities, mediaByEntityId, entitiesLoaded],
  )

  const todayItems = useMemo(
    () =>
      selectTodayForUs({
        entities,
        reminders,
        now,
        excludeEntityId: hero.entityId ?? null,
        limit: 4,
      }),
    [entities, reminders, now, hero.entityId],
  )

  const todayKind = useMemo(
    () =>
      todaySectionEmptyKind({
        todayItems,
        entities,
        reminders,
        now,
      }),
    [todayItems, entities, reminders, now],
  )

  const { data: recentMoments = [] } = useQuery({
    queryKey: ['home-recent-moments', spaceId],
    enabled: Boolean(spaceId),
    queryFn: async () => {
      const [ents, details, mediaLinks, mediaAssets] = await Promise.all([
        db.entities.where('space_id').equals(spaceId!).toArray(),
        db.entityDetails.toArray(),
        db.entityMedia.toArray(),
        db.mediaAssets.where('space_id').equals(spaceId!).toArray(),
      ])
      return selectRecentMoments({
        entities: ents,
        entityDetails: details,
        entityMedia: mediaLinks,
        mediaAssets: mediaAssets.filter((m) => !m.deleted_at),
        limit: 12,
      })
    },
  })

  const a = pair?.partnerAName ?? 'Dennis'
  const b = pair?.partnerBName ?? 'Lea'
  const pageLoading = Boolean(spaceId) && entitiesPending && isFetching

  return (
    <div className="mx-auto max-w-5xl">
      <AppHeaderHome />

      <div className="px-page pt-[26px] pb-6 lg:pb-8">
        {pageLoading ? (
          <LoadingState className="min-h-[40dvh] py-10" />
        ) : (
          <>
            <motion.section
              className="mb-5"
              {...fadeUp}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[15px] font-medium text-text-muted">
                {a} & {b}
                {together !== null ? ` · ${together} gemeinsame Tage` : ''}
              </p>
            </motion.section>

            <motion.section
              className="mb-[var(--section-gap)]"
              {...fadeUp}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1], delay: 0.04 }}
            >
              {hero.kind === 'loading' ? (
                <div className="overflow-hidden rounded-lg border border-border/80 bg-surface p-5 shadow-xs">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-3 h-7 w-48" />
                  <Skeleton className="mt-3 h-4 w-64" />
                </div>
              ) : hero.kind === 'empty' ? (
                <div className="rounded-lg border border-border/80 bg-surface p-5 shadow-xs">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                    {hero.eyebrow}
                  </p>
                  <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-text">
                    {hero.title}
                  </h2>
                  <p className="mt-2 text-[15px] text-text-muted">{hero.subtitle}</p>
                  <button
                    type="button"
                    className="mt-4 inline-flex min-h-11 items-center rounded-[20px] bg-primary px-4 text-sm font-medium text-surface"
                    onClick={() => void navigate(hero.href)}
                  >
                    {hero.ctaLabel}
                  </button>
                </div>
              ) : (
                <HeroCard
                  title={hero.title}
                  subtitle={hero.subtitle}
                  eyebrow={hero.eyebrow}
                  ctaLabel={hero.ctaLabel}
                  href={hero.href}
                  mediaPath={hero.mediaPath}
                  spaceId={spaceId}
                  aspectClassName="aspect-[4/5] max-h-[24rem] sm:aspect-[16/10] sm:max-h-[20rem]"
                />
              )}
            </motion.section>

            <section className="mb-[var(--section-gap)]">
              <div className="mb-3 flex items-end justify-between gap-4">
                <h2 className="text-[24px] font-semibold tracking-[-0.025em] text-text">
                  Heute für uns
                </h2>
                <Link to="/planen?tab=kalender" className="text-sm font-medium text-primary">
                  Kalender
                </Link>
              </div>
              {todayKind === 'list' ? (
                <ul className="overflow-hidden rounded-lg border border-border/70 bg-surface shadow-xs">
                  {todayItems.map((item) => (
                    <li key={item.id} className="border-b border-border/60 last:border-b-0">
                      {item.href ? (
                        <Link
                          to={item.href}
                          className="flex min-h-12 items-center justify-between gap-4 px-4 py-3"
                        >
                          <span className="text-[16px] text-text">{item.label}</span>
                          <span className="shrink-0 text-sm font-medium text-text-muted">
                            {item.meta}
                          </span>
                        </Link>
                      ) : (
                        <div className="flex min-h-12 items-center justify-between gap-4 px-4 py-3">
                          <span className="text-[16px] text-text">{item.label}</span>
                          <span className="shrink-0 text-sm font-medium text-text-muted">
                            {item.meta}
                          </span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-lg border border-border/60 bg-surface-soft/50 px-4 py-3">
                  <p className="text-[15px] text-text-muted">
                    {todayKind === 'covered_by_hero'
                      ? 'Alles Wichtige steckt schon in der Vorfreude oben.'
                      : 'Heute ist ruhig — genießt den Moment.'}
                  </p>
                </div>
              )}
            </section>

            <section className="mb-2">
              <div className="mb-3 flex items-end justify-between gap-4">
                <h2 className="text-[24px] font-semibold tracking-[-0.025em] text-text">
                  Letzte Momente
                </h2>
                <Link to="/erinnerungen" className="text-sm font-medium text-primary">
                  Alle
                </Link>
              </div>
              {recentMoments.length > 0 && spaceId ? (
                <div className="flex snap-x gap-3 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {recentMoments.map((moment) => (
                    <Link
                      key={moment.id}
                      to={entityDetailPath('moment', moment.entityId)}
                      className="min-w-[12.5rem] snap-start overflow-hidden rounded-lg border border-border/70 bg-surface shadow-xs"
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
                      <div className="p-3">
                        <p className="text-[17px] font-semibold leading-tight tracking-[-0.02em] text-text">
                          {moment.title}
                        </p>
                        <p className="mt-1.5 text-[13px] font-medium text-text-muted">
                          {format(parseISO(moment.occurredAt), 'd. MMM yyyy', { locale: de })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Noch keine Momente"
                  description="Haltet Erlebtes bewusst fest — Rezepte und Wünsche gehören nicht hierher."
                  actionLabel="Moment festhalten"
                  onAction={() => void navigate('/planen/neu?type=moment')}
                />
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
