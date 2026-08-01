import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSync } from '@/features/sync/SyncProvider'
import {
  resolveConflictKeepLocal,
  resolveConflictKeepServer,
} from '@/features/sync/sync-engine'

export function ConflictsPage() {
  const { conflicts, flushNow } = useSync()
  const queryClient = useQueryClient()
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const handleResolve = async (id: string, strategy: 'server' | 'local') => {
    setResolvingId(id)
    try {
      if (strategy === 'server') {
        await resolveConflictKeepServer(id)
      } else {
        await resolveConflictKeepLocal(id)
      }
      await flushNow()
      void queryClient.invalidateQueries()
    } finally {
      setResolvingId(null)
    }
  }

  if (conflicts.length === 0) {
    return (
      <EmptyState
        title="Keine Konflikte"
        description="Wenn Synchronisationskonflikte auftreten, kannst du sie hier auflösen."
      />
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-page py-8">
      <header className="mb-6">
        <h1 className="text-heading">Konflikte</h1>
        <p className="mt-2 text-text-muted">
          Diese Einträge wurden auf mehreren Geräten gleichzeitig bearbeitet.
        </p>
      </header>

      <ul className="flex flex-col gap-4">
        {conflicts.map((conflict) => (
          <li key={conflict.id}>
            <Card padding="md">
              <p className="text-sm font-medium text-text">
                {conflict.resourceType} · {conflict.resourceId.slice(0, 8)}…
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Client v{conflict.clientVersion ?? '—'} vs. Server v{conflict.serverVersion ?? '—'}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-bg p-3">
                  <p className="mb-2 text-xs font-medium text-text-muted">Lokal</p>
                  <pre className="max-h-32 overflow-auto text-xs text-text">
                    {JSON.stringify(conflict.clientPayload, null, 2)}
                  </pre>
                </div>
                <div className="rounded-lg bg-bg p-3">
                  <p className="mb-2 text-xs font-medium text-text-muted">Server</p>
                  <pre className="max-h-32 overflow-auto text-xs text-text">
                    {JSON.stringify(conflict.serverPayload, null, 2)}
                  </pre>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  loading={resolvingId === conflict.id}
                  onClick={() => void handleResolve(conflict.id, 'server')}
                >
                  Server behalten
                </Button>
                <Button
                  size="sm"
                  loading={resolvingId === conflict.id}
                  onClick={() => void handleResolve(conflict.id, 'local')}
                >
                  Lokal behalten
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
