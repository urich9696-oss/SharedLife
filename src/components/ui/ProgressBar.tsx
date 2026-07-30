import { cn } from '@/lib/utilities/cn'

export interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showValue?: boolean
  className?: string
  size?: 'sm' | 'md'
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  className,
  size = 'md',
}: ProgressBarProps) {
  const clamped = Math.min(max, Math.max(0, value))
  const percent = max > 0 ? (clamped / max) * 100 : 0

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          {label ? <span className="text-text">{label}</span> : <span />}
          {showValue ? (
            <span className="text-text-muted tabular-nums">{Math.round(percent)}%</span>
          ) : null}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className={cn(
          'w-full overflow-hidden rounded-full bg-sand/40',
          size === 'sm' ? 'h-1.5' : 'h-2.5',
        )}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
