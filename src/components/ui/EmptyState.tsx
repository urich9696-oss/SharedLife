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

function DefaultIllustration() {
  return (
    <svg
      width="88"
      height="72"
      viewBox="0 0 88 72"
      fill="none"
      aria-hidden="true"
      className="text-primary/70"
    >
      <rect
        x="8"
        y="14"
        width="56"
        height="44"
        rx="14"
        stroke="currentColor"
        strokeWidth="1.75"
        className="text-sand"
        fill="color-mix(in srgb, var(--color-pastel-1) 70%, white)"
      />
      <rect
        x="24"
        y="8"
        width="56"
        height="44"
        rx="14"
        stroke="currentColor"
        strokeWidth="1.75"
        fill="color-mix(in srgb, var(--color-surface) 90%, white)"
      />
      <circle cx="42" cy="28" r="6" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M30 44c3.5-6 10-9 16-9s12.5 3 16 9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
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
        'flex flex-col items-center justify-center px-8 py-16 text-center',
        className,
      )}
    >
      <div
        className="mb-8 flex size-24 items-center justify-center rounded-lg bg-[linear-gradient(160deg,var(--color-pastel-1),var(--color-pastel-2))] text-primary shadow-xs"
        aria-hidden="true"
      >
        {icon ?? <DefaultIllustration />}
      </div>
      <h2 className="max-w-sm text-balance text-2xl font-bold tracking-[-0.025em] text-text">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 max-w-sm text-balance text-[17px] leading-normal text-text-muted">
          {description}
        </p>
      ) : null}
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-8 flex w-full max-w-xs flex-col gap-4 sm:max-w-none sm:flex-row sm:justify-center">
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
