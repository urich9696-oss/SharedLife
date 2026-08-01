import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ASSIGNEE_OPTIONS, EntityDateFields, EntityNoteField } from '@/features/entities/SharedFormFields'

export type DatePhase = 'idea' | 'planned' | 'done'
export type ReservationStatus = 'none' | 'requested' | 'confirmed'

export interface DateDetailValues {
  phase: DatePhase
  venueName: string
  estimatedCost: string
  reservationStatus: ReservationStatus
  reservationReference: string
  assigneeRole: string
  occasion: string
}

const reservationOptions = [
  { value: 'none', label: 'Keine Reservierung' },
  { value: 'requested', label: 'Angefragt' },
  { value: 'confirmed', label: 'Bestätigt' },
]

interface DateFormFieldsProps {
  values: DateDetailValues
  onChange: (values: DateDetailValues) => void
}

export function DateFormFields({ values, onChange }: DateFormFieldsProps) {
  return (
    <>
      <EntityDateFields showEnd={false} showAllDay={false} showTime startLabel="Datum" />
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
      <Select
        label="Reservierungsstatus"
        options={reservationOptions}
        value={values.reservationStatus}
        onChange={(e) =>
          onChange({
            ...values,
            reservationStatus: e.target.value as ReservationStatus,
          })
        }
      />
      {values.reservationStatus !== 'none' ? (
        <Input
          label="Reservierungsreferenz"
          value={values.reservationReference}
          onChange={(e) => onChange({ ...values, reservationReference: e.target.value })}
          placeholder="Optional"
        />
      ) : null}
      <Select
        label="Zuständigkeit"
        options={[...ASSIGNEE_OPTIONS]}
        value={values.assigneeRole}
        onChange={(e) => onChange({ ...values, assigneeRole: e.target.value })}
      />
      <EntityNoteField />
      <p className="text-xs text-text-muted">
        Hero-Bild nach dem Speichern unter Fotos hinzufügen. Nach dem Date: „Als Moment speichern“.
      </p>
    </>
  )
}

export const defaultDateDetail: DateDetailValues = {
  phase: 'planned',
  venueName: '',
  estimatedCost: '',
  reservationStatus: 'none',
  reservationReference: '',
  assigneeRole: 'gemeinsam',
  occasion: '',
}
