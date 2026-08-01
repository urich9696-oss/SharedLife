import { useMemo, useState } from 'react'
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
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
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
import { APP_TIMEZONE } from '@/lib/dates/timezone'
import type { EntityRow, EntityType } from '@/lib/indexed-db/schema'
import { cn } from '@/lib/utilities/cn'
import { motion } from 'motion/react'

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
  return (
    <Link to={entityDetailPath(entity.entity_type, entity.id)}>
      <Card interactive padding="md">
        <div className="flex items-start gap-3">
          <span className="text-primary">{meta.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-medium text-text">{entity.title}</h2>
              <span className="text-xs text-text-muted">{meta.label}</span>
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
            role === 'dennis' ? 'Dennis' : role === 'lea' ? 'Lea' : role === 'gemeinsam' ? 'Gemeinsam' : null
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
                      'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[10px] border transition',
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

export function PlanningPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = resolveTab(params)
  const filter = params.get('filter') as EntityType | null
  const [month, setMonth] = useState(() => toZonedTime(new Date(), APP_TIMEZONE))
  const [showVorhabenFilter, setShowVorhabenFilter] = useState(Boolean(filter))

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

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  if (isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-2xl px-page py-6 lg:py-8">
      <header className="mb-[var(--section-gap)]">
        <h1 className="font-serif text-3xl text-text">Planen</h1>
        <p className="mt-[var(--heading-content-gap)] text-sm text-text-muted">
          Kalender, Vorhaben und Aufgaben — ohne doppelte Module.
        </p>
      </header>

      <div
        className="mb-[var(--section-gap)] grid grid-cols-3 gap-1 rounded-[18px] border border-border bg-surface-soft/70 p-1"
        role="tablist"
        aria-label="Planen"
      >
        {PLANNING_TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              'min-h-11 rounded-[14px] px-2 text-sm font-medium transition duration-200',
              tab === item.key
                ? 'bg-surface text-text shadow-xs'
                : 'text-text-muted hover:text-text',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'kalender' ? (
        <section>
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="capitalize text-sm text-text-muted">
              {format(month, 'MMMM yyyy', { locale: de })}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setMonth((m) => addMonths(m, -1))}>
                Zurück
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMonth(toZonedTime(new Date(), APP_TIMEZONE))}
              >
                Heute
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setMonth((m) => addMonths(m, 1))}>
                Weiter
              </Button>
            </div>
          </div>

          {calendarEntities.length === 0 ? (
            <EmptyState
              title="Noch nichts im Kalender"
              description="Termine, Dates und Reisen mit Datum erscheinen hier automatisch."
              actionLabel="Termin erstellen"
              onAction={() => void navigate('/planen/neu?type=event')}
            />
          ) : (
            <>
              <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-text-muted">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const dayEvents = getEventsForDay(calendarEntities, day)
                  const inMonth = isSameMonth(day, month)
                  const isToday = isSameDay(day, toZonedTime(new Date(), APP_TIMEZONE))
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'min-h-20 rounded-[16px] border p-1.5',
                        inMonth ? 'border-border/80 bg-surface' : 'border-transparent bg-bg/50 opacity-50',
                        isToday && 'ring-2 ring-primary/25',
                      )}
                    >
                      <span className="text-xs font-medium text-text-muted">{format(day, 'd')}</span>
                      <ul className="mt-1 flex flex-col gap-0.5">
                        {dayEvents.slice(0, 2).map((event) => (
                          <li key={event.id}>
                            <button
                              type="button"
                              className="w-full truncate rounded-md bg-primary/10 px-1 py-0.5 text-left text-[10px] text-primary hover:bg-primary/20"
                              onClick={() =>
                                void navigate(entityDetailPath(event.entity_type, event.id))
                              }
                            >
                              {event.title}
                            </button>
                          </li>
                        ))}
                        {dayEvents.length > 2 ? (
                          <li className="text-[10px] text-text-muted">+{dayEvents.length - 2}</li>
                        ) : null}
                      </ul>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6">
                <h2 className="mb-3 font-serif text-xl text-text">In diesem Monat</h2>
                <ul className="card-stack">
                  {calendarEntities
                    .filter((e) => {
                      const d = entityStart(e)
                      return d && isSameMonth(d, month)
                    })
                    .map((entity) => (
                      <li key={entity.id}>
                        <EntityListItem entity={entity} />
                      </li>
                    ))}
                </ul>
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

      {tab === 'aufgaben' ? (
        <AufgabenSection tasks={tasks} />
      ) : null}
    </div>
  )
}
