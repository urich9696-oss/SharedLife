import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'

export interface WishDetailValues {
  url: string
  price: string
  currency: string
  priority: 'low' | 'normal' | 'high' | 'dream'
  fulfilled: boolean
}

const priorityOptions = [
  { value: 'low', label: 'Niedrig' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Hoch' },
  { value: 'dream', label: 'Traum' },
]

const currencyOptions = [
  { value: 'CHF', label: 'CHF' },
  { value: 'EUR', label: 'EUR' },
  { value: 'USD', label: 'USD' },
]

interface WishFormFieldsProps {
  values: WishDetailValues
  onChange: (values: WishDetailValues) => void
}

export function WishFormFields({ values, onChange }: WishFormFieldsProps) {
  return (
    <>
      <Select
        label="Priorität"
        options={priorityOptions}
        value={values.priority}
        onChange={(e) =>
          onChange({ ...values, priority: e.target.value as WishDetailValues['priority'] })
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Preis"
          type="number"
          step="0.01"
          value={values.price}
          onChange={(e) => onChange({ ...values, price: e.target.value })}
          placeholder="Optional"
        />
        <Select
          label="Währung"
          options={currencyOptions}
          value={values.currency}
          onChange={(e) => onChange({ ...values, currency: e.target.value })}
        />
      </div>
      <Input
        label="Link"
        type="url"
        value={values.url}
        onChange={(e) => onChange({ ...values, url: e.target.value })}
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
  url: '',
  price: '',
  currency: 'CHF',
  priority: 'normal',
  fulfilled: false,
}
