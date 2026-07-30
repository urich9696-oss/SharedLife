import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

export type TaskPriority = 'low' | 'medium' | 'high'

export interface TaskDetailValues {
  priority: TaskPriority
  assigneeId: string
  dueDate: string
}

const priorityOptions = [
  { value: 'low', label: 'Niedrig' },
  { value: 'medium', label: 'Mittel' },
  { value: 'high', label: 'Hoch' },
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
      <Input
        label="Zuständig (optional)"
        value={values.assigneeId}
        onChange={(e) => onChange({ ...values, assigneeId: e.target.value })}
        placeholder="Benutzer-ID"
      />
      <Input
        label="Fällig am"
        type="date"
        value={values.dueDate}
        onChange={(e) => onChange({ ...values, dueDate: e.target.value })}
      />
    </>
  )
}

export const defaultTaskDetail: TaskDetailValues = {
  priority: 'medium',
  assigneeId: '',
  dueDate: '',
}
