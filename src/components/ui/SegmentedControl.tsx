import { cn } from '@/lib/utilities/cn'

export interface SegmentedOption<T extends string> {
  key: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'grid gap-1 rounded-[18px] border border-border bg-surface-soft/70 p-1',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={value === item.key}
          onClick={() => onChange(item.key)}
          className={cn(
            'min-h-11 rounded-[14px] px-2 text-sm font-medium transition duration-200',
            value === item.key
              ? 'bg-surface text-text shadow-xs'
              : 'text-text-muted hover:text-text',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
