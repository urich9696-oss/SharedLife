import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { cn } from '@/lib/utilities/cn'
import { getTripCountdown, type TripCountdown as TripCountdownModel } from '@/features/trips/trip-countdown'
import type { EntityRow } from '@/lib/indexed-db/schema'

export function TripCountdownCard({
  entity,
  className,
  now,
}: {
  entity: Pick<EntityRow, 'starts_at' | 'ends_at' | 'all_day_start' | 'all_day_end'>
  className?: string
  now?: Date
}) {
  const countdown = getTripCountdown(entity, now)
  if (countdown.phase === 'none' || countdown.daysUntilStart === null) return null

  const showBigNumber = countdown.phase === 'upcoming' || countdown.phase === 'today'
  const numberLabel =
    countdown.phase === 'today'
      ? '0'
      : String(Math.max(0, countdown.daysUntilStart))

  return (
    <div
      className={cn(
        'rounded-lg border border-border/70 bg-surface px-6 py-5 shadow-xs',
        className,
      )}
      aria-label={`Countdown: ${countdown.label ?? ''}`}
    >
      <p className="text-[11.5px] font-medium uppercase tracking-[0.14em] text-text-muted">
        Countdown
      </p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div className="min-w-0">
          {showBigNumber ? (
            <p className="font-numeric text-[2.5rem] font-semibold leading-none tracking-[-0.04em] text-text">
              {numberLabel}
              <span className="ml-2 text-lg font-medium text-text-muted">
                {countdown.phase === 'today'
                  ? 'Tage'
                  : countdown.daysUntilStart === 1
                    ? 'Tag'
                    : 'Tage'}
              </span>
            </p>
          ) : (
            <p className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-text">
              {countdown.label}
            </p>
          )}
          <p className="mt-2 text-[15px] text-text-muted">
            {countdown.detail}
            {countdown.start
              ? ` · ${format(countdown.start, 'd. MMMM yyyy', { locale: de })}`
              : ''}
          </p>
        </div>
      </div>
    </div>
  )
}

export function TripCountdownBadge({
  entity,
  className,
  now,
}: {
  entity: Pick<EntityRow, 'starts_at' | 'ends_at' | 'all_day_start' | 'all_day_end'>
  className?: string
  now?: Date
}) {
  const countdown = getTripCountdown(entity, now)
  if (!countdown.label || countdown.phase === 'none') return null

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
        countdown.phase === 'upcoming' || countdown.phase === 'today'
          ? 'bg-primary/12 text-primary'
          : countdown.phase === 'ongoing'
            ? 'bg-pastel-1 text-text'
            : 'bg-surface-soft text-text-muted',
        className,
      )}
    >
      {countdown.label}
    </span>
  )
}

export function tripCountdownOf(
  entity: Pick<EntityRow, 'starts_at' | 'ends_at' | 'all_day_start' | 'all_day_end'>,
  now?: Date,
): TripCountdownModel {
  return getTripCountdown(entity, now)
}
