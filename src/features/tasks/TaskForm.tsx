import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import {
  ASSIGNEE_OPTIONS,
  EntityDateFields,
  EntityNoteField,
  EntityStatusSelect,
  RECURRENCE_OPTIONS,
} from '@/features/entities/SharedFormFields'

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskAssigneeRole = 'dennis' | 'lea' | 'gemeinsam' | ''
export type TaskAssignment =
  | 'reise'
  | 'ziel'
  | 'date'
  | 'termin'
  | 'finanzen'
  | 'sonstiges'
  | ''

export interface TaskDetailValues {
  priority: TaskPriority
  assigneeId: string
  assigneeRole: TaskAssigneeRole
  dueDate: string
  dueTime: string
  category: string
  assignment: TaskAssignment
  recurrenceRule: string
  note: string
  subtasksText: string
}

const priorityOptions = [
  { value: 'low', label: 'Niedrig' },
  { value: 'medium', label: 'Normal' },
  { value: 'high', label: 'Hoch' },
]

const assignmentOptions = [
  { value: '', label: 'Keine' },
  { value: 'reise', label: 'Reise' },
  { value: 'ziel', label: 'Ziel' },
  { value: 'date', label: 'Date' },
  { value: 'termin', label: 'Termin' },
  { value: 'finanzen', label: 'Finanzen' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

const statusOptions = [
  { value: 'active', label: 'Offen' },
  { value: 'completed', label: 'Erledigt' },
]

interface TaskFormFieldsProps {
  values: TaskDetailValues
  onChange: (values: TaskDetailValues) => void
}

export function TaskFormFields({ values, onChange }: TaskFormFieldsProps) {
  return (
    <>
      <EntityDateFields
        showEnd={false}
        showAllDay={false}
        showTime
        startLabel="Fälligkeitsdatum"
      />
      <Select
        label="Zuständigkeit"
        options={[...ASSIGNEE_OPTIONS]}
        value={values.assigneeRole}
        onChange={(e) =>
          onChange({ ...values, assigneeRole: e.target.value as TaskAssigneeRole })
        }
      />
      <Select
        label="Priorität"
        options={priorityOptions}
        value={values.priority}
        onChange={(e) => onChange({ ...values, priority: e.target.value as TaskPriority })}
      />
      <Input
        label="Unteraufgaben"
        value={values.subtasksText}
        onChange={(e) => onChange({ ...values, subtasksText: e.target.value })}
        hint="Kommagetrennt — werden als Checkliste angelegt"
        placeholder="z. B. Einkaufen, Kochen, Aufräumen"
      />
      <Select
        label="Wiederholung"
        options={[...RECURRENCE_OPTIONS]}
        value={values.recurrenceRule || 'none'}
        onChange={(e) => onChange({ ...values, recurrenceRule: e.target.value })}
      />
      <Select
        label="Zuordnung"
        options={assignmentOptions}
        value={values.assignment}
        onChange={(e) =>
          onChange({ ...values, assignment: e.target.value as TaskAssignment })
        }
      />
      <EntityStatusSelect options={statusOptions} />
      <EntityNoteField />
      <p className="text-xs text-text-muted">
        Bild und Datei nach dem Speichern in der Detailansicht hinzufügen.
      </p>
    </>
  )
}

export const defaultTaskDetail: TaskDetailValues = {
  priority: 'medium',
  assigneeId: '',
  assigneeRole: '',
  dueDate: '',
  dueTime: '',
  category: '',
  assignment: '',
  recurrenceRule: 'none',
  note: '',
  subtasksText: '',
}
