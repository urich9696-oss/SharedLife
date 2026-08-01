import { Input } from '@/components/ui/Input'
import { EntityDateFields, EntityNoteField, EntityStatusSelect } from '@/features/entities/SharedFormFields'
import type { GoalProgressKind } from '@/lib/validation/goal-progress'

export interface GoalDetailValues {
  progressKind: GoalProgressKind
  current: number
  target: number
  milestones: string
  goalStatus: 'planned' | 'active' | 'achieved'
}

const statusOptions = [
  { value: 'draft', label: 'Geplant' },
  { value: 'active', label: 'Aktiv' },
  { value: 'completed', label: 'Erreicht' },
]

interface GoalFormFieldsProps {
  values: GoalDetailValues
  onChange: (values: GoalDetailValues) => void
}

export function GoalFormFields({ values, onChange }: GoalFormFieldsProps) {
  return (
    <>
      <EntityNoteField label="Beschreibung" placeholder="Was wollt ihr erreichen?" rows={3} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Zielbetrag"
          type="number"
          step="0.01"
          value={values.target}
          onChange={(e) =>
            onChange({
              ...values,
              progressKind: 'amount',
              target: Number(e.target.value),
            })
          }
        />
        <Input
          label="Aktueller Betrag"
          type="number"
          step="0.01"
          value={values.current}
          onChange={(e) =>
            onChange({
              ...values,
              progressKind: 'amount',
              current: Number(e.target.value),
            })
          }
        />
      </div>
      <EntityDateFields
        showEnd
        showAllDay={false}
        showTime={false}
        startLabel="Startdatum"
        endLabel="Zieldatum"
      />
      <p className="rounded-[16px] bg-bg px-3 py-2.5 text-sm text-text-muted">
        Fortschritt:{' '}
        <span className="font-medium text-text">
          {values.target > 0
            ? `${Math.min(100, Math.round((values.current / values.target) * 100))}%`
            : '0%'}
        </span>
      </p>
      <EntityStatusSelect options={statusOptions} />
      <p className="text-xs text-text-muted">
        Hero-Bild, zugehörige Aufgaben und Momente nach dem Speichern in der Detailansicht.
      </p>
    </>
  )
}

export const defaultGoalDetail: GoalDetailValues = {
  progressKind: 'amount',
  current: 0,
  target: 0,
  milestones: '',
  goalStatus: 'planned',
}
