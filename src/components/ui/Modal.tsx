import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utilities/cn'
import { IconButton } from '@/components/ui/IconButton'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  className?: string
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center',
        'px-[max(1rem,var(--space-safe-left))] pr-[max(1rem,var(--space-safe-right))]',
        'pt-[max(1rem,var(--space-safe-top))] pb-[max(1rem,var(--space-safe-bottom))]',
      )}
    >
      <button
        type="button"
        className="absolute inset-0 bg-overlay motion-safe:animate-[fadeIn_var(--duration-normal)_var(--ease-out)]"
        aria-label="Schliessen"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'relative z-10 flex w-full max-w-md flex-col',
          'max-h-[min(90dvh,100%)] overflow-hidden rounded-t-xl border border-border bg-surface shadow-lg sm:rounded-xl',
          'motion-safe:animate-[slideUp_var(--duration-normal)_var(--ease-out)]',
          'focus:outline-none',
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-2 pt-5 sm:px-6">
          <div className="min-w-0">
            {title ? (
              <h2 id={titleId} className="font-serif text-xl text-text">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <IconButton
            label="Schliessen"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            }
            onClick={onClose}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
