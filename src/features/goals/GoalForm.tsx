import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { GoalProgressKind } from '@/lib/validation/goal-progress'

export interface GoalDetailValues {
  progressKind: GoalProgressKind
  current: number
  target: number
  milestones: string
}

const kindOptions = [
  { value: 'percent', label: 'Prozent' },
  { value: 'amount', label: 'Betrag' },
  { value: 'count', label: 'Anzahl' },
  { value: 'manual', label: 'Manuell' },
]

interface GoalFormFieldsProps {
  values: GoalDetailValues
  onChange: (values: GoalDetailValues) => void
}

export function GoalFormFields({ values, onChange }: GoalFormFieldsProps) {
  return (
    <>
      <Select
        label="Fortschrittsart"
        options={kindOptions}
        value={values.progressKind}
        onChange={(e) =>
          onChange({ ...values, progressKind: e.target.value as GoalProgressKind })
        }
      />
      {values.progressKind !== 'manual' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Aktuell"
            type="number"
            value={values.current}
            onChange={(e) => onChange({ ...values, current: Number(e.target.value) })}
          />
          <Input
            label="Ziel"
            type="number"
            value={values.target}
            onChange={(e) => onChange({ ...values, target: Number(e.target.value) })}
          />
        </div>
      ) : (
        <Input
          label="Fortschritt (%)"
          type="number"
          min={0}
          max={100}
          value={values.current}
          onChange={(e) => onChange({ ...values, current: Number(e.target.value) })}
        />
      )}
      <Input
        label="Meilensteine"
        value={values.milestones}
        onChange={(e) => onChange({ ...values, milestones: e.target.value })}
        hint="Kommagetrennt"
        placeholder="z. B. Anzahlung, Buchung, Abreise"
      />
    </>
  )
}

export const defaultGoalDetail: GoalDetailValues = {
  progressKind: 'percent',
  current: 0,
  target: 100,
  milestones: '',
}
