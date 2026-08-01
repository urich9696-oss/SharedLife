import { describe, expect, it } from 'vitest'

function normalizeTitle(title: string) {
  return title.trim().toLowerCase().replace(/\s+/g, ' ')
}

describe('recipe ingredient dedupe helpers', () => {
  it('normalisiert Titel für Duplikaterkennung', () => {
    expect(normalizeTitle('  Milch  ')).toBe('milch')
    expect(normalizeTitle('Vollmilch 3.5%')).toBe('vollmilch 3.5%')
  })

  it('erkennt gleiche Zutaten unabhängig von Großschreibung', () => {
    const existing = new Set(['milch', 'brot'])
    expect(existing.has(normalizeTitle('Milch'))).toBe(true)
    expect(existing.has(normalizeTitle('Butter'))).toBe(false)
  })
})
