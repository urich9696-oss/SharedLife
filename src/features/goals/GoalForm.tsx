import { Input } from '@/components/ui/Input'
import { EntityDateFields, EntityNoteField, EntityStatusSelect } from '@/features/entities/SharedFormFields'
import type { GoalProgressKind } from '@/lib/validation/goal-progress'
import { parseMoneyAmount } from '@/lib/money'

export interface GoalDetailValues {
  progressKind: GoalProgressKind
  /** String während der Eingabe — sonst kämpft Number() mit Dezimalpunkten/Leeren. */
  current: string
  target: string
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
  const target = parseMoneyAmount(values.target)
  const current = parseMoneyAmount(values.current)
  const percent =
    target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0

  return (
    <>
      <EntityNoteField label="Beschreibung" placeholder="Was wollt ihr erreichen?" rows={3} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Zielbetrag"
          type="text"
          inputMode="decimal"
          value={String(values.target ?? '')}
          onChange={(e) =>
            onChange({
              ...values,
              progressKind: 'amount',
              target: e.target.value,
            })
          }
          placeholder="z. B. 5000"
        />
        <Input
          label="Aktueller Betrag"
          type="text"
          inputMode="decimal"
          value={String(values.current ?? '')}
          onChange={(e) =>
            onChange({
              ...values,
              progressKind: 'amount',
              current: e.target.value,
            })
          }
          placeholder="z. B. 1200"
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
        <span className="font-medium text-text">{percent}%</span>
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
  current: '',
  target: '',
  milestones: '',
  goalStatus: 'planned',
}
