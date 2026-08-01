import { Link } from 'react-router-dom'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/utilities/cn'

export interface ProgressCardProps {
  title: string
  subtitle?: string
  progress: number
  href: string
  tone?: 'sage' | 'sand' | 'rose' | 'sky'
  className?: string
}

const tones: Record<NonNullable<ProgressCardProps['tone']>, string> = {
  sage: 'bg-pastel-1',
  sand: 'bg-[color-mix(in_srgb,var(--color-sand)_35%,white)]',
  rose: 'bg-pastel-2',
  sky: 'bg-pastel-3',
}

export function ProgressCard({
  title,
  subtitle,
  progress,
  href,
  tone = 'sage',
  className,
}: ProgressCardProps) {
  const value = Math.min(100, Math.max(0, Math.round(progress)))

  return (
    <Link
      to={href}
      className={cn(
        'block min-w-[11.5rem] snap-start rounded-lg border border-border/60 p-6 shadow-xs',
        'transition duration-[var(--duration-normal)] ease-[var(--ease-out)] active:scale-[0.985] hover:shadow-sm',
        tones[tone],
        className,
      )}
    >
      <p className="text-lg font-bold leading-tight tracking-[-0.025em] text-text">{title}</p>
      {subtitle ? <p className="mt-2 text-sm font-medium text-text-muted">{subtitle}</p> : null}
      <div className="mt-6">
        <ProgressBar value={value} />
        <p className="font-numeric mt-2 text-sm text-text-secondary">{value}%</p>
      </div>
    </Link>
  )
}
