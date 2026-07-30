import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utilities/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, id, disabled, rows = 4, ...props }, ref) => {
    const textareaId =
      id ?? (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={textareaId} className="text-sm font-medium text-text">
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined
          }
          className={cn(
            'w-full resize-y rounded-lg border border-border bg-surface px-4 py-3 text-text',
            'placeholder:text-text-muted transition-[border-color,box-shadow] duration-200',
            'hover:border-border focus-visible:border-focus focus-visible:shadow-focus',
            'disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled',
            error && 'border-error focus-visible:border-error',
            className,
          )}
          {...props}
        />
        {hint && !error ? (
          <p id={`${textareaId}-hint`} className="text-sm text-text-muted">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={`${textareaId}-error`} className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
