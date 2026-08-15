import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { de } from 'date-fns/locale'
import { toZonedTime } from 'date-fns-tz'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import { AppHeaderMain } from '@/components/shared/AppHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { VORHABEN_TYPES } from '@/features/content/content-map'
import {
  entityDetailPath,
  getEntityTypeMeta,
  PLANNING_SEGMENTS,
  PLANNING_TABS,
  type PlanningTabKey,
} from '@/features/entities/entity-types'
import { formatEntityDateRange } from '@/features/entities/entity-date-utils'
import { useEntities, useUpdateEntity } from '@/features/entities/useEntities'
import {
  daysOfWeek,
  decideWeekSwipe,
  shiftWeek,
  type CalendarViewMode,
} from '@/features/planning/week-calendar'
import { TripCountdownBadge } from '@/features/trips/TripCountdown'
import { APP_TIMEZONE } from '@/lib/dates/timezone'
import type { EntityRow, EntityType } from '@/lib/indexed-db/schema'
import { cn } from '@/lib/utilities/cn'

const LEGACY_SEGMENT_TO_TAB: Record<string, PlanningTabKey> = Object.fromEntries(
  PLANNING_SEGMENTS.map((s) => [s.key, s.tab]),
) as Record<string, PlanningTabKey>

function resolveTab(params: URLSearchParams): PlanningTabKey {
  const tab = params.get('tab')
  if (tab === 'kalender' || tab === 'vorhaben' || tab === 'aufgaben') return tab
  const segment = params.get('segment')
  if (segment && LEGACY_SEGMENT_TO_TAB[segment]) return LEGACY_SEGMENT_TO_TAB[segment]
  return 'kalender'
}

function entityStart(entity: EntityRow): Date | null {
  if (entity.starts_at) return toZonedTime(parseISO(entity.starts_at), APP_TIMEZONE)
  if (entity.all_day_start) return toZonedTime(parseISO(entity.all_day_start), APP_TIMEZONE)
  return null
}

function getEventsForDay(entities: EntityRow[], day: Date): EntityRow[] {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  return entities.filter((e) => {
    if (e.deleted_at) return false
    if (e.all_day_start) {
      const start = toZonedTime(parseISO(e.all_day_start), APP_TIMEZONE)
      const end = e.all_day_end ? toZonedTime(parseISO(e.all_day_end), APP_TIMEZONE) : start
      const rangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      const rangeEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate())
      return dayStart >= rangeStart && dayStart <= rangeEnd
    }
    if (e.starts_at) {
      const start = toZonedTime(parseISO(e.starts_at), APP_TIMEZONE)
      return isSameDay(start, day)
    }
    return false
  })
}

