import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
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
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Only re-run when `open` changes. Callers pass unstable onClose lambdas;
  // including them would re-focus the dialog and dismiss the mobile keyboard
  // after every controlled-input keystroke.
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center',
        'px-[max(var(--page-gutter),var(--space-safe-left))] pr-[max(var(--page-gutter),var(--space-safe-right))]',
        'pt-[max(var(--page-gutter),var(--space-safe-top))] pb-[max(var(--page-gutter),var(--space-safe-bottom))]',
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
          'max-h-[min(90dvh,100%)] overflow-hidden rounded-t-lg border border-border/80 bg-surface shadow-lg sm:rounded-lg',
          'motion-safe:animate-[slideUp_var(--duration-normal)_var(--ease-out)]',
          'focus:outline-none',
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-3 pt-6 sm:px-6">
          <div className="min-w-0">
            {title ? (
              <h2 id={titleId} className="text-xl font-bold tracking-[-0.025em] text-text">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p
                id={descriptionId}
                className="mt-[var(--heading-content-gap)] text-sm font-medium text-text-muted"
              >
                {description}
              </p>
            ) : null}
          </div>
          <IconButton
            label="Schliessen"
            icon={<X size={20} strokeWidth={1.75} />}
            onClick={onClose}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 sm:px-6">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
