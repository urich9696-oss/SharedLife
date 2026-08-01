import { Link } from 'react-router-dom'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { MediaImage } from '@/features/media/MediaImage'
import { getGroupedModules } from '@/features/modules/module-registry'
import { daysTogether, usePairProfile } from '@/features/space/pair-profile'

interface MoreSheetProps {
  open: boolean
  onClose: () => void
}

export function MoreSheet({ open, onClose }: MoreSheetProps) {
  const groups = getGroupedModules({ includeSystem: true })
  const { data: pair } = usePairProfile()
  const together = daysTogether(pair?.togetherSince ?? null)
  const a = pair?.partnerAName ?? 'Dennis'
  const b = pair?.partnerBName ?? 'Lea'

  return (
    <BottomSheet open={open} onClose={onClose} title="Mehr">
      <Link
        to="/settings/pair"
        onClick={onClose}
        className="mb-6 flex items-center gap-4 rounded-[22px] border border-border bg-[linear-gradient(135deg,#f7f2ea,#efe7dc)] p-4 shadow-xs transition hover:-translate-y-0.5"
      >
        <div className="relative size-16 shrink-0 overflow-hidden rounded-full border border-border bg-surface">
          {pair?.coverMediaPath || pair?.partnerAAvatarPath ? (
            <MediaImage
              storagePath={pair.coverMediaPath ?? pair.partnerAAvatarPath}
              alt={`${a} und ${b}`}
              aspectRatio={1}
              className="rounded-full"
              lazy={false}
            />
          ) : (
            <div className="flex size-full items-center justify-center font-serif text-lg text-primary">
              {a.slice(0, 1)}
              {b.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-serif text-xl text-text">
            {a} & {b}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {together !== null ? `${together} gemeinsame Tage` : 'Paarprofil öffnen'}
          </p>
          {pair?.coupleBlurb ? (
            <p className="mt-1 line-clamp-2 text-sm text-text">{pair.coupleBlurb}</p>
          ) : null}
        </div>
      </Link>

      <div className="space-y-6 pb-6">
        {groups.map((group) => (
          <section key={group.key}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {group.label}
            </h3>
            <ul className="space-y-2">
              {group.modules.map((mod) => (
                <li key={mod.key}>
                  <Link
                    to={mod.path}
                    onClick={onClose}
                    className="flex min-h-14 items-center justify-between gap-3 rounded-[18px] border border-border bg-surface px-4 py-3 transition duration-200 active:scale-[0.99] hover:bg-surface-soft"
                  >
                    <span>
                      <span className="block text-sm font-medium text-text">{mod.label}</span>
                      <span className="mt-0.5 block text-xs text-text-muted">{mod.description}</span>
                    </span>
                    <span className={`rounded-lg px-2 py-1 text-[10px] font-medium ${mod.accent}`}>
                      Öffnen
                    </span>
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
