import {
  useCallback,
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
    sheetRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

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
          'relative z-10 w-full max-w-lg rounded-t-xl border border-border bg-surface shadow-lg',
          'pb-[calc(var(--space-safe-bottom)+var(--space-4))] pt-2',
          'motion-safe:animate-[slideUpSheet_var(--duration-slow)_var(--ease-out)]',
          'focus:outline-none',
          className,
        )}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
        {title ? (
          <h2
            id={titleId}
            className="px-6 pb-3 font-serif text-xl text-text"
          >
            {title}
          </h2>
        ) : null}
        <div className="px-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
