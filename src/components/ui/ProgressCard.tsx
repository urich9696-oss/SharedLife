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
        'block min-w-[11.5rem] snap-start rounded-[24px] border border-border/70 p-4 shadow-xs',
        'transition duration-280 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] hover:-translate-y-0.5',
        tones[tone],
        className,
      )}
    >
      <p className="font-serif text-lg leading-tight text-text">{title}</p>
      {subtitle ? <p className="mt-1 text-xs text-text-muted">{subtitle}</p> : null}
      <div className="mt-4">
        <ProgressBar value={value} />
        <p className="mt-2 text-xs font-medium text-text-secondary">{value}%</p>
      </div>
    </Link>
  )
}