function EntityListItem({ entity }: { entity: EntityRow }) {
  const meta = getEntityTypeMeta(entity.entity_type)
  const isTrip = entity.entity_type === 'trip'
  return (
    <Link to={entityDetailPath(entity.entity_type, entity.id)}>
      <Card interactive padding="md">
        <div className="flex items-start gap-3">
          <span className="text-primary">{meta.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-medium text-text">{entity.title}</h2>
              <span className="text-xs text-text-muted">{meta.label}</span>
              {isTrip ? <TripCountdownBadge entity={entity} /> : null}
            </div>
            <p className="mt-0.5 text-sm text-text-muted">
              {formatEntityDateRange(entity) || meta.label}
            </p>
          </div>
          <Badge variant="primary">{meta.statusLabels[entity.status]}</Badge>
        </div>
      </Card>
    </Link>
  )
}

function AufgabenSection({ tasks }: { tasks: EntityRow[] }) {
  const navigate = useNavigate()
  const updateEntity = useUpdateEntity()
  const [completingId, setCompletingId] = useState<string | null>(null)

  if (tasks.length === 0) {
    return (
      <section>
        <EmptyState
          title="Keine Aufgaben"
          description="Gemeinsame To-dos erscheinen hier — schlicht und übersichtlich."
          actionLabel="Aufgabe erstellen"
          onAction={() => void navigate('/planen/neu?type=task')}
        />
      </section>
    )
  }

  return (
    <section>
      <ul className="card-stack">
        {tasks.map((entity) => {
          const meta = getEntityTypeMeta(entity.entity_type)
          const role = String(entity.metadata?.assigneeRole ?? '')
          const roleLabel =
            role === 'dennis'
              ? 'Dennis'
              : role === 'lea'
                ? 'Lea'
                : role === 'gemeinsam'
                  ? 'Gemeinsam'
                  : null
          const isCompleting = completingId === entity.id
          return (
            <li key={entity.id}>
              <motion.div
                layout
                animate={
                  isCompleting
                    ? { opacity: 0, scale: 0.96, y: -8 }
                    : { opacity: 1, scale: 1, y: 0 }
                }
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card padding="md" className="flex items-start gap-3">
                  <button
                    type="button"
                    aria-label="Als erledigt markieren"
                    className={cn(
                      'mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-[10px] border transition',
                      entity.status === 'completed'
                        ? 'border-primary bg-primary text-surface'
                        : 'border-border bg-surface text-transparent hover:border-primary/50',
                    )}
                    onClick={() => {
                      if (entity.status === 'completed') return
                      setCompletingId(entity.id)
                      window.setTimeout(() => {
                        void updateEntity.mutateAsync({
                          id: entity.id,
                          patch: { status: 'completed' },
                        })
                      }, 220)
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <Link
                    to={entityDetailPath(entity.entity_type, entity.id)}
                    className="min-w-0 flex-1"
                  >
                    <h2 className="font-medium text-text">{entity.title}</h2>
                    <p className="mt-0.5 text-sm text-text-muted">
                      {formatEntityDateRange(entity) || 'Ohne Fälligkeit'}
                      {roleLabel ? ` · ${roleLabel}` : ''}
                    </p>
                  </Link>
                  <Badge variant={entity.status === 'completed' ? 'default' : 'primary'}>
                    {meta.statusLabels[entity.status]}
                  </Badge>
                </Card>
              </motion.div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function AgendaList({
  entities,
  emptyTitle,
  emptyDescription,
}: {
  entities: EntityRow[]
  emptyTitle: string
  emptyDescription: string
}) {
  const navigate = useNavigate()
  if (entities.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel="Termin erstellen"
        onAction={() => void navigate('/planen/neu?type=event')}
      />
    )
  }
  return (
    <ul className="card-stack">
      {entities.map((entity) => (
        <li key={entity.id}>
          <EntityListItem entity={entity} />
        </li>
      ))}
    </ul>
  )
}

export function PlanningPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = resolveTab(params)
  const filter = params.get('filter') as EntityType | null
  const now = useMemo(() => toZonedTime(new Date(), APP_TIMEZONE), [])
  const [selectedDay, setSelectedDay] = useState(() => now)
  const [weekAnchor, setWeekAnchor] = useState(() => now)
  const [month, setMonth] = useState(() => now)
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week')
  const [showVorhabenFilter, setShowVorhabenFilter] = useState(Boolean(filter))
  const swipeRef = useRef<{
    pointerId: number
    x: number
    y: number
    t: number
  } | null>(null)
  const swipeLock = useRef(false)

  const { data: allEntities = [], isLoading } = useEntities()

  const setTab = (next: PlanningTabKey) => {
    const nextParams = new URLSearchParams(params)
    nextParams.set('tab', next)
    nextParams.delete('segment')
    if (next !== 'vorhaben') nextParams.delete('filter')
    setParams(nextParams, { replace: true })
  }

  const calendarEntities = useMemo(
    () =>
      allEntities.filter(
        (e) =>
          !e.deleted_at &&
          e.status !== 'cancelled' &&
          (e.entity_type === 'event' ||
            e.entity_type === 'date' ||
            e.entity_type === 'trip' ||
            e.entity_type === 'milestone' ||
            ((e.entity_type === 'goal' || e.entity_type === 'task') &&
              (Boolean(e.starts_at) || Boolean(e.all_day_start)))),
      ),
    [allEntities],
  )

  const vorhaben = useMemo(() => {
    let items = allEntities.filter(
      (e) => !e.deleted_at && VORHABEN_TYPES.includes(e.entity_type) && e.status !== 'cancelled',
    )
    if (filter && VORHABEN_TYPES.includes(filter)) {
      items = items.filter((e) => e.entity_type === filter)
    }
    return items.sort((a, b) => {
      const aStart = entityStart(a)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const bStart = entityStart(b)?.getTime() ?? Number.MAX_SAFE_INTEGER
      if (aStart !== bStart) return aStart - bStart
      return b.updated_at.localeCompare(a.updated_at)
    })
  }, [allEntities, filter])

  const tasks = useMemo(
    () =>
      allEntities
        .filter((e) => !e.deleted_at && e.entity_type === 'task' && e.status !== 'cancelled')
        .sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1
          if (a.status !== 'active' && b.status === 'active') return 1
          const aStart = entityStart(a)?.getTime() ?? Number.MAX_SAFE_INTEGER
          const bStart = entityStart(b)?.getTime() ?? Number.MAX_SAFE_INTEGER
          return aStart - bStart
        }),
    [allEntities],
  )

  const weekDays = daysOfWeek(weekAnchor)
  const selectedDayEvents = getEventsForDay(calendarEntities, selectedDay)
  const weekEvents = useMemo(() => {
    const ids = new Set<string>()
    const list: EntityRow[] = []
    for (const day of weekDays) {
      for (const event of getEventsForDay(calendarEntities, day)) {
        if (ids.has(event.id)) continue
        ids.add(event.id)
        list.push(event)
      }
    }
    return list.sort((a, b) => {
      const aStart = entityStart(a)?.getTime() ?? 0
      const bStart = entityStart(b)?.getTime() ?? 0
      return aStart - bStart
    })
  }, [calendarEntities, weekDays])

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const monthDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const goToday = () => {
    const today = toZonedTime(new Date(), APP_TIMEZONE)
    setSelectedDay(today)
    setWeekAnchor(today)
    setMonth(today)
  }

  const moveWeek = (delta: number) => {
    if (swipeLock.current) return
    swipeLock.current = true
    const next = shiftWeek(weekAnchor, delta)
    setWeekAnchor(next)
    // Behalte Wochentag-Index relativ zur Woche
    const idx = weekDays.findIndex((d) => isSameDay(d, selectedDay))
    const nextDays = daysOfWeek(next)
    setSelectedDay(nextDays[idx >= 0 ? idx : 0] ?? next)
    window.setTimeout(() => {
      swipeLock.current = false
    }, 280)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    swipeRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      t: performance.now(),
    }
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipeRef.current
    swipeRef.current = null
    if (!start || start.pointerId !== event.pointerId) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    const dt = Math.max(16, performance.now() - start.t)
    const vx = dx / dt
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const decision = decideWeekSwipe({ dx, dy, vx, reducedMotion })
    if (decision.deltaWeeks !== 0) moveWeek(decision.deltaWeeks)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <AppHeaderMain
        title="Planen"
        description="Kalender, Vorhaben und Aufgaben — ohne doppelte Module."
      />

      <div className="px-page pt-[26px] pb-6 lg:pb-8">
        {isLoading ? <LoadingState className="min-h-[40dvh] py-10" /> : null}

        {!isLoading ? (
          <>
            <SegmentedControl
              className="mb-[var(--section-gap)]"
              ariaLabel="Planen"
              options={PLANNING_TABS.map((item) => ({ key: item.key, label: item.label }))}
              value={tab}
              onChange={setTab}
            />

            {tab === 'kalender' ? (
              <section>
                <div className="mb-4 flex items-center justify-between gap-2">
                  <p className="text-sm capitalize text-text-muted">
                    {viewMode === 'week'
                      ? `${format(weekDays[0]!, 'd. MMM', { locale: de })} – ${format(weekDays[6]!, 'd. MMM yyyy', { locale: de })}`
                      : format(month, 'MMMM yyyy', { locale: de })}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="secondary" size="sm" onClick={goToday}>
                      Heute
                    </Button>
                    {viewMode === 'week' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setViewMode('month')
                          setMonth(selectedDay)
                        }}
                      >
                        Monat
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setViewMode('week')
                          setWeekAnchor(selectedDay)
                        }}
                      >
                        Woche
                      </Button>
                    )}
                  </div>
                </div>

                {viewMode === 'week' ? (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <button
                        type="button"
                        aria-label="Vorherige Woche"
                        className="flex size-11 items-center justify-center rounded-[14px] text-text-muted hover:bg-surface-soft"
                        onClick={() => moveWeek(-1)}
                      >
                        <ChevronLeft size={22} strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        aria-label="Nächste Woche"
                        className="flex size-11 items-center justify-center rounded-[14px] text-text-muted hover:bg-surface-soft"
                        onClick={() => moveWeek(1)}
                      >
                        <ChevronRight size={22} strokeWidth={1.75} />
                      </button>
                    </div>

                    <div
                      className="touch-pan-y"
                      onPointerDown={onPointerDown}
                      onPointerUp={onPointerUp}
                      onPointerCancel={() => {
                        swipeRef.current = null
                      }}
                    >
                      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[12px] font-medium text-text-muted">
                        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
                          <div key={d}>{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {weekDays.map((day) => {
                          const dayEvents = getEventsForDay(calendarEntities, day)
                          const isToday = isSameDay(day, now)
                          const isSelected = isSameDay(day, selectedDay)
                          return (
                            <button
                              key={day.toISOString()}
                              type="button"
                              onClick={() => setSelectedDay(day)}
                              className={cn(
                                'flex min-h-[4.5rem] flex-col items-center rounded-[16px] border px-1 py-2 transition',
                                isSelected
                                  ? 'border-primary/40 bg-primary/10'
                                  : 'border-border/70 bg-surface',
                                isToday && !isSelected && 'ring-2 ring-primary/20',
                              )}
                            >
                              <span
                                className={cn(
                                  'flex size-8 items-center justify-center rounded-full text-sm font-semibold',
                                  isToday ? 'bg-primary text-surface' : 'text-text',
                                )}
                              >
                                {format(day, 'd')}
                              </span>
                              <span className="mt-1 flex gap-0.5">
                                {dayEvents.slice(0, 3).map((event) => (
                                  <span
                                    key={event.id}
                                    className="size-1.5 rounded-full bg-primary"
                                    title={event.title}
                                  />
                                ))}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="mt-6">
                      <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.02em] text-text">
                        {format(selectedDay, 'EEEE, d. MMMM', { locale: de })}
                      </h2>
                      <AgendaList
                        entities={selectedDayEvents.length > 0 ? selectedDayEvents : weekEvents}
                        emptyTitle="Nichts in dieser Woche"
                        emptyDescription="Termine, Dates und Reisen mit Datum erscheinen hier."
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setMonth((m) => addMonths(m, -1))}
                      >
                        Zurück
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setMonth((m) => addMonths(m, 1))}
                      >
                        Weiter
                      </Button>
                    </div>
                    <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[12px] font-medium text-text-muted">
                      {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
                        <div key={d}>{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {monthDays.map((day) => {
                        const dayEvents = getEventsForDay(calendarEntities, day)
                        const inMonth = isSameMonth(day, month)
                        const isToday = isSameDay(day, now)
                        const isSelected = isSameDay(day, selectedDay)
                        return (
                          <button
                            key={day.toISOString()}
                            type="button"
                            onClick={() => {
                              setSelectedDay(day)
                              setWeekAnchor(day)
                            }}
                            className={cn(
                              'min-h-14 rounded-[14px] border p-1.5 text-left',
                              inMonth ? 'border-border/80 bg-surface' : 'border-transparent bg-bg/40 opacity-45',
                              isSelected && 'ring-2 ring-primary/30',
                              isToday && 'bg-primary/8',
                            )}
                          >
                            <span className="text-xs font-semibold text-text">{format(day, 'd')}</span>
                            <span className="mt-1 flex flex-wrap gap-0.5">
                              {dayEvents.slice(0, 2).map((event) => (
                                <span
                                  key={event.id}
                                  className="size-1.5 rounded-full bg-primary"
                                  title={event.title}
                                />
                              ))}
                              {dayEvents.length > 2 ? (
                                <span className="text-[9px] text-text-muted">+{dayEvents.length - 2}</span>
                              ) : null}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-6">
                      <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.02em] text-text">
                        {format(selectedDay, 'EEEE, d. MMMM', { locale: de })}
                      </h2>
                      <AgendaList
                        entities={getEventsForDay(calendarEntities, selectedDay)}
                        emptyTitle="Keine Einträge an diesem Tag"
                        emptyDescription="Wähle einen anderen Tag oder lege etwas Neues an."
                      />
                    </div>
                  </>
                )}
              </section>
            ) : null}

            {tab === 'vorhaben' ? (
              <section>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm text-text-muted">Reisen, Dates, Ziele und gemeinsame Projekte</p>
                  <button
                    type="button"
                    className="text-sm font-medium text-primary"
                    onClick={() => setShowVorhabenFilter((v) => !v)}
                  >
                    {showVorhabenFilter ? 'Filter ausblenden' : 'Filter'}
                  </button>
                </div>

                {showVorhabenFilter ? (
                  <div className="mb-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = new URLSearchParams(params)
                        next.delete('filter')
                        setParams(next, { replace: true })
                      }}
                      className={cn(
                        'min-h-10 rounded-[16px] px-3 text-sm',
                        !filter ? 'bg-primary text-surface' : 'bg-sand/30 text-text-muted',
                      )}
                    >
                      Alle
                    </button>
                    {VORHABEN_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          const next = new URLSearchParams(params)
                          next.set('filter', type)
                          setParams(next, { replace: true })
                        }}
                        className={cn(
                          'min-h-10 rounded-[16px] px-3 text-sm',
                          filter === type ? 'bg-primary text-surface' : 'bg-sand/30 text-text-muted',
                        )}
                      >
                        {getEntityTypeMeta(type).labelPlural}
                      </button>
                    ))}
                  </div>
                ) : null}

                {vorhaben.length === 0 ? (
                  <EmptyState
                    title="Noch keine Vorhaben"
                    description="Plant eine Reise, ein Date oder ein gemeinsames Ziel."
                    actionLabel="Vorhaben planen"
                    onAction={() => void navigate('/planen/neu?type=trip')}
                  />
                ) : (
                  <ul className="card-stack">
                    {vorhaben.map((entity) => (
                      <li key={entity.id}>
                        <EntityListItem entity={entity} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            {tab === 'aufgaben' ? <AufgabenSection tasks={tasks} /> : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
