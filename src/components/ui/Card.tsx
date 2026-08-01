import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utilities/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingStyles = {
  none: '',
  sm: 'p-4', /* 16px */
  md: 'p-5', /* 20px — ruhiger als 16, nicht leer */
  lg: 'p-8',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, padding = 'md', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-border/70 bg-surface',
        interactive &&
          'cursor-pointer shadow-sm transition-[box-shadow,transform,border-color] duration-[var(--duration-normal)] ease-[var(--ease-out)] hover:shadow-md hover:border-border active:scale-[0.985]',
        !interactive && 'shadow-xs',
        paddingStyles[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
)

Card.displayName = 'Card'

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-[var(--heading-content-gap)]', className)} {...props} />
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'font-sans text-xl font-bold leading-tight tracking-[-0.025em] text-text',
        className,
      )}
      {...props}
    />
  )
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('mt-[var(--heading-content-gap)] text-sm font-medium text-text-muted', className)} {...props} />
  )
}
