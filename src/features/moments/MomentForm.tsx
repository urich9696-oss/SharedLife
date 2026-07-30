import { Input } from '@/components/ui/Input'

export interface MomentDetailValues {
  place: string
}

interface MomentFormFieldsProps {
  values: MomentDetailValues
  onChange: (values: MomentDetailValues) => void
}

export function MomentFormFields({ values, onChange }: MomentFormFieldsProps) {
  return (
    <Input
      label="Ort"
      value={values.place}
      onChange={(e) => onChange({ ...values, place: e.target.value })}
      placeholder="Wo war der Moment?"
    />
  )
}

export const defaultMomentDetail: MomentDetailValues = { place: '' }
