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
  getRecentWishes,
  getTasksThisWeek,
} from '@/features/home/relevance'
import { Gallery } from '@/features/media/Gallery'
import { MediaImage } from '@/features/media/MediaImage'
import { DASHBOARD_MODULE_CARDS } from '@/features/modules/module-registry'
import { daysTogether, usePairProfile } from '@/features/space/pair-profile'
import { deriveTimelineItems } from '@/features/timeline/derive-timeline'
import { db } from '@/lib/indexed-db/db'
import { cn } from '@/lib/utilities/cn'

function RingProgress({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = 36
  const circ = 2 * Math.PI * radius
  const offset = circ - (clamped / 100) * circ
  return (
    <div className="relative size-24">
      <svg viewBox="0 0 96 96" className="size-full -rotate-90">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-serif text-xl text-text">
        {Math.round(clamped)}%
      </span>
    </div>
  )
}

function GoalProgressCard({ goalId }: { goalId: string }) {
  const { data: payload } = useEntityDetailPayload(goalId, 'goal')
  const percent = getGoalProgressFromPayload(payload as Record<string, unknown> | null) ?? 0
  const current = Number((payload as Record<string, unknown> | null)?.current ?? 0)
  const target = Number((payload as Record<string, unknown> | null)?.target ?? 100)
  return (
    <div className="mt-3 flex items-center gap-4">
      <RingProgress value={percent} />
      <div>
        <p className="text-sm text-text-muted">
          {current} / {target}
        </p>
        <p className="text-xs text-text-muted">Nächster Schritt wartet</p>
      </div>
    </div>
  )
}

function tripNights(starts: string | null, ends: string | null): number | null {
  if (!starts || !ends) return null
  try {
    return Math.max(0, differenceInCalendarDays(parseISO(ends), parseISO(starts)))
  } catch {
    return null
  }
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
  const recentWishes = getRecentWishes(entities)
  const journals = entities
    .filter((e) => e.entity_type === 'journal' && !e.deleted_at)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 2)
  const gifts = entities
    .filter((e) => e.entity_type === 'gift' && !e.deleted_at && e.status !== 'completed')
    .slice(0, 3)
  const todayReminders = reminders
    .filter((r) => !r.deleted_at && r.is_active)
    .slice(0, 3)

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
        .slice(0, 8)
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
      }).slice(0, 5)
    },
  })

  if (isLoading) return <LoadingState />

  const hasAny =
    nextEvent ||
    activeTrip ||
    activeGoal ||
    nextDate ||
    tasksThisWeek.length > 0 ||
    memoryItems.length > 0 ||
    entities.length > 0

  const tripStart = activeTrip?.starts_at ?? activeTrip?.all_day_start
  const tripCountdown =
    tripStart != null ? Math.max(0, differenceInCalendarDays(parseISO(tripStart), now)) : null
  const nights = tripNights(
    activeTrip?.starts_at ?? activeTrip?.all_day_start ?? null,
    activeTrip?.ends_at ?? activeTrip?.all_day_end ?? null,
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 lg:py-8">
      <header className="mb-5 lg:mb-8">
        <p className="text-sm font-medium text-primary">{greeting}</p>
        <h1 className="mt-1 font-serif text-3xl text-balance text-text lg:text-4xl">
          SharedLife
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {pair?.coupleBlurb || 'Euer gemeinsames digitales Zuhause'}
          {together !== null ? ` · ${together} Tage` : ''}
        </p>
      </header>

      {/* Emotional pair card */}
      <section className="mb-5 overflow-hidden rounded-[22px] border border-border bg-surface shadow-sm">
        <div className="relative aspect-[16/10] max-h-64 w-full sm:aspect-[21/9]">
          {pair?.coverMediaPath ? (
            <MediaImage
              storagePath={pair.coverMediaPath}
              alt="Titelbild"
              className="absolute inset-0 !aspect-auto size-full rounded-none"
              aspectRatio={16 / 10}
              lazy={false}
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#e7efe4,transparent_45%),radial-gradient(circle_at_80%_30%,#f3e4df,transparent_40%),linear-gradient(135deg,#f6f2ec,#efe8df)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-text/45 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-surface">
            <p className="font-serif text-2xl">
              {pair?.partnerAName ?? 'Dennis'} & {pair?.partnerBName ?? 'Lea'}
            </p>
            <p className="text-sm text-surface/85">
              {together !== null ? `${together} gemeinsame Tage` : 'Paarprofil ergänzen'}
            </p>
          </div>
        </div>
      </section>

      {!hasAny ? (
        <EmptyState
          title="Noch nichts geplant"
          description="Startet mit einem Eintrag über den Plus-Button — Termine, Ziele und mehr warten auf euch."
          actionLabel="Planen öffnen"
          onAction={() => void navigate('/planen')}
        />
      ) : (
        <>
          {/* Today strip */}
          <section className="mb-5">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="font-serif text-xl text-text">Heute im Überblick</h2>
              <Link to="/planen" className="text-sm font-medium text-primary">
                Zur Planung
              </Link>
            </div>
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible">
              <Card className="min-w-[78%] snap-start sm:min-w-[46%] lg:min-w-0" padding="md">
                <p className="text-xs font-medium text-primary">Heute</p>
                <CardTitle className="mt-1">{format(now, 'HH:mm')} Uhr</CardTitle>
                <CardDescription>
                  {nextEvent?.title || todayReminders[0]?.title || 'Kein Termin — Zeit für euch'}
                </CardDescription>
                {tasksThisWeek.length > 0 ? (
                  <p className="mt-3 text-xs text-text-muted">{tasksThisWeek.length} Aufgaben diese Woche</p>
                ) : null}
              </Card>

              <Card
                className={cn(
                  'min-w-[78%] snap-start overflow-hidden sm:min-w-[46%] lg:min-w-0',
                  'border-emotional/25',
                )}
                padding="none"
              >
                {activeTrip ? (
                  <Link to={entityDetailPath(activeTrip.entity_type, activeTrip.id)} className="block">
                    <div className="relative h-28 bg-surface-soft">
                      {activeTrip.cover_media_id ? null : (
                        <div className="absolute inset-0 bg-[linear-gradient(135deg,#c9d8e8,#f1ece5)]" />
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-medium text-blue">Nächster Urlaub</p>
                      <CardTitle className="mt-1">{activeTrip.title}</CardTitle>
                      <CardDescription>
                        {tripCountdown !== null ? `Noch ${tripCountdown} Tage` : formatEntityDateRange(activeTrip)}
                        {nights !== null ? ` · ${nights} Nächte` : ''}
                      </CardDescription>
                    </div>
                  </Link>
                ) : (
                  <div className="p-4">
                    <p className="text-xs font-medium text-blue">Nächster Urlaub</p>
                    <CardTitle className="mt-1">Noch keine Reise</CardTitle>
                    <button
                      type="button"
                      className="mt-3 text-sm font-medium text-primary"
                      onClick={() => void navigate('/planen/neu?type=trip')}
                    >
                      Reise planen
                    </button>
                  </div>
                )}
              </Card>

              <Card className="min-w-[78%] snap-start sm:min-w-[46%] lg:min-w-0" padding="md">
                {activeGoal ? (
                  <Link to={entityDetailPath(activeGoal.entity_type, activeGoal.id)} className="block">
                    <p className="text-xs font-medium text-primary">Gemeinsames Ziel</p>
                    <CardTitle className="mt-1">{activeGoal.title}</CardTitle>
                    <GoalProgressCard goalId={activeGoal.id} />
                  </Link>
                ) : (
                  <>
                    <p className="text-xs font-medium text-primary">Gemeinsames Ziel</p>
                    <CardTitle className="mt-1">Noch kein Ziel</CardTitle>
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

              <Card className="min-w-[78%] snap-start sm:min-w-[46%] lg:min-w-0" padding="md">
                {nextDate ? (
                  <Link to={entityDetailPath(nextDate.entity_type, nextDate.id)} className="block">
                    <p className="text-xs font-medium text-emotional">Date-Idee</p>
                    <CardTitle className="mt-1">{nextDate.title}</CardTitle>
                    <CardDescription>{formatEntityDateRange(nextDate) || 'Idee für euch zwei'}</CardDescription>
                  </Link>
                ) : (
                  <>
                    <p className="text-xs font-medium text-emotional">Date-Idee</p>
                    <CardTitle className="mt-1">Neue Idee finden</CardTitle>
                    <button
                      type="button"
                      className="mt-3 text-sm font-medium text-primary"
                      onClick={() => void navigate('/planen/neu?type=date')}
                    >
                      Date-Idee hinzufügen
                    </button>
                  </>
                )}
              </Card>
            </div>
          </section>

          {/* Module cards */}
          <section className="mb-8">
            <h2 className="mb-3 font-serif text-xl text-text">Module</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {DASHBOARD_MODULE_CARDS.map((mod) => (
                <Link
                  key={mod.key}
                  to={mod.path}
                  className="group min-h-[160px] overflow-hidden rounded-[20px] border border-border bg-surface shadow-xs transition duration-200 hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.99]"
                >
                  <div className={cn('h-20', mod.accent.replace('text-', 'bg-').split(' ')[0], 'opacity-70')} />
                  <div className="p-3">
                    <p className="font-medium text-text">{mod.label}</p>
                    <p className="mt-1 text-xs text-text-muted">{mod.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Memories + Timeline */}
          <section className="mb-8 grid gap-6 lg:grid-cols-2">
            <div>
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
                  <p className="text-sm text-text-muted">Noch keine Fotos — halte euren nächsten Moment fest.</p>
                  <button
                    type="button"
                    className="mt-3 text-sm font-medium text-primary"
                    onClick={() => void navigate('/erinnerungen/neu')}
                  >
                    Erinnerung erstellen
                  </button>
                </Card>
              )}
            </div>

            <div>
              <div className="mb-3 flex items-end justify-between">
                <h2 className="font-serif text-xl text-text">Timeline</h2>
                <Link to="/timeline" className="text-sm font-medium text-primary">
                  Öffnen
                </Link>
              </div>
              <ul className="space-y-2">
                {timelinePreview.length === 0 ? (
                  <Card padding="md">
                    <p className="text-sm text-text-muted">Noch keine Ereignisse in der Timeline.</p>
                  </Card>
                ) : (
                  timelinePreview.map((item) => (
                    <li key={item.id}>
                      <Card padding="sm" className="flex gap-3">
                        {item.storagePath && spaceId ? (
                          <div className="size-14 shrink-0 overflow-hidden rounded-xl">
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
                            {item.sourceLabel} ·{' '}
                            {format(parseISO(item.occurredAt), 'd. MMM yyyy', { locale: de })}
                          </p>
                        </div>
                      </Card>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </section>

          {/* Lower widgets */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card padding="md">
              <p className="text-xs font-medium text-primary">Top-Wunschliste</p>
              <ul className="mt-3 space-y-2">
                {recentWishes.length === 0 ? (
                  <li className="text-sm text-text-muted">Noch keine Wünsche</li>
                ) : (
                  recentWishes.map((wish) => (
                    <li key={wish.id}>
                      <Link to={entityDetailPath(wish.entity_type, wish.id)} className="text-sm text-text hover:text-primary">
                        {wish.title}
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </Card>

            <Card padding="md">
              <p className="text-xs font-medium text-emotional">Geschenkideen</p>
              <ul className="mt-3 space-y-2">
                {gifts.length === 0 ? (
                  <li className="text-sm text-text-muted">Noch keine Geschenkideen</li>
                ) : (
                  gifts.map((gift) => (
                    <li key={gift.id}>
                      <Link to={entityDetailPath(gift.entity_type, gift.id)} className="text-sm text-text hover:text-primary">
                        {gift.title}
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </Card>

            <Card padding="md">
              <p className="text-xs font-medium text-primary">Wöchentliche Highlights</p>
              <ul className="mt-3 space-y-2 text-sm text-text-muted">
                {tasksThisWeek.slice(0, 3).map((t) => (
                  <li key={t.id}>{t.title}</li>
                ))}
                {todayReminders.slice(0, 2).map((r) => (
                  <li key={r.id}>{r.title}</li>
                ))}
                {tasksThisWeek.length === 0 && todayReminders.length === 0 ? (
                  <li>Diese Woche ist noch ruhig</li>
                ) : null}
              </ul>
            </Card>

            <Card padding="md">
              <p className="text-xs font-medium text-emotional">Couple Journal</p>
              <ul className="mt-3 space-y-2">
                {journals.length === 0 ? (
                  <li>
                    <button
                      type="button"
                      className="text-sm font-medium text-primary"
                      onClick={() => void navigate('/planen/neu?type=journal')}
                    >
                      Ersten Eintrag schreiben
                    </button>
                  </li>
                ) : (
                  journals.map((entry) => (
                    <li key={entry.id}>
                      <Link
                        to={entityDetailPath(entry.entity_type, entry.id)}
                        className="text-sm text-text hover:text-primary"
                      >
                        {entry.title}
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
