import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'

export interface WishDetailValues {
  category: string
  price: string
  link: string
  fulfilled: boolean
}

const categoryOptions = [
  { value: '', label: 'Keine Kategorie' },
  { value: 'reise', label: 'Reise' },
  { value: 'haushalt', label: 'Haushalt' },
  { value: 'erlebnis', label: 'Erlebnis' },
  { value: 'geschenk', label: 'Geschenk' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

interface WishFormFieldsProps {
  values: WishDetailValues
  onChange: (values: WishDetailValues) => void
}

export function WishFormFields({ values, onChange }: WishFormFieldsProps) {
  return (
    <>
      <Select
        label="Kategorie"
        options={categoryOptions}
        value={values.category}
        onChange={(e) => onChange({ ...values, category: e.target.value })}
      />
      <Input
        label="Preis (CHF)"
        type="number"
        step="0.01"
        value={values.price}
        onChange={(e) => onChange({ ...values, price: e.target.value })}
        placeholder="Optional"
      />
      <Input
        label="Link"
        type="url"
        value={values.link}
        onChange={(e) => onChange({ ...values, link: e.target.value })}
        placeholder="https://…"
      />
      <Switch
        label="Erfüllt"
        checked={values.fulfilled}
        onChange={(e) => onChange({ ...values, fulfilled: e.target.checked })}
      />
    </>
  )
}

export const defaultWishDetail: WishDetailValues = {
  category: '',
  price: '',
  link: '',
  fulfilled: false,
}
