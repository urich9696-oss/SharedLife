import { useOnlineStatus } from '@/app/providers'
import { cn } from '@/lib/utilities/cn'

export function OnlineStatusBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div
      role="status"
      className={cn(
        'fixed inset-x-0 top-0 z-[var(--z-toast)]',
        'bg-warning text-surface px-4 py-2 text-center text-sm font-medium',
        'pt-[calc(var(--space-safe-top)+var(--space-2))]',
      )}
    >
      Du bist offline — Änderungen werden synchronisiert, sobald du wieder online bist.
    </div>
  )
}
