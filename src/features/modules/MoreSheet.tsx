import { Link } from 'react-router-dom'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { getGroupedModules } from '@/features/modules/module-registry'

interface MoreSheetProps {
  open: boolean
  onClose: () => void
}

export function MoreSheet({ open, onClose }: MoreSheetProps) {
  const groups = getGroupedModules({ includeSystem: true })

  return (
    <BottomSheet open={open} onClose={onClose} title="Mehr">
      <p className="mb-5 text-sm text-text-muted">
        Vier Lebenswelten — alles mit maximal zwei Tipps erreichbar.
      </p>
      <div className="space-y-6 pb-6">
        {groups.map((group) => (
          <section key={group.key}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {group.label}
            </h3>
            <ul className="grid grid-cols-2 gap-2.5">
              {group.modules.map((mod) => (
                <li key={mod.key}>
                  <Link
                    to={mod.path}
                    onClick={onClose}
                    className="flex min-h-[5.5rem] flex-col justify-between rounded-[18px] border border-border bg-surface p-3 shadow-xs transition duration-200 active:scale-[0.98] hover:-translate-y-0.5"
                  >
                    <span
                      className={`inline-flex w-fit rounded-lg px-2 py-1 text-xs font-medium ${mod.accent}`}
                    >
                      {mod.label}
                    </span>
                    <span className="mt-2 text-xs leading-snug text-text-muted">{mod.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </BottomSheet>
  )
}
