import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utilities/cn'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-16 text-center',
        className,
      )}
    >
      {icon ? (
        <div
          className="mb-6 flex size-16 items-center justify-center rounded-xl bg-sand/30 text-primary"
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}
      <h2 className="font-serif text-2xl text-text text-balance">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-sm text-text-muted text-balance">{description}</p>
      ) : null}
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {actionLabel && onAction ? (
            <Button onClick={onAction}>{actionLabel}</Button>
          ) : null}
          {secondaryActionLabel && onSecondaryAction ? (
            <Button variant="secondary" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}
