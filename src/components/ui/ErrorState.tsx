import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utilities/cn'

export interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  icon?: ReactNode
  className?: string
}

export function ErrorState({
  title = 'Etwas ist schiefgelaufen',
  message = 'Bitte versuche es erneut. Wenn das Problem bleibt, lade die Seite neu.',
  onRetry,
  retryLabel = 'Erneut versuchen',
  icon,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center px-6 py-16 text-center',
        className,
      )}
    >
      <div
        className="mb-6 flex size-16 items-center justify-center rounded-xl bg-error-subtle text-error"
        aria-hidden="true"
      >
        {icon ?? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <h2 className="font-serif text-2xl text-text">{title}</h2>
      <p className="mt-2 max-w-sm text-text-muted">{message}</p>
      {onRetry ? (
        <Button className="mt-8" variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}
