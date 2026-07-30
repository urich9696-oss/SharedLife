import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'

export type ReminderMode = 'absolute' | 'relative'

export interface ReminderFormValues {
  title: string
  body: string
  mode: ReminderMode
  remindAt: string
  remindTime: string
  relativeMinutes: number
  isActive: boolean
}

interface ReminderFormFieldsProps {
  values: ReminderFormValues
  onChange: (values: ReminderFormValues) => void
}

export function ReminderFormFields({ values, onChange }: ReminderFormFieldsProps) {
  return (
    <>
      <Input
        label="Titel"
        value={values.title}
        onChange={(e) => onChange({ ...values, title: e.target.value })}
      />
      <Textarea
        label="Nachricht"
        value={values.body}
        onChange={(e) => onChange({ ...values, body: e.target.value })}
        rows={2}
      />
      <Select
        label="Typ"
        options={[
          { value: 'absolute', label: 'Fester Zeitpunkt' },
          { value: 'relative', label: 'Relativ (Minuten)' },
        ]}
        value={values.mode}
        onChange={(e) => onChange({ ...values, mode: e.target.value as ReminderMode })}
      />
      {values.mode === 'absolute' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Datum"
            type="date"
            value={values.remindAt}
            onChange={(e) => onChange({ ...values, remindAt: e.target.value })}
          />
          <Input
            label="Uhrzeit"
            type="time"
            value={values.remindTime}
            onChange={(e) => onChange({ ...values, remindTime: e.target.value })}
          />
        </div>
      ) : (
        <Input
          label="Minuten ab jetzt"
          type="number"
          min={1}
          value={values.relativeMinutes}
          onChange={(e) => onChange({ ...values, relativeMinutes: Number(e.target.value) })}
        />
      )}
      <Switch
        label="Aktiv"
        checked={values.isActive}
        onChange={(e) => onChange({ ...values, isActive: e.target.checked })}
      />
    </>
  )
}

export const defaultReminderForm: ReminderFormValues = {
  title: '',
  body: '',
  mode: 'absolute',
  remindAt: '',
  remindTime: '09:00',
  relativeMinutes: 60,
  isActive: true,
}
