import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utilities/cn'
import {
  CONTENT_DRAG_ARM_DISTANCE_PX,
  clampSheetDragY,
  isSheetInteractiveTarget,
  pointerVelocityY,
  shouldArmContentSheetDrag,
  shouldDismissSheet,
} from '@/components/ui/bottom-sheet-gesture'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

interface DragTrack {
  pointerId: number
  startY: number
  lastY: number
  lastT: number
  armed: boolean
  fromHandle: boolean
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
  const trackRef = useRef<DragTrack | null>(null)
  const y = useMotionValue(0)
  const reduceMotion = useReducedMotion()
  const [dragging, setDragging] = useState(false)
  /** Verhindert erneutes Abspielen der Öffnungsanimation nach Drag. */
  const [suppressEnterAnim, setSuppressEnterAnim] = useState(false)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) {
      y.set(0)
      closingRef.current = false
      trackRef.current = null
      setDragging(false)
      setSuppressEnterAnim(false)
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
    setSuppressEnterAnim(true)
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

  const endDrag = (clientY: number, timeMs: number) => {
    const track = trackRef.current
    trackRef.current = null
    if (!track?.armed) {
      setDragging(false)
      return
    }
    setDragging(false)
    const offsetY = clampSheetDragY(clientY - track.startY)
    const velocityY = pointerVelocityY(track.lastY, clientY, track.lastT, timeMs)
    if (shouldDismissSheet(offsetY, velocityY)) {
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

  const onHandlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    setSuppressEnterAnim(true)
    setDragging(true)
    const now = performance.now()
    trackRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastT: now,
      armed: true,
      fromHandle: true,
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // jsdom / ältere Engines
    }
  }

  const onContentPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    if (isSheetInteractiveTarget(event.target)) return
    const node = scrollRef.current
    if (!node || node.scrollTop > 0) return
    const now = performance.now()
    trackRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastT: now,
      armed: false,
      fromHandle: false,
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (!track || track.pointerId !== event.pointerId) return

    const now = performance.now()
    const deltaY = event.clientY - track.startY

    if (!track.armed) {
      if (
        !shouldArmContentSheetDrag({
          scrollTop: scrollRef.current?.scrollTop ?? 0,
          deltaY,
        })
      ) {
        // Klare Aufwärtsbewegung: Tracking verwerfen, normales Scrollen erlauben
        if (deltaY <= -CONTENT_DRAG_ARM_DISTANCE_PX) {
          trackRef.current = null
        }
        return
      }
      track.armed = true
      setSuppressEnterAnim(true)
      setDragging(true)
      try {
        scrollRef.current?.setPointerCapture(event.pointerId)
      } catch {
        // jsdom / ältere Engines
      }
    }

    track.lastY = event.clientY
    track.lastT = now
    y.set(clampSheetDragY(deltaY))
    if (track.armed) {
      event.preventDefault()
    }
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (!track || track.pointerId !== event.pointerId) return
    endDrag(event.clientY, performance.now())
  }

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (!track || track.pointerId !== event.pointerId) return
    trackRef.current = null
    setDragging(false)
    void animate(y, 0, { type: 'spring', stiffness: 420, damping: 36 })
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
        className={cn(
          'relative z-10 flex w-full max-w-lg flex-col',
          'max-h-[min(92dvh,100%)] rounded-t-lg border border-border/80 bg-surface/95 shadow-lg backdrop-blur-xl',
          'pb-[calc(var(--space-safe-bottom)+var(--space-4))] pt-2',
          !suppressEnterAnim &&
            'motion-safe:animate-[slideUpSheet_var(--duration-slow)_var(--ease-out)]',
          'focus:outline-none',
          className,
        )}
        data-testid="bottom-sheet"
        data-dragging={dragging ? 'true' : 'false'}
        data-enter-anim={suppressEnterAnim ? 'off' : 'on'}
      >
        <div
          className="flex shrink-0 cursor-grab touch-none flex-col items-center active:cursor-grabbing"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
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
          onPointerDown={onContentPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          data-testid="bottom-sheet-scroll"
        >
          {children}
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
