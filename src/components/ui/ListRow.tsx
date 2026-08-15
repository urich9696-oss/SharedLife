import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utilities/cn'

interface ListRowProps {
  title: string
  subtitle?: string | null
  meta?: string | null
  icon?: ReactNode
  href?: string
  onClick?: () => void
  trailing?: ReactNode
  className?: string
  showChevron?: boolean
}

function RowBody({
  title,
  subtitle,
  meta,
  icon,
  trailing,
  showChevron,
}: Omit<ListRowProps, 'href' | 'onClick' | 'className'>) {
  return (
    <>
      {icon ? (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-primary/10 text-primary">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-medium leading-snug text-text">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block text-[14px] text-text-muted">{subtitle}</span>
        ) : null}
      </span>
      {meta ? (
        <span className="shrink-0 text-[14px] font-medium text-text-muted">{meta}</span>
      ) : null}
      {trailing}
      {showChevron ? (
        <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-text-muted" aria-hidden />
      ) : null}
    </>
  )
}

/** Kompakte Listenzeile für Mehr, Module und Ablagen. */
export function ListRow({
  title,
  subtitle,
  meta,
  icon,
  href,
  onClick,
  trailing,
  className,
  showChevron = true,
}: ListRowProps) {
  const classes = cn(
    'flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition',
    'active:bg-surface-soft/80',
    className,
  )

  const body = (
    <RowBody
      title={title}
      subtitle={subtitle}
      meta={meta}
      icon={icon}
      trailing={trailing}
      showChevron={showChevron}
    />
  )

  if (href) {
    return (
      <Link to={href} onClick={onClick} className={classes}>
        {body}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {body}
      </button>
    )
  }

  return <div className={classes}>{body}</div>
}
