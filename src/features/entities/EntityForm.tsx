import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import { entityFormSchema, type EntityFormValues } from '@/features/entities/entity-form-schema'
import { entityToFormValues } from '@/features/entities/entity-date-utils'
import { getEntityTypeMeta } from '@/features/entities/entity-types'
import type { EntityRow, EntityType } from '@/lib/indexed-db/schema'

export interface EntityFormProps {
  entityType: EntityType
  defaultValues?: Partial<EntityFormValues>
  onSubmit: (values: EntityFormValues) => void | Promise<void>
  onCancel?: () => void
  submitLabel?: string
  loading?: boolean
  children?: React.ReactNode
}

export function EntityForm({
  entityType,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Speichern',
  loading = false,
  children,
}: EntityFormProps) {
  const meta = getEntityTypeMeta(entityType)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EntityFormValues>({
    resolver: zodResolver(entityFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: meta.statuses[0],
      allDay: false,
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      ...defaultValues,
    },
  })

  const allDay = watch('allDay')
  const showDates = ['event', 'trip', 'date', 'task', 'moment', 'project'].includes(entityType)

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-4">
      <Input
        label="Titel"
        {...register('title')}
        error={errors.title?.message}
        placeholder={`${meta.label} benennen…`}
      />

      <Textarea
        label="Beschreibung"
        {...register('description')}
        error={errors.description?.message}
        placeholder="Optional"
        rows={3}
      />

      <Select
        label="Status"
        options={meta.statuses.map((s) => ({
          value: s,
          label: meta.statusLabels[s],
        }))}
        {...register('status')}
        error={errors.status?.message}
      />

      {showDates ? (
        <>
          <Switch label="Ganztägig" {...register('allDay')} />

          {allDay ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Startdatum" type="date" {...register('startDate')} />
              <Input label="Enddatum" type="date" {...register('endDate')} />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Startdatum" type="date" {...register('startDate')} />
              <Input label="Startzeit" type="time" {...register('startTime')} />
              <Input label="Enddatum" type="date" {...register('endDate')} />
              <Input label="Endzeit" type="time" {...register('endTime')} />
            </div>
          )}
        </>
      ) : null}

      {children}

      <div className="flex gap-3 pt-2">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} fullWidth>
            Abbrechen
          </Button>
        ) : null}
        <Button type="submit" loading={loading} fullWidth>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

export function entityFormDefaultsFromRow(entity: EntityRow): EntityFormValues {
  return entityToFormValues(entity)
}
