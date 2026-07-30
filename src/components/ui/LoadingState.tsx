import { cn } from '@/lib/utilities/cn'

export interface LoadingStateProps {
  label?: string
  className?: string
}

export function LoadingState({
  label = 'Wird geladen…',
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-6 py-16',
        className,
      )}
    >
      <span
        className="size-10 animate-spin rounded-full border-[3px] border-sand border-t-primary"
        aria-hidden="true"
      />
      <p className="text-sm text-text-muted">{label}</p>
    </div>
  )
}
