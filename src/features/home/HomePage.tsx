import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { entityDetailPath } from '@/features/entities/entity-types'
import { formatEntityDateRange } from '@/features/entities/entity-date-utils'
import { useEntities, useEntityDetailPayload, useReminders } from '@/features/entities/useEntities'
import {
  getActiveGoal,
  getActiveTrip,
  getGreeting,
  getGoalProgressFromPayload,
  getNextDate,
  getNextEvent,
  getTasksThisWeek,
} from '@/features/home/relevance'
import { Gallery } from '@/features/media/Gallery'
import { MediaImage } from '@/features/media/MediaImage'
import { getActiveShoppingItems } from '@/features/shopping/shopping-service'
import { daysTogether, usePairProfile } from '@/features/space/pair-profile'
import { deriveTimelineItems, timelineKindLabel } from '@/features/timeline/derive-timeline'
import { db } from '@/lib/indexed-db/db'

function RingProgress({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = 28
  const circ = 2 * Math.PI * radius
  const offset = circ - (clamped / 100) * circ
  return (
    <div className="relative size-16">
      <svg viewBox="0 0 72 72" className="size-full -rotate-90">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="7" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-text">
        {Math.round(clamped)}%
      </span>
    </div>
  )
}

function GoalMini({ goalId }: { goalId: string }) {
  const { data: payload } = useEntityDetailPayload(goalId, 'goal')
  const percent = getGoalProgressFromPayload(payload as Record<string, unknown> | null) ?? 0
  return <RingProgress value={percent} />
}

export function HomePage() {
  const navigate = useNavigate()
  const { profile, spaceId } = useAuth()
  const { data: pair } = usePairProfile()
  const { data: entities = [], isLoading } = useEntities()
  const { data: reminders = [] } = useReminders()
  const now = new Date()
  const greeting = getGreeting(now, profile?.displayName)
  const together = daysTogether(pair?.togetherSince ?? null, now)

  const nextEvent = getNextEvent(entities, now)
  const activeTrip = getActiveTrip(entities)
  const activeGoal = getActiveGoal(entities)
  const tasksThisWeek = getTasksThisWeek(entities, now)
  const nextDate = getNextDate(entities, now)
  const todayReminders = reminders.filter((r) => !r.deleted_at && r.is_active).slice(0, 3)

  const todayItems = [
    nextEvent
      ? { id: nextEvent.id, label: nextEvent.title, meta: formatEntityDateRange(nextEvent) }
      : null,
    ...tasksThisWeek.slice(0, 2).map((t) => ({
      id: t.id,
      label: t.title,
      meta: 'Aufgabe',
    })),
    ...todayReminders.slice(0, 1).map((r) => ({
      id: r.id,
      label: r.title,
      meta: 'Erinnerung',
    })),
  ]
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 3)

  const { data: shopping } = useQuery({
    queryKey: ['shopping-preview', spaceId],
    enabled: Boolean(spaceId),
    queryFn: () => getActiveShoppingItems(spaceId!),
  })

  const { data: memoryItems = [] } = useQuery({
    queryKey: ['home-memories', spaceId],
    enabled: Boolean(spaceId),
    queryFn: async () => {
      const [mediaLinks, mediaAssets] = await Promise.all([
        db.entityMedia.toArray(),
        db.mediaAssets.where('space_id').equals(spaceId!).toArray(),
      ])
      const assets = mediaAssets.filter((m) => !m.deleted_at && m.variant === 'display')
      return mediaLinks
        .map((link) => {
          const asset = assets.find((a) => a.id === link.media_id)
          if (!asset) return null
          return {
            id: link.id,
            src: asset.storage_path,
            caption: link.caption,
            originalFilename: asset.original_filename,
            aspectRatio: 4 / 3,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .slice(0, 5)
    },
  })

  const { data: timelinePreview = [] } = useQuery({
    queryKey: ['home-timeline', spaceId],
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
      }).slice(0, 1)
    },
  })

  if (isLoading) return <LoadingState />

  const heroTrip = activeTrip
  const tripStart = heroTrip?.starts_at ?? heroTrip?.all_day_start
  const tripCountdown =
    tripStart != null ? Math.max(0, differenceInCalendarDays(parseISO(tripStart), now)) : null
  const latestTimeline = timelinePreview[0]
  const highlight =
    entities.find((e) => e.entity_type === 'moment' && !e.deleted_at) ??
    entities.find((e) => e.entity_type === 'goal' && e.status === 'completed' && !e.deleted_at) ??
    null

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 lg:py-8">
      {/* 1. Header */}
      <header className="mb-5">
        <p className="text-sm font-medium text-primary">{greeting}</p>
        <h1 className="mt-1 font-serif text-3xl text-text">
          {pair?.partnerAName ?? 'Dennis'} & {pair?.partnerBName ?? 'Lea'}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {together !== null ? `${together} gemeinsame Tage` : 'Euer gemeinsames Leben'}
          {pair?.coupleBlurb ? ` · ${pair.coupleBlurb}` : ''}
        </p>
      </header>

      {/* 2. Emotional hero — only one */}
      <section className="mb-5 overflow-hidden rounded-[22px] border border-border bg-surface shadow-sm">
        {heroTrip ? (
          <Link to={entityDetailPath(heroTrip.entity_type, heroTrip.id)} className="block">
            <div className="relative aspect-[16/10] max-h-64 w-full">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,#d7e4ef,#f1ece5_55%,#f3e4df)]" />
              {pair?.coverMediaPath ? (
                <MediaImage
                  storagePath={pair.coverMediaPath}
                  alt={heroTrip.title}
                  className="absolute inset-0 rounded-none"
                  aspectRatio={16 / 10}
                  lazy={false}
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-text/50 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-surface">
                <p className="text-xs font-medium uppercase tracking-wide text-surface/80">Nächste Reise</p>
                <p className="font-serif text-2xl">{heroTrip.title}</p>
                <p className="text-sm text-surface/85">
                  {tripCountdown !== null
                    ? `Noch ${tripCountdown} ${tripCountdown === 1 ? 'Tag' : 'Tage'}`
                    : formatEntityDateRange(heroTrip)}
                </p>
              </div>
            </div>
          </Link>
        ) : (
          <div className="relative aspect-[16/10] max-h-64 w-full">
            {pair?.coverMediaPath ? (
              <MediaImage
                storagePath={pair.coverMediaPath}
                alt="Paarbild"
                className="absolute inset-0 rounded-none"
                aspectRatio={16 / 10}
                lazy={false}
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#e7efe4,transparent_45%),radial-gradient(circle_at_80%_30%,#f3e4df,transparent_40%),linear-gradient(135deg,#f6f2ec,#efe8df)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-text/40 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-surface">
              <p className="font-serif text-2xl">
                {pair?.partnerAName ?? 'Dennis'} & {pair?.partnerBName ?? 'Lea'}
              </p>
              <p className="text-sm text-surface/85">
                {together !== null ? `${together} gemeinsame Tage` : 'Paarprofil ergänzen'}
              </p>
            </div>
          </div>
        )}
      </section>

      {!entities.length && !shopping?.active.length ? (
        <EmptyState
          title="Noch nichts geplant"
          description="Startet mit dem Plus-Button — oder öffnet direkt den Einkauf."
          actionLabel="Einkauf öffnen"
          onAction={() => void navigate('/einkauf')}
        />
      ) : (
        <>
          {/* 3. Heute */}
          <section className="mb-5">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="font-serif text-xl text-text">Heute</h2>
              <Link to="/planen" className="text-sm font-medium text-primary">
                Planen
              </Link>
            </div>
            <Card padding="md">
              {todayItems.length === 0 ? (
                <p className="text-sm text-text-muted">Heute ist noch ruhig — Zeit für euch.</p>
              ) : (
                <ul className="space-y-2">
                  {todayItems.map((item) => (
                    <li key={item.id} className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-text">{item.label}</span>
                      <span className="shrink-0 text-xs text-text-muted">{item.meta}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-text-muted">{format(now, 'EEEE, d. MMMM · HH:mm', { locale: de })}</p>
            </Card>
          </section>

          {/* 4. Quick access */}
          <section className="mb-6">
            <h2 className="mb-3 font-serif text-xl text-text">Schnellzugriffe</h2>
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-orange/20" padding="md">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-orange">Einkauf</p>
                    <CardTitle className="mt-1 text-lg">
                      {shopping?.active.length ?? 0} offen
                    </CardTitle>
                  </div>
                  <Link to="/einkauf?focus=1" className="text-xs font-medium text-primary">
                    + Artikel
                  </Link>
                </div>
                <ul className="mt-3 space-y-1">
                  {(shopping?.active ?? []).slice(0, 3).map((item) => (
                    <li key={item.id} className="truncate text-sm text-text-muted">
                      • {item.title}
                    </li>
                  ))}
                  {(shopping?.active.length ?? 0) === 0 ? (
                    <li className="text-sm text-text-muted">Liste ist leer</li>
                  ) : null}
                </ul>
                <Link to="/einkauf" className="mt-3 inline-block text-sm font-medium text-primary">
                  Zur Liste
                </Link>
              </Card>

              <Card padding="md">
                {activeTrip ? (
                  <Link to={entityDetailPath(activeTrip.entity_type, activeTrip.id)}>
                    <p className="text-xs font-medium text-blue">Nächste Reise</p>
                    <CardTitle className="mt-1 text-lg">{activeTrip.title}</CardTitle>
                    <CardDescription>
                      {tripCountdown !== null ? `Noch ${tripCountdown} Tage` : formatEntityDateRange(activeTrip)}
                    </CardDescription>
                  </Link>
                ) : (
                  <>
                    <p className="text-xs font-medium text-blue">Nächste Reise</p>
                    <CardTitle className="mt-1 text-lg">Noch offen</CardTitle>
                    <button
                      type="button"
                      className="mt-3 text-sm font-medium text-primary"
                      onClick={() => void navigate('/planen/neu?type=trip')}
                    >
                      Reise planen
                    </button>
                  </>
                )}
              </Card>

              <Card padding="md">
                {activeGoal ? (
                  <Link to={entityDetailPath(activeGoal.entity_type, activeGoal.id)} className="flex items-center gap-3">
                    <GoalMini goalId={activeGoal.id} />
                    <div>
                      <p className="text-xs font-medium text-primary">Aktives Ziel</p>
                      <CardTitle className="mt-1 text-base">{activeGoal.title}</CardTitle>
                    </div>
                  </Link>
                ) : (
                  <>
                    <p className="text-xs font-medium text-primary">Aktives Ziel</p>
                    <CardTitle className="mt-1 text-lg">Kein Ziel</CardTitle>
                    <button
                      type="button"
                      className="mt-3 text-sm font-medium text-primary"
                      onClick={() => void navigate('/planen/neu?type=goal')}
                    >
                      Ziel setzen
                    </button>
                  </>
                )}
              </Card>

              <Card padding="md">
                {nextDate ? (
                  <Link to={entityDetailPath(nextDate.entity_type, nextDate.id)}>
                    <p className="text-xs font-medium text-emotional">Date-Idee</p>
                    <CardTitle className="mt-1 text-lg">{nextDate.title}</CardTitle>
                    <CardDescription>{formatEntityDateRange(nextDate) || 'Idee für euch'}</CardDescription>
                  </Link>
                ) : (
                  <>
                    <p className="text-xs font-medium text-emotional">Date-Idee</p>
                    <CardTitle className="mt-1 text-lg">Neue Idee</CardTitle>
                    <button
                      type="button"
                      className="mt-3 text-sm font-medium text-primary"
                      onClick={() => void navigate('/planen/neu?type=date')}
                    >
                      Hinzufügen
                    </button>
                  </>
                )}
              </Card>
            </div>
          </section>

          {/* 5. Memories */}
          <section className="mb-6">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="font-serif text-xl text-text">Letzte Erinnerungen</h2>
              <Link to="/erinnerungen" className="text-sm font-medium text-primary">
                Alle
              </Link>
            </div>
            {spaceId && memoryItems.length > 0 ? (
              <Gallery items={memoryItems} spaceId={spaceId} horizontal />
            ) : (
              <Card padding="md">
                <p className="text-sm text-text-muted">Noch keine Fotos.</p>
                <button
                  type="button"
                  className="mt-3 text-sm font-medium text-primary"
                  onClick={() => void navigate('/erinnerungen/neu')}
                >
                  Erinnerung erstellen
                </button>
              </Card>
            )}
          </section>

          {/* 6. Timeline preview — single entry */}
          <section className="mb-6">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="font-serif text-xl text-text">Timeline</h2>
              <Link to="/timeline" className="text-sm font-medium text-primary">
                Unsere Geschichte ansehen
              </Link>
            </div>
            {latestTimeline && spaceId ? (
              <Link to="/timeline">
                <Card padding="none" className="overflow-hidden transition hover:-translate-y-0.5">
                  {latestTimeline.storagePath ? (
                    <MediaImage
                      storagePath={latestTimeline.storagePath}
                      spaceId={spaceId}
                      alt={latestTimeline.title}
                      aspectRatio={16 / 9}
                    />
                  ) : null}
                  <div className="p-4">
                    <p className="text-xs font-medium text-primary">
                      {timelineKindLabel(latestTimeline.kind)}
                    </p>
                    <CardTitle className="mt-1">{latestTimeline.title}</CardTitle>
                    <CardDescription>
                      {format(parseISO(latestTimeline.occurredAt), 'd. MMMM yyyy', { locale: de })}
                      {latestTimeline.body || latestTimeline.subtitle
                        ? ` · ${latestTimeline.body || latestTimeline.subtitle}`
                        : ''}
                    </CardDescription>
                  </div>
                </Card>
              </Link>
            ) : (
              <Card padding="md">
                <p className="text-sm text-text-muted">Noch keine Timeline-Einträge.</p>
              </Card>
            )}
          </section>

          {/* 7. Weekly highlight only if real data */}
          {highlight ? (
            <section>
              <h2 className="mb-3 font-serif text-xl text-text">Wöchentliches Highlight</h2>
              <Link to={entityDetailPath(highlight.entity_type, highlight.id)}>
                <Card interactive padding="md">
                  <p className="text-xs font-medium text-emotional">Highlight</p>
                  <CardTitle className="mt-1">{highlight.title}</CardTitle>
                  <CardDescription>
                    {highlight.entity_type === 'goal' ? 'Ziel erreicht' : 'Besonderer Moment'}
                  </CardDescription>
                </Card>
              </Link>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
