import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utilities/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-surface hover:bg-primary-hover active:bg-primary-active shadow-xs',
  secondary:
    'bg-surface text-text border border-border/80 hover:bg-bg active:bg-surface-soft shadow-xs',
  accent:
    'bg-accent text-surface hover:bg-accent-hover active:bg-accent-active shadow-xs',
  ghost: 'text-text hover:bg-sand/25 active:bg-sand/40',
  danger:
    'bg-error text-surface hover:bg-error/90 active:bg-error/80 shadow-xs',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm rounded-[14px] gap-2',
  md: 'h-12 px-6 text-[17px] rounded-[20px] gap-2',
  lg: 'h-14 px-8 text-lg rounded-[24px] gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled ?? loading}
      aria-busy={loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-[colors,transform,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
        'focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-disabled-bg disabled:text-disabled',
        'active:scale-[0.98]',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  ),
)

Button.displayName = 'Button'
