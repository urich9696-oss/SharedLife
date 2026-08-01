import { Link } from 'react-router-dom'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { MODULE_REGISTRY } from '@/features/modules/module-registry'

interface MoreSheetProps {
  open: boolean
  onClose: () => void
}

export function MoreSheet({ open, onClose }: MoreSheetProps) {
  const modules = MODULE_REGISTRY.filter((m) => m.key !== 'dashboard')

  return (
    <BottomSheet open={open} onClose={onClose} title="Mehr">
      <p className="mb-4 text-sm text-text-muted">
        Alle Bereiche eures gemeinsamen Lebens — maximal zwei Tipps entfernt.
      </p>
      <ul className="grid grid-cols-2 gap-3 pb-6">
        {modules.map((mod) => (
          <li key={mod.key}>
            <Link
              to={mod.path}
              onClick={onClose}
              className="flex min-h-28 flex-col justify-between rounded-[18px] border border-border bg-surface p-3 shadow-xs transition duration-200 active:scale-[0.98] hover:-translate-y-0.5"
            >
              <span className={`inline-flex w-fit rounded-lg px-2 py-1 text-xs font-medium ${mod.accent}`}>
                {mod.label}
              </span>
              <span className="mt-3 text-xs leading-snug text-text-muted">{mod.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </BottomSheet>
  )
}
