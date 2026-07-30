import { Link, useNavigate } from 'react-router-dom'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { entityDetailPath, getEntityTypeMeta } from '@/features/entities/entity-types'
import { formatEntityDateRange } from '@/features/entities/entity-date-utils'
import { useEntities, useEntityDetailPayload } from '@/features/entities/useEntities'
import {
  getActiveGoal,
  getActiveTrip,
  getCountdownTarget,
  getGreeting,
  getGoalProgressFromPayload,
  getNextDate,
  getNextEvent,
  getRecentWishes,
  getTasksThisWeek,
} from '@/features/home/relevance'
import { useAuth } from '@/features/auth/AuthProvider'

function GoalProgressCard({ goalId }: { goalId: string }) {
  const { data: payload } = useEntityDetailPayload(goalId, 'goal')
  const percent = getGoalProgressFromPayload(payload as Record<string, unknown> | null)
  if (percent === null) return null
  return <ProgressBar label="Fortschritt" value={percent} showValue />
}

export function HomePage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { data: entities = [], isLoading } = useEntities()
  const now = new Date()
  const greeting = getGreeting(now, profile?.displayName)

  const nextEvent = getNextEvent(entities, now)
  const activeTrip = getActiveTrip(entities)
  const activeGoal = getActiveGoal(entities)
  const tasksThisWeek = getTasksThisWeek(entities, now)
  const nextDate = getNextDate(entities, now)
  const countdown = getCountdownTarget(entities, now)
  const recentWishes = getRecentWishes(entities)

  const hasContent =
    nextEvent ||
    activeTrip ||
    activeGoal ||
    tasksThisWeek.length > 0 ||
    nextDate ||
    countdown ||
    recentWishes.length > 0

  if (isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-10">
        <p className="text-sm font-medium text-primary">{greeting}</p>
        <h1 className="text-hero mt-2 text-balance">Euer gemeinsames Zuhause</h1>
      </header>

      {!hasContent ? (
        <EmptyState
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 3l2.2 4.5L19 8.3l-3.5 3.4.8 4.9L12 14.8 7.7 16.6l.8-4.9L5 8.3l4.8-.8L12 3z" strokeLinejoin="round" />
            </svg>
          }
          title="Noch nichts geplant"
          description="Startet mit einem Eintrag über den Plus-Button — Termine, Ziele und mehr warten auf euch."
          actionLabel="Planen öffnen"
          onAction={() => {
            void navigate('/planen')
          }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {nextEvent ? (
            <Link to={entityDetailPath(nextEvent.entity_type, nextEvent.id)}>
              <Card interactive padding="md">
                <p className="text-xs font-medium text-primary">Nächster Termin</p>
                <CardTitle className="mt-1">{nextEvent.title}</CardTitle>
                <CardDescription>{formatEntityDateRange(nextEvent)}</CardDescription>
              </Card>
            </Link>
          ) : null}

          {activeTrip ? (
            <Link to={entityDetailPath(activeTrip.entity_type, activeTrip.id)}>
              <Card interactive padding="md" className="border-accent/30 bg-accent/5">
                <p className="text-xs font-medium text-accent">Aktive Reise</p>
                <CardTitle className="mt-1">{activeTrip.title}</CardTitle>
                <CardDescription>{formatEntityDateRange(activeTrip)}</CardDescription>
              </Card>
            </Link>
          ) : null}

          {activeGoal ? (
            <Link to={entityDetailPath(activeGoal.entity_type, activeGoal.id)}>
              <Card interactive padding="md">
                <p className="text-xs font-medium text-primary">Aktives Ziel</p>
                <CardTitle className="mt-1">{activeGoal.title}</CardTitle>
                <div className="mt-3">
                  <GoalProgressCard goalId={activeGoal.id} />
                </div>
              </Card>
            </Link>
          ) : null}

          {countdown ? (
            <Card padding="md">
              <p className="text-xs font-medium text-primary">Countdown</p>
              <CardTitle className="mt-1">
                Noch {countdown.days} {countdown.days === 1 ? 'Tag' : 'Tage'}
              </CardTitle>
              <CardDescription>
                bis {getEntityTypeMeta(countdown.entity.entity_type).label}: {countdown.entity.title}
              </CardDescription>
            </Card>
          ) : null}

          {nextDate ? (
            <Link to={entityDetailPath(nextDate.entity_type, nextDate.id)}>
              <Card interactive padding="md">
                <p className="text-xs font-medium text-primary">Nächstes Date</p>
                <CardTitle className="mt-1">{nextDate.title}</CardTitle>
                <CardDescription>{formatEntityDateRange(nextDate)}</CardDescription>
              </Card>
            </Link>
          ) : null}

          {tasksThisWeek.length > 0 ? (
            <Card padding="md">
              <p className="mb-3 text-xs font-medium text-primary">Aufgaben diese Woche</p>
              <ul className="flex flex-col gap-2">
                {tasksThisWeek.map((task) => (
                  <li key={task.id}>
                    <Link
                      to={entityDetailPath(task.entity_type, task.id)}
                      className="text-sm text-text hover:text-primary"
                    >
                      {task.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {recentWishes.length > 0 ? (
            <Card padding="md">
              <p className="mb-3 text-xs font-medium text-primary">Aktuelle Wünsche</p>
              <ul className="flex flex-col gap-2">
                {recentWishes.map((wish) => (
                  <li key={wish.id}>
                    <Link
                      to={entityDetailPath(wish.entity_type, wish.id)}
                      className="text-sm text-text hover:text-primary"
                    >
                      {wish.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  )
}
