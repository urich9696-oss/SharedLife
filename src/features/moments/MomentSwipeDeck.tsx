import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { motion, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import { MediaImage } from '@/features/media/MediaImage'
import { cn } from '@/lib/utilities/cn'

export interface MomentDeckCard {
  id: string
  title: string
  occurredAt: string
  location?: string | null
  storagePath?: string | null
  entityId?: string | null
  entityType?: string | null
}

interface MomentSwipeDeckProps {
  items: MomentDeckCard[]
  spaceId: string
  onOpen?: (item: MomentDeckCard) => void
}

const SWIPE_THRESHOLD = 110

export function MomentSwipeDeck({ items, spaceId, onOpen }: MomentSwipeDeckProps) {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [exitDir, setExitDir] = useState<null | 'left' | 'right'>(null)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 0, 220], [-10, 0, 10])
  const opacity = useTransform(x, [-220, 0, 220], [0.55, 1, 0.55])
  const lock = useRef(false)

  const current = items[index]
  const next = items[index + 1]
  const after = items[index + 2]

  const goNext = useCallback(
    (dir: 'left' | 'right') => {
      if (lock.current || !current) return
      if (index >= items.length - 1 && dir) {
        // wrap soft stop
      }
      lock.current = true
      setExitDir(dir)
      window.setTimeout(() => {
        setIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0)))
        setExitDir(null)
        x.set(0)
        lock.current = false
      }, 280)
    },
    [current, index, items.length, x],
  )

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      goNext('right')
      return
    }
    if (info.offset.x < -SWIPE_THRESHOLD) {
      goNext('left')
    }
  }

  if (!current) return null

  const openCurrent = () => {
    if (onOpen) {
      onOpen(current)
      return
    }
    if (current.entityId && current.entityType) {
      void navigate(`/entities/${current.entityType}/${current.entityId}`)
      return
    }
    void navigate('/erinnerungen')
  }

  const stack = [after, next, current].filter(Boolean) as MomentDeckCard[]

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="relative aspect-[3/4] w-full">
        {stack.map((item, stackIdx) => {
          const isTop = item.id === current.id
          const depth = stack.length - 1 - stackIdx
          return (
            <motion.div
              key={item.id}
              className={cn(
                'absolute inset-0 overflow-hidden rounded-[32px] border border-border/70 bg-surface shadow-lg',
                !isTop && 'pointer-events-none',
              )}
              style={
                isTop
                  ? { x, rotate, opacity, zIndex: 10 }
                  : {
                      scale: 1 - depth * 0.04,
                      y: depth * 12,
                      zIndex: 10 - depth,
                    }
              }
              drag={isTop ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.9}
              onDragEnd={isTop ? handleDragEnd : undefined}
              animate={
                isTop && exitDir
                  ? { x: exitDir === 'left' ? -420 : 420, opacity: 0 }
                  : undefined
              }
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onClick={isTop ? openCurrent : undefined}
            >
              <div className="absolute inset-0 bg-[linear-gradient(145deg,#eceae6,#e7ebf0)]" />
              {item.storagePath ? (
                <MediaImage
                  storagePath={item.storagePath}
                  spaceId={spaceId}
                  alt={item.title}
                  className="absolute inset-0 rounded-none"
                  aspectRatio={3 / 4}
                  lazy={!isTop}
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-text/65 via-text/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-surface sm:p-6">
                <p className="font-serif text-3xl leading-tight">{item.title}</p>
                <p className="mt-2 text-sm text-surface/90">
                  {format(parseISO(item.occurredAt), 'd. MMMM yyyy', { locale: de })}
                  {item.location ? ` · ${item.location}` : ''}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 px-1">
        <button
          type="button"
          className="min-h-11 rounded-[16px] px-4 text-sm font-medium text-text-muted"
          onClick={() => goNext('left')}
          disabled={index >= items.length - 1}
        >
          Zurück
        </button>
        <p className="text-xs text-text-muted">
          {Math.min(index + 1, items.length)} / {items.length}
        </p>
        <button
          type="button"
          className="min-h-11 rounded-[16px] px-4 text-sm font-medium text-text-muted"
          onClick={() => goNext('right')}
          disabled={index >= items.length - 1}
        >
          Weiter
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-text-muted">Wischen — jedes Bild ist eine Karte</p>
    </div>
  )
}
