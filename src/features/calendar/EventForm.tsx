import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import {
  ASSIGNEE_OPTIONS,
  EntityDateFields,
  RECURRENCE_OPTIONS,
} from '@/features/entities/SharedFormFields'

export type EventAssignment = 'termin' | 'date' | 'reise' | 'ziel' | 'sonstiges'

export interface EventDetailValues {
  locationName: string
  assignment: EventAssignment
  assigneeRole: string
  recurrenceRule: string
  calendarColor: string
}

const assignmentOptions = [
  { value: 'termin', label: 'Termin' },
  { value: 'date', label: 'Date' },
  { value: 'reise', label: 'Reise' },
  { value: 'ziel', label: 'Ziel' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

interface EventFormFieldsProps {
  values: EventDetailValues
  onChange: (values: EventDetailValues) => void
}

export function EventFormFields({ values, onChange }: EventFormFieldsProps) {
  return (
    <>
      <EntityDateFields showEnd={false} showAllDay showTime />
      <Input
        label="Ort"
        value={values.locationName}
        onChange={(e) => onChange({ ...values, locationName: e.target.value })}
        placeholder="Optional"
      />
      <Select
        label="Zuordnung"
        options={assignmentOptions}
        value={values.assignment}
        onChange={(e) =>
          onChange({ ...values, assignment: e.target.value as EventAssignment })
        }
      />
      <Select
        label="Zuständigkeit"
        options={[...ASSIGNEE_OPTIONS]}
        value={values.assigneeRole}
        onChange={(e) => onChange({ ...values, assigneeRole: e.target.value })}
      />
      <Select
        label="Wiederholung"
        options={[...RECURRENCE_OPTIONS]}
        value={values.recurrenceRule || 'none'}
        onChange={(e) => onChange({ ...values, recurrenceRule: e.target.value })}
      />
      <p className="text-xs text-text-muted">
        Bild und Anhang könnt ihr nach dem Speichern in der Detailansicht hinzufügen.
      </p>
    </>
  )
}

export const defaultEventDetail: EventDetailValues = {
  locationName: '',
  assignment: 'termin',
  assigneeRole: 'gemeinsam',
  recurrenceRule: 'none',
  calendarColor: '',
}
