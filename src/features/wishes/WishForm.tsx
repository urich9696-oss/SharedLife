import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EntityNoteField } from '@/features/entities/SharedFormFields'
import {
  WISH_PRIORITY_OPTIONS,
  normalizeWishPriority,
  type WishPriority,
} from '@/features/wishes/wish-priority'
import { cn } from '@/lib/utilities/cn'

export type WishOccasion = 'birthday' | 'christmas' | 'anniversary' | 'justbecause' | ''
export type WishStatus = 'open' | 'reserved' | 'bought'

export interface WishDetailValues {
  url: string
  price: string
  currency: string
  priority: WishPriority
  fulfilled: boolean
  occasion: WishOccasion
  wishStatus: WishStatus
}

const occasionOptions = [
  { value: '', label: 'Kein Anlass' },
  { value: 'birthday', label: 'Geburtstag' },
  { value: 'christmas', label: 'Weihnachten' },
  { value: 'anniversary', label: 'Jahrestag' },
  { value: 'justbecause', label: 'Einfach so' },
]

const statusOptions = [
  { value: 'open', label: 'Offen' },
  { value: 'reserved', label: 'Reserviert' },
  { value: 'bought', label: 'Gekauft' },
]

interface WishFormFieldsProps {
  values: WishDetailValues
  onChange: (values: WishDetailValues) => void
}

export function WishFormFields({ values, onChange }: WishFormFieldsProps) {
  const priority = normalizeWishPriority(values.priority)

  return (
    <>
      <Input
        label="Preis"
        type="text"
        inputMode="decimal"
        value={values.price}
        onChange={(e) => onChange({ ...values, price: e.target.value })}
        placeholder="Optional"
      />
      <Input
        label="Shop Link"
        type="text"
        inputMode="url"
        autoCapitalize="off"
        autoCorrect="off"
        value={values.url}
        onChange={(e) => onChange({ ...values, url: e.target.value })}
        placeholder="https://…"
      />
      <Select
        label="Anlass"
        options={occasionOptions}
        value={values.occasion}
        onChange={(e) => onChange({ ...values, occasion: e.target.value as WishOccasion })}
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text">Priorität</legend>
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          role="radiogroup"
          aria-label="Priorität"
        >
          {WISH_PRIORITY_OPTIONS.map((option) => {
            const selected = priority === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ ...values, priority: option.value })}
                className={cn(
                  'min-h-12 rounded-[18px] border px-3 py-2.5 text-left transition duration-[var(--duration-fast)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                  selected
                    ? 'border-primary/50 bg-primary/10 text-text shadow-xs'
                    : 'border-border/80 bg-surface text-text-muted hover:bg-surface-soft',
                )}
              >
                <span className="block text-sm font-semibold tracking-[-0.01em]">
                  {option.label}
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <Select
        label="Status"
        options={statusOptions}
        value={values.wishStatus}
        onChange={(e) => {
          const wishStatus = e.target.value as WishStatus
          onChange({
            ...values,
            wishStatus,
            fulfilled: wishStatus === 'bought',
          })
        }}
      />
      <EntityNoteField />
      <p className="text-xs text-text-muted">Hero-Bild nach dem Speichern unter Fotos hinzufügen.</p>
    </>
  )
}

export const defaultWishDetail: WishDetailValues = {
  url: '',
  price: '',
  currency: 'CHF',
  priority: 'normal',
  fulfilled: false,
  occasion: '',
  wishStatus: 'open',
}
