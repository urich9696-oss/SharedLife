import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskAssigneeRole = 'dennis' | 'lea' | 'gemeinsam' | ''

export interface TaskDetailValues {
  priority: TaskPriority
  assigneeId: string
  assigneeRole: TaskAssigneeRole
  dueDate: string
  category: string
  note: string
}

const priorityOptions = [
  { value: 'low', label: 'Niedrig' },
  { value: 'medium', label: 'Mittel' },
  { value: 'high', label: 'Hoch' },
]

const assigneeOptions = [
  { value: '', label: 'Nicht zugewiesen' },
  { value: 'dennis', label: 'Dennis' },
  { value: 'lea', label: 'Lea' },
  { value: 'gemeinsam', label: 'Gemeinsam' },
]

interface TaskFormFieldsProps {
  values: TaskDetailValues
  onChange: (values: TaskDetailValues) => void
}

export function TaskFormFields({ values, onChange }: TaskFormFieldsProps) {
  return (
    <>
      <Select
        label="Priorität"
        options={priorityOptions}
        value={values.priority}
        onChange={(e) => onChange({ ...values, priority: e.target.value as TaskPriority })}
      />
      <Select
        label="Zuständig"
        options={assigneeOptions}
        value={values.assigneeRole}
        onChange={(e) =>
          onChange({ ...values, assigneeRole: e.target.value as TaskAssigneeRole })
        }
      />
      <Input
        label="Kategorie"
        value={values.category}
        onChange={(e) => onChange({ ...values, category: e.target.value })}
        placeholder="z. B. Haushalt"
      />
      <Input
        label="Fällig am"
        type="date"
        value={values.dueDate}
        onChange={(e) => onChange({ ...values, dueDate: e.target.value })}
      />
      <Textarea
        label="Notiz"
        value={values.note}
        onChange={(e) => onChange({ ...values, note: e.target.value })}
        placeholder="Optionale Notiz zur Aufgabe"
        rows={3}
      />
    </>
  )
}

export const defaultTaskDetail: TaskDetailValues = {
  priority: 'medium',
  assigneeId: '',
  assigneeRole: '',
  dueDate: '',
  category: '',
  note: '',
}
