import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EntityNoteField } from '@/features/entities/SharedFormFields'

export type WishOccasion = 'birthday' | 'christmas' | 'anniversary' | 'justbecause' | ''
export type WishStatus = 'open' | 'reserved' | 'bought'

export interface WishDetailValues {
  url: string
  price: string
  currency: string
  priority: 'low' | 'normal' | 'high' | 'dream'
  fulfilled: boolean
  occasion: WishOccasion
  wishStatus: WishStatus
}

const priorityOptions = [
  { value: 'low', label: 'Niedrig' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Hoch' },
  { value: 'dream', label: 'Traum' },
]

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
  return (
    <>
      <Input
        label="Preis"
        type="number"
        step="0.01"
        value={values.price}
        onChange={(e) => onChange({ ...values, price: e.target.value })}
        placeholder="Optional"
      />
      <Input
        label="Shop Link"
        type="url"
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
      <Select
        label="Priorität"
        options={priorityOptions}
        value={values.priority}
        onChange={(e) =>
          onChange({ ...values, priority: e.target.value as WishDetailValues['priority'] })
        }
      />
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
