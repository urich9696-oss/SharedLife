import { Select } from '@/components/ui/Select'

export type DatePhase = 'idea' | 'planned' | 'done'

export interface DateDetailValues {
  phase: DatePhase
}

const phaseOptions = [
  { value: 'idea', label: 'Idee' },
  { value: 'planned', label: 'Geplant' },
  { value: 'done', label: 'Erledigt' },
]

interface DateFormFieldsProps {
  values: DateDetailValues
  onChange: (values: DateDetailValues) => void
}

export function DateFormFields({ values, onChange }: DateFormFieldsProps) {
  return (
    <Select
      label="Phase"
      options={phaseOptions}
      value={values.phase}
      onChange={(e) => onChange({ phase: e.target.value as DatePhase })}
    />
  )
}

export const defaultDateDetail: DateDetailValues = { phase: 'idea' }
