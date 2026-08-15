import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { entityDetailPath } from '@/features/entities/entity-types'
import { useSync } from '@/features/sync/SyncProvider'
import {
  openSafeExternalUrl,
  openWishLinkLabel,
  parseSafeExternalUrl,
} from '@/features/wishes/wish-url'
import {
  wishPriorityLabel,
  wishPriorityTone,
} from '@/features/wishes/wish-priority'
import { db } from '@/lib/indexed-db/db'
import { listEntities } from '@/lib/indexed-db/repositories/entities'
import { cn } from '@/lib/utilities/cn'

function wishStatusLabel(status: string): string {
  if (status === 'bought') return 'Gekauft'
  if (status === 'reserved') return 'Reserviert'
  return 'Offen'
}

export function WishesPage() {
  const navigate = useNavigate()
  const { spaceId } = useAuth()
  const { flushNow, online } = useSync()

  const {
    data: entities = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['entities', spaceId],
    queryFn: () => listEntities(spaceId!),
    enabled: Boolean(spaceId),
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  const { data: wishDetails = {} } = useQuery({
    queryKey: ['wish-details', spaceId],
    enabled: Boolean(spaceId),
    queryFn: async () => {
      const details = await db.entityDetails
        .filter((d) => d.detail_type === 'wish')
        .toArray()
      const map: Record<string, Record<string, unknown>> = {}
      for (const d of details) map[d.entity_id] = d.payload ?? {}
      return map
    },
  })

  const wishes = useMemo(
    () =>
      entities
        .filter((e) => (e.entity_type === 'wish' || e.entity_type === 'gift') && !e.deleted_at)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [entities],
  )

  useEffect(() => {
    if (!online) return
    let cancelled = false
    const tick = async () => {
      try {
        await flushNow()
      } catch {
        // ignore
      }
      if (!cancelled) await refetch()
    }
    void tick()
    const id = window.setInterval(() => void tick(), 8_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [online, flushNow, refetch])

  const openCreate = () => {
    void navigate('/planen/neu?type=wish')
  }

  if (isLoading) return <LoadingState label="Wünsche werden geladen…" />

  return (
    <div className="mx-auto max-w-3xl px-page py-6 lg:py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-text">Wünsche</h1>
          <p className="mt-2 text-sm text-text-muted">
            Gemeinsame Wünsche — Link direkt öffnen, Details separat.
          </p>
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          Neu
        </Button>
      </header>

      {wishes.length === 0 ? (
        <EmptyState
          title="Noch keine Wünsche"
          description="Legt den ersten Wunsch an — er erscheint automatisch beim Partner."
          actionLabel="Wunsch erstellen"
          onAction={openCreate}
        />
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border/80 bg-surface shadow-xs">
          {wishes.map((entity) => {
            const detail = wishDetails[entity.id] ?? {}
            const metaUrl =
              (detail.url as string | undefined) ||
              (entity.metadata?.url as string | undefined) ||
              (entity.metadata?.link as string | undefined) ||
              ''
            const safe = parseSafeExternalUrl(metaUrl)
            const linkLabel = openWishLinkLabel(safe)
            const status = String(entity.metadata?.wishStatus || detail.wishStatus || 'open')
            const priority = detail.priority ?? entity.metadata?.priority
            const detailPath = entityDetailPath(
              entity.entity_type === 'gift' ? 'wish' : entity.entity_type,
              entity.id,
            )

            return (
              <li key={entity.id} className="border-b border-border/60 last:border-b-0">
                <div className="flex items-stretch gap-1">
                  <Link
                    to={detailPath}
                    className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 py-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] font-medium leading-snug text-text">
                        {entity.title || 'Ohne Titel'}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium',
                            wishPriorityTone(priority),
                          )}
                        >
                          {wishPriorityLabel(priority)}
                        </span>
                        <span className="text-[13px] text-text-muted">
                          {wishStatusLabel(status)}
                        </span>
                      </span>
                    </span>
                  </Link>
                  {safe && linkLabel ? (
                    <button
                      type="button"
                      className="flex min-h-14 min-w-14 shrink-0 flex-col items-center justify-center gap-0.5 px-2 text-primary"
                      aria-label={linkLabel}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!openSafeExternalUrl(safe.href)) {
                          window.alert('Dieser Link kann nicht geöffnet werden.')
                        }
                      }}
                    >
                      <ExternalLink size={18} strokeWidth={1.75} aria-hidden />
                      <span className="max-w-[4.5rem] truncate text-[10px] font-medium leading-tight">
                        Öffnen
                      </span>
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
