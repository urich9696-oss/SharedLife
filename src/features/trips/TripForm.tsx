import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { EntityDateFields, EntityNoteField } from '@/features/entities/SharedFormFields'

export interface TripPlaceDraft {
  name: string
  kind: string
  mapsLink: string
}

export interface TripDetailValues {
  destination: string
  budgetAmount: string
  accommodation: string
  packingListText: string
  placesText: string
  budgetId: string
}

interface TripFormFieldsProps {
  values: TripDetailValues
  onChange: (values: TripDetailValues) => void
  budgetOptions?: Array<{ value: string; label: string }>
}

export function TripFormFields({ values, onChange }: TripFormFieldsProps) {
  return (
    <>
      <Input
        label="Reiseziel"
        value={values.destination}
        onChange={(e) => onChange({ ...values, destination: e.target.value })}
        placeholder="z. B. Lissabon"
      />
      <EntityDateFields
        showEnd
        showAllDay={false}
        showTime={false}
        startLabel="Startdatum"
        endLabel="Enddatum"
      />
      <Input
        label="Budget"
        type="text"
        value={values.budgetAmount}
        onChange={(e) => onChange({ ...values, budgetAmount: e.target.value })}
        placeholder="z. B. 1200"
        inputMode="decimal"
      />
      <Input
        label="Unterkunft"
        value={values.accommodation}
        onChange={(e) => onChange({ ...values, accommodation: e.target.value })}
        placeholder="Hotel, Wohnung…"
      />
      <EntityNoteField />
      <Textarea
        label="Packliste"
        value={values.packingListText}
        onChange={(e) => onChange({ ...values, packingListText: e.target.value })}
        placeholder="Ein Artikel pro Zeile — wie die Einkaufsliste"
        rows={4}
      />
      <Textarea
        label="Orte"
        value={values.placesText}
        onChange={(e) => onChange({ ...values, placesText: e.target.value })}
        placeholder={'Ein Ort pro Zeile, z. B.\nRestaurant XYZ | restaurant | https://maps…'}
        hint="Format: Name | Art | Maps-Link (Art optional: restaurant, café, sehenswürdigkeit)"
        rows={4}
      />
      <p className="text-xs text-text-muted">
        Hero-Bild nach dem Speichern hinzufügen. Verknüpfte Momente erscheinen automatisch.
      </p>
    </>
  )
}

export const defaultTripDetail: TripDetailValues = {
  destination: '',
  budgetAmount: '',
  accommodation: '',
  packingListText: '',
  placesText: '',
  budgetId: '',
}
