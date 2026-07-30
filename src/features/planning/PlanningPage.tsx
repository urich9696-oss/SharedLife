import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { Modal } from '@/components/ui/Modal'
import { BudgetFormFields, defaultBudgetForm } from '@/features/budgets/BudgetForm'
import { entityDetailPath, getEntityTypeMeta, PLANNING_SEGMENTS } from '@/features/entities/entity-types'
import { formatEntityDateRange } from '@/features/entities/entity-date-utils'
import {
  useBudgets,
  useEntities,
  useEntitySearch,
  useReminders,
} from '@/features/entities/useEntities'
import { ReminderFormFields, defaultReminderForm } from '@/features/reminders/ReminderForm'
import { formatInAppTz, zonedLocalToUtcIso } from '@/lib/dates/timezone'
import { createBudget } from '@/lib/indexed-db/repositories/budgets'
import { createReminder } from '@/lib/indexed-db/repositories/reminders'
import { useAuth } from '@/features/auth/AuthProvider'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function PlanningPage() {
  const navigate = useNavigate()
  const { spaceId, session, profile } = useAuth()
  const queryClient = useQueryClient()
  const [segment, setSegment] = useState<string>('trips')
  const [query, setQuery] = useState('')
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [budgetForm, setBudgetForm] = useState(defaultBudgetForm)
  const [reminderForm, setReminderForm] = useState(defaultReminderForm)
  const [reminderError, setReminderError] = useState<string | null>(null)

  const activeSegment = PLANNING_SEGMENTS.find((s) => s.key === segment) ?? PLANNING_SEGMENTS[0]
  const entityTypes = activeSegment.entityType ? [activeSegment.entityType] : undefined

  const { data: allEntities = [], isLoading: entitiesLoading } = useEntities()
  const { data: searchResults, isLoading: searchLoading } = useEntitySearch(query, entityTypes)
  const { data: budgets = [] } = useBudgets()
  const { data: reminders = [] } = useReminders()

  const filteredEntities = useMemo(() => {
    if (query.trim()) return searchResults ?? []
    if (!activeSegment.entityType) return []
    return allEntities.filter((e) => e.entity_type === activeSegment.entityType)
  }, [query, searchResults, allEntities, activeSegment.entityType])

  const createBudgetMutation = useMutation({
    mutationFn: async () => {
      if (!spaceId) return
      await createBudget(
        {
          id: uuidv4(),
          space_id: spaceId,
          name: budgetForm.name,
          description: budgetForm.description || null,
          currency: budgetForm.currency,
          amount_limit: budgetForm.amountLimit || null,
          period_start: budgetForm.periodStart || null,
          period_end: budgetForm.periodEnd || null,
        },
        session?.userId ?? null,
      )
    },
    onSuccess: () => {
      setBudgetOpen(false)
      setBudgetForm(defaultBudgetForm)
      void queryClient.invalidateQueries({ queryKey: ['budgets', spaceId] })
    },
  })

  const createReminderMutation = useMutation({
    mutationFn: async () => {
      if (!spaceId) return
      if (reminderForm.mode === 'absolute' && !reminderForm.remindAt) {
        throw new Error('Bitte Datum für die Erinnerung wählen.')
      }
      const remindAt =
        reminderForm.mode === 'absolute'
          ? zonedLocalToUtcIso(
              `${reminderForm.remindAt}T${reminderForm.remindTime || '09:00'}:00`,
            )
          : new Date(Date.now() + reminderForm.relativeMinutes * 60_000).toISOString()

      await createReminder(
        {
          id: uuidv4(),
          space_id: spaceId,
          title: reminderForm.title,
          body: reminderForm.body || null,
          remind_at: remindAt,
          timezone: profile?.timezone ?? 'Europe/Zurich',
          is_active: reminderForm.isActive,
          notify_push: true,
          notify_in_app: true,
        },
        session?.userId ?? null,
      )
    },
    onSuccess: () => {
      setReminderOpen(false)
      setReminderForm(defaultReminderForm)
      setReminderError(null)
      void queryClient.invalidateQueries({ queryKey: ['reminders', spaceId] })
    },
    onError: (err) => {
      setReminderError(err instanceof Error ? err.message : 'Erinnerung fehlgeschlagen')
    },
  })

  const isLoading = entitiesLoading || (query.trim() ? searchLoading : false)
  const showEmpty =
    segment === 'budgets'
      ? budgets.length === 0
      : segment === 'reminders'
        ? reminders.length === 0
        : filteredEntities.length === 0

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-heading">Planen</h1>
        <p className="mt-2 text-text-muted">
          Termine, Aufgaben und gemeinsame Pläne — alles an einem Ort.
        </p>
      </header>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Suchen…"
        className="mb-4"
      />

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {PLANNING_SEGMENTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSegment(s.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              segment === s.key
                ? 'bg-primary text-surface'
                : 'bg-sand/30 text-text-muted hover:text-text'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {segment === 'budgets' ? (
        <Button className="mb-4" size="sm" onClick={() => setBudgetOpen(true)}>
          Budget erstellen
        </Button>
      ) : null}

      {segment === 'reminders' ? (
        <Button className="mb-4" size="sm" onClick={() => setReminderOpen(true)}>
          Erinnerung erstellen
        </Button>
      ) : null}

      {isLoading ? (
        <LoadingState />
      ) : showEmpty ? (
        <EmptyState
          title={`Keine ${activeSegment.label}`}
          description={
            segment === 'budgets'
              ? 'Lege euer erstes gemeinsames Budget an.'
              : segment === 'reminders'
                ? 'Erstelle eine Erinnerung, damit nichts untergeht.'
                : 'Erstelle einen neuen Eintrag über den Plus-Button.'
          }
          actionLabel={
            segment === 'budgets'
              ? 'Budget erstellen'
              : segment === 'reminders'
                ? 'Erinnerung erstellen'
                : 'Kalender anzeigen'
          }
          onAction={() => {
            if (segment === 'budgets') setBudgetOpen(true)
            else if (segment === 'reminders') setReminderOpen(true)
            else void navigate('/calendar')
          }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {segment === 'budgets'
            ? budgets.map((budget) => (
                <li key={budget.id}>
                  <Card padding="md">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-medium text-text">{budget.name}</h2>
                        <p className="mt-1 text-sm text-text-muted">
                          {budget.amount_spent} / {budget.amount_limit ?? '∞'} {budget.currency}
                        </p>
                      </div>
                      <Badge>{budget.currency}</Badge>
                    </div>
                  </Card>
                </li>
              ))
            : segment === 'reminders'
              ? reminders.map((reminder) => (
                  <li key={reminder.id}>
                    <Card padding="md">
                      <h2 className="font-medium text-text">{reminder.title}</h2>
                      <p className="mt-1 text-sm text-text-muted">
                        {formatInAppTz(reminder.remind_at)}
                      </p>
                      {!reminder.is_active ? <Badge variant="warning">Inaktiv</Badge> : null}
                    </Card>
                  </li>
                ))
              : filteredEntities.map((entity) => {
                  const meta = getEntityTypeMeta(entity.entity_type)
                  return (
                    <li key={entity.id}>
                      <Link to={entityDetailPath(entity.entity_type, entity.id)}>
                        <Card interactive padding="md">
                          <div className="flex items-start gap-3">
                            <span className="text-primary">{meta.icon}</span>
                            <div className="min-w-0 flex-1">
                              <h2 className="font-medium text-text">{entity.title}</h2>
                              <p className="mt-0.5 text-sm text-text-muted">
                                {formatEntityDateRange(entity) ?? meta.label}
                              </p>
                            </div>
                            <Badge variant="primary">
                              {meta.statusLabels[entity.status]}
                            </Badge>
                          </div>
                        </Card>
                      </Link>
                    </li>
                  )
                })}
        </ul>
      )}

      <Modal open={budgetOpen} onClose={() => setBudgetOpen(false)} title="Budget erstellen">
        <BudgetFormFields values={budgetForm} onChange={setBudgetForm} />
        <Button
          className="mt-4"
          fullWidth
          loading={createBudgetMutation.isPending}
          onClick={() => createBudgetMutation.mutate()}
          disabled={!budgetForm.name.trim()}
        >
          Speichern
        </Button>
      </Modal>

      <Modal
        open={reminderOpen}
        onClose={() => {
          setReminderOpen(false)
          setReminderError(null)
        }}
        title="Erinnerung erstellen"
      >
        {reminderError ? (
          <p className="mb-3 rounded-lg bg-error-subtle px-3 py-2 text-sm text-error" role="alert">
            {reminderError}
          </p>
        ) : null}
        <ReminderFormFields values={reminderForm} onChange={setReminderForm} />
        <Button
          className="mt-4"
          fullWidth
          loading={createReminderMutation.isPending}
          onClick={() => createReminderMutation.mutate()}
          disabled={
            !reminderForm.title.trim() ||
            (reminderForm.mode === 'absolute' && !reminderForm.remindAt)
          }
        >
          Speichern
        </Button>
      </Modal>
    </div>
  )
}
