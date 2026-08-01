import { cn } from '@/lib/utilities/cn'

export interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
  className?: string
}

const sizeStyles = {
  sm: { icon: 'size-8 text-base', wordmark: 'text-lg' },
  md: { icon: 'size-10 text-lg', wordmark: 'text-xl' },
  lg: { icon: 'size-14 text-2xl', wordmark: 'text-3xl' },
}

export function AppLogo({
  size = 'md',
  showWordmark = true,
  className,
}: AppLogoProps) {
  const styles = sizeStyles[size]

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-[14px] bg-primary font-bold tracking-[-0.03em] text-surface shadow-xs',
          styles.icon,
        )}
        aria-hidden="true"
      >
        S
      </div>
      {showWordmark ? (
        <span
          className={cn(
            'font-bold leading-none tracking-[-0.03em] text-text',
            styles.wordmark,
          )}
        >
          SharedLife
        </span>
      ) : null}
    </div>
  )
}
