import { describe, expect, it } from 'vitest'
import { isTripIdea } from '@/features/trips/TripIdeasPage'
import { normalizeIngredientName } from '@/features/recipes/recipe-service'

describe('Ideen vs Planung V8', () => {
  it('Trip ohne Datum ist Reiseidee', () => {
    expect(
      isTripIdea({
        entity_type: 'trip',
        deleted_at: null,
        starts_at: null,
        all_day_start: null,
        status: 'active',
      }),
    ).toBe(true)
  })

  it('Trip mit Datum ist keine Idee', () => {
    expect(
      isTripIdea({
        entity_type: 'trip',
        deleted_at: null,
        starts_at: '2026-09-01T10:00:00.000Z',
        all_day_start: null,
        status: 'active',
      }),
    ).toBe(false)
  })
})

describe('Rezeptzutaten-Normalisierung', () => {
  it('entfernt überflüssige Satzzeichen ohne Mengen zu zerstören', () => {
    expect(normalizeIngredientName('  Tomaten,  ')).toBe('Tomaten')
    expect(normalizeIngredientName('• 200g Mehl')).toBe('200g Mehl')
    expect(normalizeIngredientName('Salz.')).toBe('Salz')
  })
})
