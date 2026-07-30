import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utilities/cn'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      hint,
      error,
      options,
      placeholder,
      id,
      disabled,
      ...props
    },
    ref,
  ) => {
    const selectId =
      id ?? (label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={selectId} className="text-sm font-medium text-text">
            {label}
          </label>
        ) : null}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined
            }
            className={cn(
              'h-11 w-full appearance-none rounded-lg border border-border bg-surface px-4 pr-10 text-text',
              'transition-[border-color,box-shadow] duration-200',
              'hover:border-border focus-visible:border-focus focus-visible:shadow-focus',
              'disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled',
              error && 'border-error focus-visible:border-error',
              className,
            )}
            {...props}
          >
            {placeholder ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {hint && !error ? (
          <p id={`${selectId}-hint`} className="text-sm text-text-muted">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={`${selectId}-error`} className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    )
  },
)

Select.displayName = 'Select'
