import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/Input'
import { EntityDateFields, EntityNoteField } from '@/features/entities/SharedFormFields'
import type { EntityFormValues } from '@/features/entities/entity-form-schema'

export interface LeisureDetailValues {
  place: string
  link: string
}

interface LeisureFormFieldsProps {
  values: LeisureDetailValues
  onChange: (values: LeisureDetailValues) => void
}

function LeisureDateDefaults() {
  const { setValue } = useFormContext<EntityFormValues>()
  useEffect(() => {
    setValue('allDay', true)
  }, [setValue])
  return null
}

/** Date Ideen – Datums-Vorschlag, Ort, Link, Notiz */
export function LeisureFormFields({ values, onChange }: LeisureFormFieldsProps) {
  return (
    <>
      <LeisureDateDefaults />
      <EntityDateFields
        showEnd={false}
        showAllDay={false}
        showTime={false}
        startLabel="Datums-Vorschlag"
      />
      <Input
        label="Ort"
        value={values.place}
        onChange={(e) => onChange({ ...values, place: e.target.value })}
        placeholder="Restaurant, Park, Stadt…"
      />
      <Input
        label="Link"
        type="url"
        value={values.link}
        onChange={(e) => onChange({ ...values, link: e.target.value })}
        placeholder="https://…"
      />
      <EntityNoteField />
      <p className="text-xs text-text-muted">
        Optionaler Tag für die Idee — z. B. ein konkretes Wochenende. Hero-Bild nach dem Speichern.
      </p>
    </>
  )
}

export const defaultLeisureDetail: LeisureDetailValues = {
  place: '',
  link: '',
}
