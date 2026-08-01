import { Plus } from 'lucide-react'
import { cn } from '@/lib/utilities/cn'

/** Kompakte Aktionszeile statt leerer Karte */
export function AddRow({
  label,
  onClick,
  className,
}: {
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-12 w-full items-center gap-2 rounded-lg px-2 text-left text-[17px] font-medium text-primary',
        'transition duration-[var(--duration-fast)] active:scale-[0.99] hover:bg-primary/5',
        className,
      )}
    >
      <Plus size={18} strokeWidth={1.75} aria-hidden />
      <span>{label}</span>
    </button>
  )
}
