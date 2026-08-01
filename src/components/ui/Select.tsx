import { forwardRef, useId, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
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
    const generatedId = useId()
    const selectId = id ?? generatedId

    return (
      <div className="flex flex-col">
        {label ? (
          <label htmlFor={selectId} className="text-label px-0 pb-2">
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
              'h-auto w-full appearance-none border-0 border-b border-border/90 bg-transparent py-0 pb-4 pr-8 pt-0 text-base text-text sm:text-[17px]',
              'transition-[border-color,box-shadow] duration-[var(--duration-fast)]',
              'rounded-none shadow-none outline-none',
              'focus-visible:border-primary focus-visible:shadow-[0_1px_0_0_var(--color-primary)]',
              'disabled:cursor-not-allowed disabled:text-disabled',
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
          <ChevronDown
            className="pointer-events-none absolute right-0 top-1 size-5 text-text-muted"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </div>
        {hint && !error ? (
          <p id={`${selectId}-hint`} className="pt-2 text-sm text-text-muted">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={`${selectId}-error`} className="pt-2 text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    )
  },
)

Select.displayName = 'Select'
