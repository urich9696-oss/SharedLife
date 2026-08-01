import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useAuth } from '@/features/auth/AuthProvider'
import { MomentBelongingSelect } from '@/features/entities/detail/BelongingSelect'
import { EntityDateFields, EntityNoteField } from '@/features/entities/SharedFormFields'

export interface MomentDetailValues {
  place: string
  category: string
  highlight: boolean
  /** Legacy category string */
  belonging: string
  /** Konkrete Entity-ID (Reise / Date / Ziel) */
  belongsToEntityId: string
  capturedAt: string
  mood: string
  weather: string
}

const categoryOptions = [
  { value: '', label: 'Ohne Kategorie' },
  { value: 'alltag', label: 'Alltag' },
  { value: 'reise', label: 'Reise' },
  { value: 'date', label: 'Date' },
  { value: 'feier', label: 'Feier' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

interface MomentFormFieldsProps {
  values: MomentDetailValues
  onChange: (values: MomentDetailValues) => void
}

export function MomentFormFields({ values, onChange }: MomentFormFieldsProps) {
  const { spaceId } = useAuth()

  return (
    <>
      <EntityDateFields showEnd={false} showAllDay={false} showTime={false} startLabel="Datum" />
      <Input
        label="Ort"
        value={values.place}
        onChange={(e) => onChange({ ...values, place: e.target.value })}
        placeholder="Wo war der Moment?"
      />
      <EntityNoteField label="Beschreibung" placeholder="Was ist passiert?" rows={4} />
      <Select
        label="Kategorie"
        options={categoryOptions}
        value={values.category}
        onChange={(e) => onChange({ ...values, category: e.target.value })}
      />
      <Switch
        label="Favorit"
        checked={values.highlight}
        onChange={(e) => onChange({ ...values, highlight: e.target.checked })}
      />
      {spaceId ? (
        <MomentBelongingSelect
          spaceId={spaceId}
          value={values.belongsToEntityId}
          onChange={(id) => onChange({ ...values, belongsToEntityId: id })}
        />
      ) : null}
    </>
  )
}

export const defaultMomentDetail: MomentDetailValues = {
  place: '',
  category: '',
  highlight: false,
  belonging: '',
  belongsToEntityId: '',
  capturedAt: '',
  mood: '',
  weather: '',
}
