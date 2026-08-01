import { Textarea } from '@/components/ui/Textarea'
import { EntityNoteField } from '@/features/entities/SharedFormFields'

export interface RecipeDetailValues {
  servings: string
  ingredientsText: string
}

interface RecipeFormFieldsProps {
  values: RecipeDetailValues
  onChange: (values: RecipeDetailValues) => void
}

export function RecipeFormFields({ values, onChange }: RecipeFormFieldsProps) {
  return (
    <>
      <EntityNoteField
        label="Rezept / Notiz"
        placeholder="Zubereitung, Tipps, Portionen…"
        rows={6}
      />
      <Textarea
        label="Zutaten"
        value={values.ingredientsText}
        onChange={(e) => onChange({ ...values, ingredientsText: e.target.value })}
        placeholder={'Eine Zutat pro Zeile, z. B.\nMehl\n2 EL Butter\nSalz'}
        rows={5}
      />
      <p className="text-xs text-text-muted">
        Hero-Bild nach dem Speichern ergänzen. Zutaten kannst du jederzeit in der Detailansicht
        erweitern.
      </p>
    </>
  )
}

export const defaultRecipeDetail: RecipeDetailValues = {
  servings: '',
  ingredientsText: '',
}
