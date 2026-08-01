import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { FormRow, FormSection } from '@/components/ui/FormSection'
import { Input } from '@/components/ui/Input'
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
  /** Wenn false: Titel ausblenden (typ-spezifische Maske hat eigenes Titelfeld) */
  showTitle?: boolean
}

export function EntityForm({
  entityType,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Speichern',
  loading = false,
  children,
  showTitle = true,
}: EntityFormProps) {
  const meta = getEntityTypeMeta(entityType)
  const methods = useForm<EntityFormValues>({
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = methods

  return (
    <FormProvider {...methods}>
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-6">
        {showTitle ? (
          <FormSection>
            <FormRow>
              <Input
                label="Titel"
                {...register('title')}
                error={errors.title?.message}
                placeholder={`${meta.label} benennen…`}
                autoComplete="off"
              />
            </FormRow>
          </FormSection>
        ) : (
          <input type="hidden" {...register('title')} />
        )}

        {children ? (
          <FormSection>
            <div className="flex flex-col divide-y divide-border/80 [&>*]:px-5 [&>*]:py-4 sm:[&>*]:px-6">
              {children}
            </div>
          </FormSection>
        ) : null}

        <div className="flex gap-4 pt-2">
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
    </FormProvider>
  )
}

export function entityFormDefaultsFromRow(entity: EntityRow): EntityFormValues {
  return entityToFormValues(entity)
}
