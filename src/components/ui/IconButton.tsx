import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utilities/cn'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: ReactNode
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'primary' | 'accent'
}

const sizeStyles = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
}

const variantStyles = {
  default: 'text-text hover:bg-sand/30 active:bg-sand/50',
  primary: 'bg-primary text-surface hover:bg-primary-hover active:bg-primary-active',
  accent: 'bg-accent text-surface hover:bg-accent-hover active:bg-accent-active',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      label,
      icon,
      size = 'md',
      variant = 'default',
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-200',
        'focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50',
        sizeStyles[size],
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  ),
)

IconButton.displayName = 'IconButton'
