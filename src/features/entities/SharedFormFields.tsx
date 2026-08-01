import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import type { EntityFormValues } from '@/features/entities/entity-form-schema'

export const ASSIGNEE_OPTIONS = [
  { value: '', label: 'Nicht zugewiesen' },
  { value: 'dennis', label: 'Dennis' },
  { value: 'lea', label: 'Lea' },
  { value: 'gemeinsam', label: 'Gemeinsam' },
] as const

export const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Keine' },
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'yearly', label: 'Jährlich' },
  { value: 'custom', label: 'Benutzerdefiniert' },
] as const

/** Entity-Datum/Zeit aus dem gemeinsamen EntityForm-Kontext */
export function EntityDateFields({
  showEnd = false,
  showAllDay = true,
  showTime = true,
  startLabel = 'Datum',
  endLabel = 'Enddatum',
}: {
  showEnd?: boolean
  showAllDay?: boolean
  showTime?: boolean
  startLabel?: string
  endLabel?: string
}) {
  const { register, watch } = useFormContext<EntityFormValues>()
  const allDay = watch('allDay')

  return (
    <div className="flex flex-col gap-4">
      {showAllDay ? <Switch label="Ganztägig" {...register('allDay')} /> : null}
      <div className={showTime && !allDay ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}>
        <Input label={startLabel} type="date" {...register('startDate')} />
        {showTime && !allDay ? (
          <Input label="Uhrzeit" type="time" {...register('startTime')} />
        ) : null}
      </div>
      {showEnd ? (
        <div className={showTime && !allDay ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}>
          <Input label={endLabel} type="date" {...register('endDate')} />
          {showTime && !allDay ? (
            <Input label="Endzeit" type="time" {...register('endTime')} />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function EntityNoteField({
  label = 'Notiz',
  placeholder = 'Optional',
  rows = 3,
}: {
  label?: string
  placeholder?: string
  rows?: number
}) {
  const { register } = useFormContext<EntityFormValues>()
  return (
    <Textarea label={label} {...register('description')} placeholder={placeholder} rows={rows} />
  )
}

export function EntityStatusSelect({
  options,
}: {
  options: Array<{ value: string; label: string }>
}) {
  const { register } = useFormContext<EntityFormValues>()
  return <Select label="Status" options={options} {...register('status')} />
}
