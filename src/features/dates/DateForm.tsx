import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'

export type DatePhase = 'idea' | 'planned' | 'done'

export interface DateDetailValues {
  phase: DatePhase
  occasion: string
  venueName: string
  estimatedCost: string
  reservationReference: string
  note: string
}

const phaseOptions = [
  { value: 'idea', label: 'Idee' },
  { value: 'planned', label: 'Geplant' },
  { value: 'done', label: 'Durchgeführt' },
]

interface DateFormFieldsProps {
  values: DateDetailValues
  onChange: (values: DateDetailValues) => void
}

export function DateFormFields({ values, onChange }: DateFormFieldsProps) {
  return (
    <>
      <Select
        label="Phase"
        options={phaseOptions}
        value={values.phase}
        onChange={(e) => onChange({ ...values, phase: e.target.value as DatePhase })}
      />
      <Input
        label="Anlass"
        value={values.occasion}
        onChange={(e) => onChange({ ...values, occasion: e.target.value })}
        placeholder="z. B. Abendessen"
      />
      <Input
        label="Ort"
        value={values.venueName}
        onChange={(e) => onChange({ ...values, venueName: e.target.value })}
        placeholder="Restaurant oder Ort"
      />
      <Input
        label="Budget"
        value={values.estimatedCost}
        onChange={(e) => onChange({ ...values, estimatedCost: e.target.value })}
        placeholder="z. B. 80"
        inputMode="decimal"
      />
      <Input
        label="Reservierung"
        value={values.reservationReference}
        onChange={(e) => onChange({ ...values, reservationReference: e.target.value })}
        placeholder="Optional"
      />
      <Textarea
        label="Notiz"
        value={values.note}
        onChange={(e) => onChange({ ...values, note: e.target.value })}
        rows={3}
      />
    </>
  )
}

export const defaultDateDetail: DateDetailValues = {
  phase: 'idea',
  occasion: '',
  venueName: '',
  estimatedCost: '',
  reservationReference: '',
  note: '',
}
