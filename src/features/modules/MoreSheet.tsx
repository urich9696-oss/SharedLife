import { Link } from 'react-router-dom'
import {
  CheckSquare,
  Heart,
  Map,
  Settings,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ListRow } from '@/components/ui/ListRow'
import { getGroupedModules } from '@/features/modules/module-registry'
import { CoupleAvatars } from '@/features/space/CoupleAvatars'
import { daysTogether, usePairProfile } from '@/features/space/pair-profile'

interface MoreSheetProps {
  open: boolean
  onClose: () => void
}

const ICON_STROKE = 1.75

function moduleIcon(key: string) {
  switch (key) {
    case 'geschenke':
      return <Heart size={18} strokeWidth={ICON_STROKE} />
    case 'freizeit':
      return <Sparkles size={18} strokeWidth={ICON_STROKE} />
    case 'reiseideen':
      return <Map size={18} strokeWidth={ICON_STROKE} />
    case 'einkauf':
      return <ShoppingCart size={18} strokeWidth={ICON_STROKE} />
    case 'rezepte':
      return <UtensilsCrossed size={18} strokeWidth={ICON_STROKE} />
    case 'aufgaben':
      return <CheckSquare size={18} strokeWidth={ICON_STROKE} />
    case 'settings':
      return <Settings size={18} strokeWidth={ICON_STROKE} />
    case 'finanzen':
      return <Wallet size={18} strokeWidth={ICON_STROKE} />
    default:
      return <Sparkles size={18} strokeWidth={ICON_STROKE} />
  }
}

export function MoreSheet({ open, onClose }: MoreSheetProps) {
  const groups = getGroupedModules({ includeSystem: true })
  const { data: pair } = usePairProfile()
  const together = daysTogether(pair?.togetherSince ?? null)
  const a = pair?.partnerAName ?? 'Dennis'
  const b = pair?.partnerBName ?? 'Lea'

  // V8 Ablage: Für uns / Alltag / App (+ Finanzen dezent)
  const visible = groups.filter((g) =>
    g.key === 'fuer-uns' || g.key === 'alltag' || g.key === 'app' || g.key === 'finanzen',
  )

  return (
    <BottomSheet open={open} onClose={onClose}>
      <header className="mb-6">
        <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-text">
          Mehr
        </h2>
        <p className="mt-2 text-[15px] text-text-muted">
          Ablage für Ideen, Alltag und Einstellungen.
        </p>
      </header>

      <Link
        to="/settings/pair"
        onClick={onClose}
        className="mb-6 flex items-center gap-4 rounded-lg border border-border/80 bg-[linear-gradient(145deg,var(--color-pastel-1),var(--color-pastel-2))] p-4 shadow-xs"
      >
        <CoupleAvatars
          partnerAName={a}
          partnerBName={b}
          partnerAAvatarPath={pair?.partnerAAvatarPath}
          partnerBAvatarPath={pair?.partnerBAvatarPath}
          size="lg"
        />
        <div className="min-w-0">
          <p className="text-xl font-semibold tracking-[-0.02em] text-text">
            {a} & {b}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {together !== null ? `${together} gemeinsame Tage` : 'Paarprofil öffnen'}
          </p>
        </div>
      </Link>

      <div className="space-y-7 pb-6">
        {visible.map((group) => (
          <section key={group.key}>
            <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-text-muted">
              {group.label}
            </h3>
            <ul className="overflow-hidden rounded-lg border border-border/80 bg-surface shadow-xs">
              {group.modules.map((mod) => (
                <li key={mod.key} className="border-b border-border/60 last:border-b-0">
                  <ListRow
                    title={mod.label}
                    subtitle={mod.description}
                    icon={moduleIcon(mod.key)}
                    href={mod.path}
                    onClick={onClose}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </BottomSheet>
  )
}
