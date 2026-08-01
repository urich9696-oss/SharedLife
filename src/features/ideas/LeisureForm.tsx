import { Input } from '@/components/ui/Input'
import { EntityNoteField } from '@/features/entities/SharedFormFields'

export interface LeisureDetailValues {
  place: string
  link: string
}

interface LeisureFormFieldsProps {
  values: LeisureDetailValues
  onChange: (values: LeisureDetailValues) => void
}

/** Date Ideen – schlanke Eingabe laut V4 Cleanup */
export function LeisureFormFields({ values, onChange }: LeisureFormFieldsProps) {
  return (
    <>
      <Input
        label="Ort"
        value={values.place}
        onChange={(e) => onChange({ ...values, place: e.target.value })}
        placeholder="Optional"
      />
      <Input
        label="Link"
        type="url"
        value={values.link}
        onChange={(e) => onChange({ ...values, link: e.target.value })}
        placeholder="https://…"
      />
      <EntityNoteField />
      <p className="text-xs text-text-muted">Hero-Bild nach dem Speichern unter Fotos hinzufügen.</p>
    </>
  )
}

export const defaultLeisureDetail: LeisureDetailValues = {
  place: '',
  link: '',
}
