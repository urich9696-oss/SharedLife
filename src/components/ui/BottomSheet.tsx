import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  type PanInfo,
} from 'motion/react'
import { cn } from '@/lib/utilities/cn'
import {
  clampSheetDragY,
  shouldDismissSheet,
} from '@/components/ui/bottom-sheet-gesture'

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
  const scrollRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const closingRef = useRef(false)
  const y = useMotionValue(0)
  const dragControls = useDragControls()
  const reduceMotion = useReducedMotion()
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) {
      y.set(0)
      closingRef.current = false
      setDragging(false)
      return
    }
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
  }, [open, y])

  const closeWithMotion = () => {
    if (closingRef.current) return
    closingRef.current = true
    const distance = typeof window !== 'undefined' ? window.innerHeight : 640
    void animate(y, distance, {
      duration: reduceMotion ? 0.08 : 0.22,
      ease: [0.22, 1, 0.36, 1],
    }).then(() => {
      onCloseRef.current()
      y.set(0)
      closingRef.current = false
    })
  }

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setDragging(false)
    const offsetY = clampSheetDragY(info.offset.y)
    if (shouldDismissSheet(offsetY, info.velocity.y)) {
      closeWithMotion()
      return
    }
    void animate(y, 0, {
      type: reduceMotion ? 'tween' : 'spring',
      duration: reduceMotion ? 0.12 : undefined,
      stiffness: 420,
      damping: 36,
    })
  }

  const startDragFromHandle = (event: ReactPointerEvent) => {
    dragControls.start(event)
  }

  const startDragFromContent = (event: ReactPointerEvent) => {
    const node = scrollRef.current
    if (!node || node.scrollTop > 0) return
    dragControls.start(event)
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-overlay"
        aria-label="Schliessen"
        onClick={() => onCloseRef.current()}
      />
      <motion.div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        style={{ y }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 420 }}
        dragElastic={{ top: 0, bottom: 0.12 }}
        onDragStart={() => setDragging(true)}
        onDragEnd={handleDragEnd}
        onPointerCancel={() => {
          setDragging(false)
          void animate(y, 0, { type: 'spring', stiffness: 420, damping: 36 })
        }}
        className={cn(
          'relative z-10 flex w-full max-w-lg flex-col',
          'max-h-[min(92dvh,100%)] rounded-t-lg border border-border/80 bg-surface/95 shadow-lg backdrop-blur-xl',
          'pb-[calc(var(--space-safe-bottom)+var(--space-4))] pt-2',
          !dragging &&
            'motion-safe:animate-[slideUpSheet_var(--duration-slow)_var(--ease-out)]',
          'focus:outline-none',
          className,
        )}
        data-testid="bottom-sheet"
      >
        <div
          className="flex shrink-0 cursor-grab touch-none flex-col items-center active:cursor-grabbing"
          onPointerDown={startDragFromHandle}
          data-testid="bottom-sheet-handle"
          aria-hidden="true"
        >
          <div className="flex min-h-11 w-full items-center justify-center pt-1">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>
        </div>
        {title ? (
          <h2
            id={titleId}
            className="shrink-0 px-5 pb-4 text-xl font-bold tracking-[-0.025em] text-text sm:px-6"
          >
            {title}
          </h2>
        ) : null}
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 touch-pan-y sm:px-6"
          onPointerDown={startDragFromContent}
          data-testid="bottom-sheet-scroll"
        >
          {children}
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
