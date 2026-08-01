import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { daysTogether, usePairProfile } from '@/features/space/pair-profile'
import { listActivityLog } from '@/lib/indexed-db/repositories/activity-log'
import { formatInAppTz } from '@/lib/dates/timezone'

const ACTION_LABELS: Record<string, string> = {
  create: 'Erstellt',
  update: 'Aktualisiert',
  soft_delete: 'Gelöscht',
  restore: 'Wiederhergestellt',
}

export function WePage() {
  const navigate = useNavigate()
  const { spaceId } = useAuth()
  const { data: pair } = usePairProfile()
  const together = daysTogether(pair?.togetherSince ?? null)

  const { data: activity = [], isLoading: activityLoading } = useQuery({
    queryKey: ['activity-log', spaceId],
    queryFn: () => listActivityLog(spaceId!),
    enabled: !!spaceId,
  })

  return (
    <div className="mx-auto max-w-2xl px-page py-8">
      <header className="mb-8">
        <h1 className="font-serif text-3xl text-text">Beziehung</h1>
        <p className="mt-2 text-text-muted">
          {pair
            ? `${pair.partnerAName} & ${pair.partnerBName}${together !== null ? ` · ${together} Tage` : ''}`
            : 'Euer gemeinsamer Bereich — Dates, Journal und Einstellungen.'}
        </p>
      </header>

      <div className="mb-10 grid gap-[var(--card-stack-gap)] sm:grid-cols-2">
        <Card
          interactive
          padding="md"
          onClick={() => void navigate('/module/beziehung')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') void navigate('/module/beziehung')
          }}
        >
          <h2 className="font-medium text-text">Beziehung</h2>
          <p className="mt-1 text-sm text-text-muted">Dates, Wünsche, Journal</p>
        </Card>
        <Card
          interactive
          padding="md"
          onClick={() => void navigate('/settings/pair')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') void navigate('/settings/pair')
          }}
        >
          <h2 className="font-medium text-text">Paarprofil</h2>
          <p className="mt-1 text-sm text-text-muted">Fotos, Namen, Startdatum</p>
        </Card>
        <Card
          interactive
          padding="md"
          onClick={() => void navigate('/settings/profile')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') void navigate('/settings/profile')
          }}
        >
          <h2 className="font-medium text-text">Profil</h2>
          <p className="mt-1 text-sm text-text-muted">Foto, Name und persönliche Angaben</p>
        </Card>
        <Card
          interactive
          padding="md"
          onClick={() => void navigate('/settings')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') void navigate('/settings')
          }}
        >
          <h2 className="font-medium text-text">Einstellungen</h2>
          <p className="mt-1 text-sm text-text-muted">Benachrichtigungen, Sync und mehr</p>
        </Card>
      </div>

      <section>
        <h2 className="mb-4 font-medium text-text">Letzte Aktivität</h2>
        {activityLoading ? (
          <LoadingState label="Aktivität wird geladen…" />
        ) : activity.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {activity.map((entry) => (
              <li key={entry.id} className="rounded-[16px] border border-border bg-surface px-4 py-3">
                <p className="text-sm text-text">
                  {ACTION_LABELS[entry.action] ?? entry.action}{' '}
                  <span className="text-text-muted">{entry.resource_type}</span>
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {formatInAppTz(entry.created_at, 'dd.MM.yyyy HH:mm')}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Noch ruhig hier"
            description="Neue gemeinsame Einträge erscheinen hier als Aktivität — ohne fremde Einladungen."
            actionLabel="Zum Dashboard"
            onAction={() => void navigate('/')}
          />
        )}
      </section>
    </div>
  )
}
