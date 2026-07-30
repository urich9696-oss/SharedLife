import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utilities/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, disabled, ...props }, ref) => {
    const inputId = id ?? (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium text-text">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={cn(
            'h-11 w-full rounded-lg border border-border bg-surface px-4 text-text',
            'placeholder:text-text-muted transition-[border-color,box-shadow] duration-200',
            'hover:border-border focus-visible:border-focus focus-visible:shadow-focus',
            'disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled',
            error && 'border-error focus-visible:border-error',
            className,
          )}
          {...props}
        />
        {hint && !error ? (
          <p id={`${inputId}-hint`} className="text-sm text-text-muted">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={`${inputId}-error`} className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    )
  },
)

Input.displayName = 'Input'
