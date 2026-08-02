import { v4 as uuidv4 } from 'uuid'
import {
  createChecklist,
  createChecklistItem,
  listChecklistItems,
  listChecklistsForEntity,
} from '@/lib/indexed-db/repositories/checklists'
import { ensureShoppingList } from '@/features/shopping/shopping-service'

export interface RecipeIngredient {
  name: string
  quantity?: string | null
  unit?: string | null
}

function normalizeTitle(title: string) {
  return title.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function getRecipeIngredients(entityId: string): Promise<{
  checklistId: string | null
  ingredients: Array<{ id: string; name: string; quantity?: string | null; unit?: string | null }>
}> {
  const checklists = await listChecklistsForEntity(entityId)
  const checklist =
    checklists.find((c) => /zutat/i.test(c.title)) ??
    checklists.find((c) => !c.deleted_at) ??
    null
  if (!checklist) return { checklistId: null, ingredients: [] }
  const items = await listChecklistItems(checklist.id)
  return {
    checklistId: checklist.id,
    ingredients: items.map((i) => ({
      id: i.id,
      name: i.title,
      quantity: i.quantity,
      unit: i.unit,
    })),
  }
}

export async function ensureRecipeIngredientsList(input: {
  spaceId: string
  entityId: string
}): Promise<string> {
  const existing = await listChecklistsForEntity(input.entityId)
  const found = existing.find((c) => /zutat/i.test(c.title))
  if (found) return found.id
  const created = await createChecklist({
    id: uuidv4(),
    spaceId: input.spaceId,
    entityId: input.entityId,
    title: 'Zutaten',
  })
  return created.id
}

export async function addIngredient(input: {
  spaceId: string
  entityId: string
  ingredient: RecipeIngredient
}): Promise<void> {
  const checklistId = await ensureRecipeIngredientsList({
    spaceId: input.spaceId,
    entityId: input.entityId,
  })
  const items = await listChecklistItems(checklistId)
  await createChecklistItem({
    id: uuidv4(),
    spaceId: input.spaceId,
    checklistId,
    title: input.ingredient.name.trim(),
    sortOrder: items.length,
    quantity: input.ingredient.quantity ?? null,
    unit: input.ingredient.unit ?? null,
    category: 'Rezept',
  })
}

/** Eine Zutat pro Zeile (wie Packliste). */
export function parseIngredientLines(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/** Legt die Zutaten-Checkliste an und füllt optionale Zeilen. */
export async function seedRecipeIngredients(input: {
  spaceId: string
  entityId: string
  ingredientsText?: string | null
}): Promise<string> {
  const checklistId = await ensureRecipeIngredientsList({
    spaceId: input.spaceId,
    entityId: input.entityId,
  })
  const lines = parseIngredientLines(input.ingredientsText)
  for (const [index, name] of lines.entries()) {
    await createChecklistItem({
      id: uuidv4(),
      spaceId: input.spaceId,
      checklistId,
      title: name,
      sortOrder: index,
      category: 'Rezept',
    })
  }
  return checklistId
}

/** Kopiert Zutaten von einem Rezept auf ein anderes. */
export async function copyRecipeIngredients(input: {
  spaceId: string
  fromEntityId: string
  toEntityId: string
}): Promise<number> {
  const { ingredients } = await getRecipeIngredients(input.fromEntityId)
  if (ingredients.length === 0) {
    await ensureRecipeIngredientsList({
      spaceId: input.spaceId,
      entityId: input.toEntityId,
    })
    return 0
  }
  const checklistId = await ensureRecipeIngredientsList({
    spaceId: input.spaceId,
    entityId: input.toEntityId,
  })
  for (const [index, ingredient] of ingredients.entries()) {
    await createChecklistItem({
      id: uuidv4(),
      spaceId: input.spaceId,
      checklistId,
      title: ingredient.name,
      sortOrder: index,
      quantity: ingredient.quantity ?? null,
      unit: ingredient.unit ?? null,
      category: 'Rezept',
    })
  }
  return ingredients.length
}

/** Fügt Rezeptzutaten zur Einkaufsliste hinzu — ohne Duplikate. */
export async function addRecipeIngredientsToShopping(input: {
  spaceId: string
  entityId: string
  userId?: string | null
}): Promise<{ added: number; skipped: number }> {
  const { ingredients } = await getRecipeIngredients(input.entityId)
  if (ingredients.length === 0) return { added: 0, skipped: 0 }

  const { checklistId } = await ensureShoppingList(input.spaceId, input.userId)
  const existing = await listChecklistItems(checklistId)
  const activeTitles = new Set(
    existing.filter((i) => !i.is_checked).map((i) => normalizeTitle(i.title)),
  )

  let added = 0
  let skipped = 0
  for (const ingredient of ingredients) {
    const key = normalizeTitle(ingredient.name)
    if (!key || activeTitles.has(key)) {
      skipped += 1
      continue
    }
    await createChecklistItem({
      id: uuidv4(),
      spaceId: input.spaceId,
      checklistId,
      title: ingredient.name.trim(),
      sortOrder: existing.length + added,
      quantity: ingredient.quantity ?? null,
      unit: ingredient.unit ?? null,
      category: 'Rezept',
    })
    activeTitles.add(key)
    added += 1
  }

  return { added, skipped }
}
