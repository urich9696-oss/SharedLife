import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MediaImage } from '@/features/media/MediaImage'
import { cn } from '@/lib/utilities/cn'

export interface HeroCardProps {
  title: string
  subtitle?: string
  eyebrow?: string
  ctaLabel?: string
  href?: string
  mediaPath?: string | null
  spaceId?: string | null
  aspectClassName?: string
  className?: string
  onClick?: () => void
  footer?: ReactNode
  parallax?: boolean
}

export function HeroCard({
  title,
  subtitle,
  eyebrow,
  ctaLabel,
  href,
  mediaPath,
  spaceId,
  aspectClassName = 'aspect-[4/5] max-h-[28rem] sm:aspect-[16/10] sm:max-h-80',
  className,
  onClick,
  footer,
  parallax = true,
}: HeroCardProps) {
  const content = (
    <div
      className={cn(
        'relative overflow-hidden rounded-[32px] border border-border/70 bg-surface shadow-md',
        'transition-transform duration-420 ease-[cubic-bezier(0.22,1,0.36,1)]',
        className,
      )}
    >
      <div className={cn('relative w-full overflow-hidden', aspectClassName)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,var(--color-pastel-1),transparent_42%),radial-gradient(circle_at_82%_24%,var(--color-pastel-2),transparent_38%),linear-gradient(145deg,#f5f4f2,#ebe7e1)]" />
        {mediaPath ? (
          <MediaImage
            storagePath={mediaPath}
            spaceId={spaceId ?? undefined}
            alt={title}
            className={cn(
              'absolute inset-0 rounded-none',
              parallax && 'scale-[1.04] transition-transform duration-560 ease-out will-change-transform',
            )}
            aspectRatio={4 / 5}
            lazy={false}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-text/60 via-text/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-surface sm:p-6">
          {eyebrow ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-surface/75">
              {eyebrow}
            </p>
          ) : null}
          <p className="mt-1 font-serif text-[1.75rem] leading-tight sm:text-3xl">{title}</p>
          {subtitle ? <p className="mt-1.5 text-sm text-surface/90">{subtitle}</p> : null}
          {ctaLabel ? (
            <span className="mt-4 inline-flex min-h-10 items-center rounded-[16px] bg-surface/95 px-4 text-sm font-medium text-text shadow-xs">
              {ctaLabel}
            </span>
          ) : null}
          {footer}
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link
        to={href}
        onClick={onClick}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left">
        {content}
      </button>
    )
  }

  return content
}
