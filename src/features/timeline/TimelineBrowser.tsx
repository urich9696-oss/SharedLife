import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { MediaImage } from '@/features/media/MediaImage'
import {
  timelineKindLabel,
  type TimelineItem,
} from '@/features/timeline/derive-timeline'
import { entityDetailPath } from '@/features/entities/entity-types'
import type { EntityType } from '@/lib/indexed-db/schema'
import { cn } from '@/lib/utilities/cn'

interface TimelineBrowserProps {
  items: TimelineItem[]
  index: number
  spaceId: string
  onIndexChange: (index: number) => void
  onClose: () => void
}

const SWIPE_THRESHOLD = 120

export function TimelineBrowser({
  items,
  index,
  spaceId,
  onIndexChange,
  onClose,
}: TimelineBrowserProps) {
  const reduceMotion = useReducedMotion()
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 0, 220], [-8, 0, 8])
  const [dragging, setDragging] = useState(false)

  const current = items[index]
  const next = items[index + 1]
  const prev = items[index - 1]

  const go = useCallback(
    (dir: -1 | 1) => {
      const target = index + dir
      if (target < 0 || target >= items.length) {
        void animate(x, 0, { type: 'spring', stiffness: 420, damping: 32 })
        return
      }
      if (reduceMotion) {
        onIndexChange(target)
        x.set(0)
        return
      }
      void animate(x, dir * -420, { duration: 0.22 }).then(() => {
        onIndexChange(target)
        x.set(0)
      })
    },
    [index, items.length, onIndexChange, reduceMotion, x],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') go(-1)
      if (event.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])

  const preloadPaths = useMemo(
    () => [prev?.storagePath, current?.storagePath, next?.storagePath].filter(Boolean) as string[],
    [prev, current, next],
  )

  if (!current) return null

  const entityLink =
    current.entityId && current.entityType
      ? entityDetailPath(current.entityType as EntityType, current.entityId)
      : current.entityId
        ? `/entities/moment/${current.entityId}`
        : null

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex flex-col bg-text/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Timeline-Browser"
    >
      <div className="flex items-center justify-between px-4 pt-[calc(var(--space-safe-top)+0.75rem)] text-surface">
        <button type="button" className="min-h-11 min-w-11 text-sm" onClick={onClose} aria-label="Schliessen">
          Schliessen
        </button>
        <p className="text-sm opacity-80">
          {index + 1} / {items.length}
        </p>
        <div className="w-11" />
      </div>

      <div className="relative mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-4 pb-8">
        {next ? (
          <div className="absolute inset-x-8 top-8 bottom-16 scale-[0.94] rounded-[22px] bg-surface opacity-50 shadow-md" />
        ) : null}

        <motion.article
          className={cn(
            'relative z-10 w-full overflow-hidden rounded-[22px] border border-border bg-surface shadow-lg',
            dragging && 'cursor-grabbing',
          )}
          style={{ x, rotate: reduceMotion ? 0 : rotate }}
          drag={reduceMotion ? false : 'x'}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.9}
          onDragStart={() => setDragging(true)}
          onDragEnd={(_, info) => {
            setDragging(false)
            if (info.offset.x < -SWIPE_THRESHOLD) go(1)
            else if (info.offset.x > SWIPE_THRESHOLD) go(-1)
            else void animate(x, 0, { type: 'spring', stiffness: 480, damping: 34 })
          }}
        >
          <MediaImage
            storagePath={current.storagePath}
            spaceId={spaceId}
            alt={current.title}
            aspectRatio={4 / 5}
            lazy={false}
            className="rounded-none"
            fallbackLabel="Kein Bild"
          />
          <div className="space-y-2 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {timelineKindLabel(current.kind)}
            </p>
            <h2 className="font-serif text-2xl text-text">{current.title}</h2>
            <p className="text-sm text-text-muted">
              {format(parseISO(current.occurredAt), 'd. MMMM yyyy', { locale: de })}
              {current.location ? ` · ${current.location}` : ''}
            </p>
            {current.body || current.subtitle ? (
              <p className="text-sm leading-relaxed text-text">
                {current.body || current.subtitle}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
              {entityLink ? (
                <Link
                  to={entityLink}
                  className="min-h-11 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
                  onClick={onClose}
                >
                  Zum Eintrag
                </Link>
              ) : null}
            </div>
          </div>
        </motion.article>
      </div>

      <div className="flex items-center justify-center gap-6 pb-[calc(var(--space-safe-bottom)+1rem)]">
        <button
          type="button"
          className="min-h-12 min-w-12 rounded-full border border-surface/40 bg-surface/15 text-surface disabled:opacity-40"
          aria-label="Vorheriger Eintrag"
          disabled={index <= 0}
          onClick={() => go(-1)}
        >
          ←
        </button>
        <button
          type="button"
          className="min-h-12 min-w-12 rounded-full border border-surface/40 bg-surface/15 text-surface disabled:opacity-40"
          aria-label="Nächster Eintrag"
          disabled={index >= items.length - 1}
          onClick={() => go(1)}
        >
          →
        </button>
      </div>

      {/* Preload adjacent images via hidden resolvers */}
      <div className="sr-only" aria-hidden>
        {preloadPaths.map((path) => (
          <MediaImage key={path} storagePath={path} spaceId={spaceId} alt="" aspectRatio={1} />
        ))}
      </div>
    </div>
  )
}
