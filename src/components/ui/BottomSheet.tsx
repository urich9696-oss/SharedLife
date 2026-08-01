import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utilities/cn'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: BottomSheetProps) {
  const titleId = useId()
  const sheetRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Only re-run when `open` changes. Callers pass unstable onClose lambdas;
  // including them would re-focus the sheet and dismiss the mobile keyboard
  // after every controlled-input keystroke.
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    sheetRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-overlay"
        aria-label="Schliessen"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'relative z-10 flex w-full max-w-lg flex-col',
          'max-h-[min(92dvh,100%)] rounded-t-lg border border-border/80 bg-surface/95 shadow-lg backdrop-blur-xl',
          'pb-[calc(var(--space-safe-bottom)+var(--space-4))] pt-2',
          'motion-safe:animate-[slideUpSheet_var(--duration-slow)_var(--ease-out)]',
          'focus:outline-none',
          className,
        )}
      >
        <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-border" aria-hidden="true" />
        {title ? (
          <h2
            id={titleId}
            className="shrink-0 px-5 pb-4 text-xl font-bold tracking-[-0.025em] text-text sm:px-6"
          >
            {title}
          </h2>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 sm:px-6">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
