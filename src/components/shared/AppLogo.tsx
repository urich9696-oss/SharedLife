import { cn } from '@/lib/utilities/cn'

export interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
  className?: string
}

const sizeStyles = {
  sm: { icon: 'size-8', wordmark: 'text-lg' },
  md: { icon: 'size-10', wordmark: 'text-xl' },
  lg: { icon: 'size-14', wordmark: 'text-3xl' },
}

/** Schwarzes Outline-Herz — Markenmarke ohne Kartenhintergrund */
export function OutlineHeart({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 25.2c0 0-8.2-5.4-8.2-11.2C7.8 10.6 10.2 8.4 13 8.4c1.55 0 2.62.84 3 1.92.38-1.08 1.45-1.92 3-1.92 2.8 0 5.2 2.2 5.2 5.6 0 5.8-8.2 11.2-8.2 11.2Z"
      />
    </svg>
  )
}

function HeartMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="512" height="512" rx="112" fill="#FAF8F5" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="28"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M256 402
           C256 402 118 312 118 214
           C118 158 158 122 204 122
           C230 122 248 136 256 154
           C264 136 282 122 308 122
           C354 122 394 158 394 214
           C394 312 256 402 256 402Z"
      />
    </svg>
  )
}

export function AppLogo({
  size = 'md',
  showWordmark = true,
  className,
}: AppLogoProps) {
  const styles = sizeStyles[size]

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <HeartMark
        className={cn(
          'shrink-0 rounded-[14px] text-text shadow-xs ring-1 ring-border/60',
          styles.icon,
        )}
      />
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
