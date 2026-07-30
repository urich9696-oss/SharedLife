import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

export interface TripDetailValues {
  destination: string
  budgetId: string
}

interface TripFormFieldsProps {
  values: TripDetailValues
  onChange: (values: TripDetailValues) => void
  budgetOptions?: Array<{ value: string; label: string }>
}

export function TripFormFields({ values, onChange, budgetOptions = [] }: TripFormFieldsProps) {
  return (
    <>
      <Input
        label="Reiseziel"
        value={values.destination}
        onChange={(e) => onChange({ ...values, destination: e.target.value })}
        placeholder="z. B. Toskana"
      />
      {budgetOptions.length > 0 ? (
        <Select
          label="Budget verknüpfen"
          options={[{ value: '', label: 'Kein Budget' }, ...budgetOptions]}
          value={values.budgetId}
          onChange={(e) => onChange({ ...values, budgetId: e.target.value })}
        />
      ) : null}
    </>
  )
}

export const defaultTripDetail: TripDetailValues = { destination: '', budgetId: '' }
