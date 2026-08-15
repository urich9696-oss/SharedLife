import { describe, expect, it } from 'vitest'
import {
  CONTENT_PLACEMENT,
  VORHABEN_TYPES,
  getUserFacingLabel,
  isVorhabenType,
  primaryPathForEntityType,
} from '@/features/content/content-map'
import { PLANNING_TABS, resolveCreateContext } from '@/features/entities/entity-types'
import { getGroupedModules, PRIMARY_NAV } from '@/features/modules/module-registry'

describe('V3 content architecture', () => {
  it('keeps three planning tabs', () => {
    expect(PLANNING_TABS.map((t) => t.key)).toEqual(['kalender', 'vorhaben', 'aufgaben'])
  })

  it('keeps five primary navigation destinations including Momente', () => {
    expect(PRIMARY_NAV).toHaveLength(3)
    expect(PRIMARY_NAV.map((n) => n.label)).toEqual(['Home', 'Planen', 'Momente'])
  })

  it('groups Mehr into V8 Ablage-Abschnitte', () => {
    const groups = getGroupedModules({ includeSystem: true })
    expect(groups.map((g) => g.key)).toEqual(['fuer-uns', 'alltag', 'finanzen', 'app'])
    expect(groups.every((g) => g.modules.length > 0)).toBe(true)
    expect(groups.find((g) => g.key === 'fuer-uns')?.modules.map((m) => m.key)).toEqual(
      expect.arrayContaining(['geschenke', 'freizeit', 'reiseideen']),
    )
    expect(groups.find((g) => g.key === 'alltag')?.modules.map((m) => m.key)).toEqual(
      expect.arrayContaining(['einkauf', 'rezepte', 'aufgaben']),
    )
  })

  it('maps vorhaben types without renaming database entity types', () => {
    expect(VORHABEN_TYPES).toEqual(expect.arrayContaining(['trip', 'date', 'goal', 'project']))
    expect(isVorhabenType('trip')).toBe(true)
    expect(isVorhabenType('task')).toBe(false)
    expect(CONTENT_PLACEMENT.expense.primaryHome).toBe('mehr-finanzen')
    expect(CONTENT_PLACEMENT.list.primaryHome).toBe('einkauf')
  })

  it('uses user-facing labels instead of technical terms', () => {
    expect(getUserFacingLabel('moment')).toBe('Moment')
    expect(getUserFacingLabel('date')).toBe('Date')
    expect(getUserFacingLabel('leisure')).toBe('Date Idee')
    expect(getUserFacingLabel('milestone')).toBe('Meilenstein')
  })

  it('resolves create context from routes', () => {
    expect(resolveCreateContext('/einkauf')).toBe('einkauf')
    expect(resolveCreateContext('/erinnerungen')).toBe('momente')
    expect(resolveCreateContext('/planen', '?tab=aufgaben')).toBe('aufgaben')
    expect(resolveCreateContext('/planen', '?tab=vorhaben')).toBe('vorhaben')
    expect(resolveCreateContext('/planen')).toBe('kalender')
  })

  it('points entity types to their canonical homes', () => {
    expect(primaryPathForEntityType('event')).toContain('kalender')
    expect(primaryPathForEntityType('task')).toContain('aufgaben')
    expect(primaryPathForEntityType('trip')).toContain('vorhaben')
    expect(primaryPathForEntityType('list')).toBe('/einkauf')
  })
})
