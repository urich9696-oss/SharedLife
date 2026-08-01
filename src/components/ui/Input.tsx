import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utilities/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

/** Einstellungszeile — kein klassisches Formularfeld */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, disabled, ...props }, ref) => {
    const inputId = id ?? (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

    return (
      <div className="flex flex-col">
        {label ? (
          <label htmlFor={inputId} className="text-label px-0 pb-2">
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
            'w-full border-0 border-b border-border/90 bg-transparent px-0 pb-4 pt-0 text-[17px] font-normal text-text',
            'placeholder:text-text-muted/70 transition-[border-color,box-shadow] duration-[var(--duration-fast)]',
            'rounded-none shadow-none outline-none',
            'focus-visible:border-primary focus-visible:shadow-[0_1px_0_0_var(--color-primary)]',
            'disabled:cursor-not-allowed disabled:text-disabled',
            'appearance-none',
            error && 'border-error focus-visible:border-error focus-visible:shadow-[0_1px_0_0_var(--color-error)]',
            className,
          )}
          {...props}
        />
        {hint && !error ? (
          <p id={`${inputId}-hint`} className="pt-2 text-sm text-text-muted">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={`${inputId}-error`} className="pt-2 text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    )
  },
)

Input.displayName = 'Input'
