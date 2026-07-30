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
          'flex cursor-pointer items-start gap-3',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        <span className="relative mt-0.5 inline-flex shrink-0">
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
              'block h-6 w-11 rounded-full bg-sand/60 transition-colors duration-200',
              'peer-checked:bg-primary peer-focus-visible:shadow-focus',
              'peer-disabled:bg-disabled-bg',
            )}
          />
          <span
            aria-hidden="true"
            className={cn(
              'absolute left-0.5 top-0.5 size-5 rounded-full bg-surface shadow-sm',
              'transition-transform duration-200 ease-out motion-reduce:transition-none',
              'peer-checked:translate-x-5',
            )}
          />
        </span>
        {(label || description) && (
          <span className="flex flex-col gap-0.5">
            {label ? <span className="text-sm font-medium text-text">{label}</span> : null}
            {description ? (
              <span className="text-sm text-text-muted">{description}</span>
            ) : null}
          </span>
        )}
      </label>
    )
  },
)

Switch.displayName = 'Switch'
