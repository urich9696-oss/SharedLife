import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utilities/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, id, disabled, rows = 3, ...props }, ref) => {
    const generatedId = useId()
    const textareaId = id ?? generatedId

    return (
      <div className="flex flex-col">
        {label ? (
          <label htmlFor={textareaId} className="text-label px-0 pb-2">
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
            'w-full resize-none border-0 border-b border-border/90 bg-transparent px-0 pb-4 pt-0 text-base text-text sm:text-[17px]',
            'placeholder:text-text-muted/70 transition-[border-color,box-shadow] duration-[var(--duration-fast)]',
            'rounded-none shadow-none outline-none',
            'focus-visible:border-primary focus-visible:shadow-[0_1px_0_0_var(--color-primary)]',
            'disabled:cursor-not-allowed disabled:text-disabled',
            error && 'border-error focus-visible:border-error focus-visible:shadow-[0_1px_0_0_var(--color-error)]',
            className,
          )}
          {...props}
        />
        {hint && !error ? (
          <p id={`${textareaId}-hint`} className="pt-2 text-sm text-text-muted">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={`${textareaId}-error`} className="pt-2 text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
