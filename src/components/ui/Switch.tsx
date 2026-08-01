import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utilities/cn'

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
  description?: string
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, id, disabled, ...props }, ref) => {
    const switchId = id ?? (label ? `switch-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

    return (
      <label
        htmlFor={switchId}
        className={cn(
          'flex cursor-pointer items-center justify-between gap-6',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        {(label || description) && (
          <span className="flex min-w-0 flex-col gap-1">
            {label ? <span className="text-[17px] font-normal text-text">{label}</span> : null}
            {description ? (
              <span className="text-sm font-medium text-text-muted">{description}</span>
            ) : null}
          </span>
        )}
        <span className="relative inline-flex shrink-0">
          <input
            ref={ref}
            id={switchId}
            type="checkbox"
            role="switch"
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <span
            aria-hidden="true"
            className={cn(
              'block h-8 w-[52px] rounded-full bg-sand/70 transition-colors duration-[var(--duration-fast)]',
              'peer-checked:bg-primary peer-focus-visible:shadow-focus',
              'peer-disabled:bg-disabled-bg',
            )}
          />
          <span
            aria-hidden="true"
            className={cn(
              'absolute left-1 top-1 size-6 rounded-full bg-surface shadow-sm',
              'transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)] motion-reduce:transition-none',
              'peer-checked:translate-x-5',
            )}
          />
        </span>
      </label>
    )
  },
)

Switch.displayName = 'Switch'
