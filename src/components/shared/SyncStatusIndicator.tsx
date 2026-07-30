import { useSyncStatus } from '@/app/providers'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utilities/cn'

const statusConfig = {
  idle: { label: 'Synchronisiert', variant: 'success' as const },
  syncing: { label: 'Synchronisiert…', variant: 'primary' as const },
  error: { label: 'Sync-Fehler', variant: 'error' as const },
  offline: { label: 'Offline', variant: 'warning' as const },
}

export interface SyncStatusIndicatorProps {
  className?: string
  compact?: boolean
}

export function SyncStatusIndicator({ className, compact = false }: SyncStatusIndicatorProps) {
  const status = useSyncStatus()
  const config = statusConfig[status]

  if (compact) {
    return (
      <span
        className={cn('inline-block size-2 rounded-full', className)}
        title={config.label}
        aria-label={config.label}
        data-status={status}
        style={{
          backgroundColor:
            status === 'idle'
              ? 'var(--color-success)'
              : status === 'syncing'
                ? 'var(--color-primary)'
                : status === 'error'
                  ? 'var(--color-error)'
                  : 'var(--color-warning)',
        }}
      />
    )
  }

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
