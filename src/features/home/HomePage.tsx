import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { motion } from 'motion/react'
import { AppHeaderHome } from '@/components/shared/AppHeader'
import { HeroCard } from '@/components/ui/HeroCard'
import { ProgressCard } from '@/components/ui/ProgressCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { entityDetailPath } from '@/features/entities/entity-types'
import { useEntities, useReminders } from '@/features/entities/useEntities'
import {
  HOME_QUICK_ACCESS,
  selectAnticipationItems,
  selectSharedHighlight,
  selectTimelinePreview,
  selectTodayForUs,
  timelinePreviewTypeLabel,
  todaySectionEmptyKind,
} from '@/features/home/home-dashboard'
import { selectHomeHero } from '@/features/home/hero'
import { selectRecentMoments } from '@/features/home/recent-moments'
import { MediaImage } from '@/features/media/MediaImage'
import { daysTogether, usePairProfile } from '@/features/space/pair-profile'
import { TripCountdownBadge } from '@/features/trips/TripCountdown'
import { deriveTimelineItems } from '@/features/timeline/derive-timeline'
import { db } from '@/lib/indexed-db/db'

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
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

  const todayItems = useMemo(
    () =>
      selectTodayForUs({
        entities,
        reminders,
        now,
        excludeEntityId: hero.entityId,
        limit: 4,
      }),
    [entities, reminders, now, hero.entityId],
  )

  const todayEmptyKind = useMemo(
    () =>
      todaySectionEmptyKind({
        todayItems,
        entities,
        reminders,
        now,
      }),
    [todayItems, entities, reminders, now],
  )

  const anticipation = useMemo(
    () =>
      selectAnticipationItems({
        entities,
        now,
        mediaByEntityId,
        excludeEntityId: hero.entityId,
        limit: 3,
      }),
    [entities, now, mediaByEntityId, hero.entityId],
  )

  const highlight = useMemo(
    () =>
      selectSharedHighlight({
        entities,
        detailProgress,
      }),
    [entities, detailProgress],
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
        entityDetails: details.filter((d) => d.space_id === spaceId),
        entityMedia: mediaLinks.filter((l) => l.space_id === spaceId),
        mediaAssets: mediaAssets.filter((m) => !m.deleted_at),
        limit: 12,
      })
    },
  })

  const { data: timelinePreview = [] } = useQuery({
    queryKey: ['home-timeline-preview', spaceId, hero.entityId ?? null],
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
        entityMedia: mediaLinks.filter((l) => l.space_id === spaceId),
        mediaAssets: mediaAssets.filter((m) => !m.deleted_at),
      })
      return selectTimelinePreview(items, {
        excludeEntityIds: hero.entityId ? [hero.entityId] : [],
        limit: 6,
      })
    },
  })

  const hasAnyContent =
    entities.some((e) => !e.deleted_at) ||
    reminders.some((r) => !r.deleted_at) ||
    recentMoments.length > 0

  return (
    <div className="mx-auto max-w-5xl">
      <AppHeaderHome
        togetherDays={together}
        coupleBlurb={pair?.coupleBlurb}
      />

      <div className="px-page pt-[22px] pb-6 lg:pb-8">
        {isLoading ? (
          <LoadingState className="min-h-[40dvh] py-10" />
        ) : (
          <>
            <motion.section
              className="mb-[var(--section-gap)]"
              {...fadeUp}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
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
                <section className="mb-[var(--section-gap)]">
                  <div className="mb-3 flex items-end justify-between gap-4">
                    <h2 className="text-2xl font-bold tracking-[-0.025em] text-text">
                      Heute für uns
                    </h2>
                    <Link to="/planen?tab=kalender" className="text-sm font-medium text-primary">
                      Kalender
                    </Link>
                  </div>
                  {todayEmptyKind === 'list' ? (
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
                  ) : todayEmptyKind === 'covered_by_hero' ? (
                    <p className="rounded-lg border border-border/60 bg-surface px-5 py-4 text-[15px] leading-relaxed text-text-muted">
                      Das Wichtigste von heute ist oben hervorgehoben.
                      {hero.href ? (
                        <>
                          {' '}
                          <Link to={hero.href} className="font-medium text-primary">
                            Öffnen
                          </Link>
                        </>
                      ) : null}
                    </p>
                  ) : (
                    <p className="rounded-lg border border-border/60 bg-[linear-gradient(145deg,var(--color-pastel-1),var(--color-pastel-2))] px-5 py-5 text-[15px] leading-relaxed text-text">
                      Heute ist ruhig — Zeit für euch beide.
                    </p>
                  )}
                </section>

                <section className="mb-[var(--section-gap)]">
                  <h2 className="mb-3 text-lg font-semibold tracking-[-0.02em] text-text">
                    Schnellzugriff
                  </h2>
                  <div className="grid grid-cols-4 gap-2">
                    {HOME_QUICK_ACCESS.map((item) => (
                      <Link
                        key={item.key}
                        to={item.path}
                        className={`flex min-h-[4.5rem] flex-col items-center justify-center rounded-[20px] border border-border/70 px-2 py-3 text-center text-xs font-semibold tracking-[-0.01em] shadow-xs ${item.accent}`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </section>

                {anticipation.length > 0 ? (
                  <section className="mb-[var(--section-gap)]">
                    <div className="mb-3 flex items-end justify-between gap-4">
                      <h2 className="text-2xl font-bold tracking-[-0.025em] text-text">
                        Vorfreude
                      </h2>
                      <Link
                        to="/planen?tab=vorhaben"
                        className="text-sm font-medium text-primary"
                      >
                        Alle
                      </Link>
                    </div>
                    <ul className="card-stack">
                      {anticipation.map((item) => {
                        const entity = entities.find((e) => e.id === item.id)
                        return (
                          <li key={item.id}>
                            <Link
                              to={item.href}
                              className="flex overflow-hidden rounded-lg border border-border/80 bg-surface shadow-xs"
                            >
                              <div className="w-24 shrink-0">
                                {item.mediaPath && spaceId ? (
                                  <MediaImage
                                    storagePath={item.mediaPath}
                                    spaceId={spaceId}
                                    alt={item.title}
                                    aspectRatio={1}
                                    className="rounded-none"
                                  />
                                ) : (
                                  <div className="aspect-square bg-pastel-1" />
                                )}
                              </div>
                              <div className="flex min-w-0 flex-1 flex-col justify-center p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-serif text-lg text-text">{item.title}</p>
                                  {entity?.entity_type === 'trip' ? (
                                    <TripCountdownBadge entity={entity} />
                                  ) : null}
                                </div>
                                <p className="mt-1 text-xs text-text-muted">
                                  {item.meta}
                                  {' · '}
                                  {format(item.startsAt, 'd. MMM yyyy', { locale: de })}
                                </p>
                              </div>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                ) : null}

                {recentMoments.length > 0 && spaceId ? (
                  <section className="mb-[var(--section-gap)]">
                    <div className="mb-3 flex items-end justify-between gap-4">
                      <h2 className="text-2xl font-bold tracking-[-0.025em] text-text">
                        Letzte Momente
                      </h2>
                      <Link to="/erinnerungen" className="text-sm font-medium text-primary">
                        Alle
                      </Link>
                    </div>
                    <div className="flex snap-x gap-4 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {recentMoments.map((moment) => (
                        <Link
                          key={moment.id}
                          to={entityDetailPath('moment', moment.entityId)}
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
                            <div className="aspect-[4/5] bg-[linear-gradient(160deg,var(--color-pastel-2),var(--color-sand))]" />
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

                {timelinePreview.length > 0 && spaceId ? (
                  <section className="mb-[var(--section-gap)]">
                    <div className="mb-3 flex items-end justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold tracking-[-0.025em] text-text">
                          Unser gemeinsamer Weg
                        </h2>
                        <p className="mt-1 text-sm text-text-muted">
                          Was bei euch passiert — Reisen, Dates und mehr.
                        </p>
                      </div>
                      <Link to="/timeline" className="text-sm font-medium text-primary">
                        Timeline
                      </Link>
                    </div>
                    <ul className="overflow-hidden rounded-lg border border-border/70 bg-surface shadow-xs">
                      {timelinePreview.map((item) => (
                        <li key={item.id} className="border-b border-border/60 last:border-b-0">
                          <Link
                            to={
                              item.entityId && item.entityType
                                ? `/entities/${item.entityType}/${item.entityId}`
                                : '/timeline'
                            }
                            className="flex min-h-14 items-center gap-3 px-4 py-3.5"
                          >
                            <div className="size-12 shrink-0 overflow-hidden rounded-[14px] bg-pastel-1">
                              {item.storagePath ? (
                                <MediaImage
                                  storagePath={item.storagePath}
                                  spaceId={spaceId}
                                  alt=""
                                  aspectRatio={1}
                                  className="rounded-none"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[16px] font-medium text-text">
                                {item.title}
                              </p>
                              <p className="mt-0.5 text-xs font-medium text-text-muted">
                                {timelinePreviewTypeLabel(item)}
                                {' · '}
                                {format(parseISO(item.occurredAt), 'd. MMM yyyy', {
                                  locale: de,
                                })}
                              </p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {highlight ? (
                  <section className="mb-2">
                    <h2 className="mb-3 text-2xl font-bold tracking-[-0.025em] text-text">
                      Gemeinsames Highlight
                    </h2>
                    {highlight.kind === 'goal_progress' && highlight.progress !== undefined ? (
                      <ProgressCard
                        title={highlight.title}
                        subtitle={highlight.subtitle}
                        progress={highlight.progress}
                        href={highlight.href}
                        tone="sage"
                      />
                    ) : (
                      <Link
                        to={highlight.href}
                        className="block rounded-lg border border-border/70 bg-[linear-gradient(145deg,var(--color-pastel-2),var(--color-surface))] p-5 shadow-xs"
                      >
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
                          {highlight.subtitle}
                        </p>
                        <p className="mt-2 font-serif text-2xl text-text">{highlight.title}</p>
                      </Link>
                    )}
                  </section>
                ) : null}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
