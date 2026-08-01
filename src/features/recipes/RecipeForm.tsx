import { EntityNoteField } from '@/features/entities/SharedFormFields'

export interface RecipeDetailValues {
  // Platzhalter – Zutaten werden als Checkliste geführt
  servings: string
}

interface RecipeFormFieldsProps {
  values: RecipeDetailValues
  onChange: (values: RecipeDetailValues) => void
}

export function RecipeFormFields(_props: RecipeFormFieldsProps) {
  return (
    <>
      <EntityNoteField
        label="Rezept / Notiz"
        placeholder="Zubereitung, Tipps, Portionen…"
        rows={6}
      />
      <p className="text-xs text-text-muted">
        Hero-Bild und Zutaten (wie Einkaufsliste) nach dem Speichern im Rezept-Modul ergänzen.
      </p>
    </>
  )
}

export const defaultRecipeDetail: RecipeDetailValues = {
  servings: '',
}
