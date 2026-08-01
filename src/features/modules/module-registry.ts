import type { EntityType } from '@/lib/indexed-db/schema'

export interface ModuleDefinition {
  key: string
  label: string
  description: string
  path: string
  entityTypes?: EntityType[]
  accent: string
  imageHint: string
  group?: ModuleGroupKey
}

export type ModuleGroupKey = 'alltag' | 'plaene' | 'zeit' | 'geschichte' | 'system'

export interface ModuleGroup {
  key: ModuleGroupKey
  label: string
  modules: ModuleDefinition[]
}

/** Desktop sidebar + mobile „Mehr“ overview */
export const MODULE_REGISTRY: ModuleDefinition[] = [
  {
    key: 'dashboard',
    label: 'Home',
    description: 'Heute und euer gemeinsames Leben',
    path: '/',
    accent: 'bg-primary/15 text-primary',
    imageHint: 'Zuhause',
  },
  {
    key: 'planen',
    label: 'Planen',
    description: 'Termine, Aufgaben und Countdowns',
    path: '/planen',
    accent: 'bg-primary/15 text-primary',
    imageHint: 'Planen',
  },
  {
    key: 'einkauf',
    label: 'Einkauf',
    description: 'Gemeinsame Einkaufsliste',
    path: '/einkauf',
    entityTypes: ['list'],
    accent: 'bg-orange/15 text-orange',
    imageHint: 'Einkauf',
    group: 'alltag',
  },
  {
    key: 'zuhause',
    label: 'Zuhause',
    description: 'Haushalt, Inventar und Wartung',
    path: '/module/zuhause',
    entityTypes: ['household', 'task'],
    accent: 'bg-primary/15 text-primary',
    imageHint: 'Zuhause',
    group: 'alltag',
  },
  {
    key: 'finanzen',
    label: 'Finanzen',
    description: 'Ausgaben, Budgets und Sparziele',
    path: '/module/finanzen',
    entityTypes: ['expense', 'goal'],
    accent: 'bg-green/15 text-green',
    imageHint: 'Finanzen',
    group: 'alltag',
  },
  {
    key: 'reisen',
    label: 'Reisen',
    description: 'Trips, Packlisten und Erinnerungen',
    path: '/module/reisen',
    entityTypes: ['trip'],
    accent: 'bg-blue/15 text-blue',
    imageHint: 'Reisen',
    group: 'plaene',
  },
  {
    key: 'ziele',
    label: 'Ziele',
    description: 'Gemeinsame Vorhaben',
    path: '/module/ziele',
    entityTypes: ['goal', 'milestone'],
    accent: 'bg-purple/15 text-purple',
    imageHint: 'Ziele',
    group: 'plaene',
  },
  {
    key: 'geschenke',
    label: 'Geschenke',
    description: 'Ideen, Anlässe und Status',
    path: '/module/geschenke',
    entityTypes: ['gift', 'wish'],
    accent: 'bg-emotional/15 text-emotional',
    imageHint: 'Geschenke',
    group: 'plaene',
  },
  {
    key: 'beziehung',
    label: 'Beziehung',
    description: 'Dates, Journal und besondere Momente',
    path: '/module/beziehung',
    entityTypes: ['date', 'wish', 'journal', 'moment'],
    accent: 'bg-emotional/15 text-emotional',
    imageHint: 'Beziehung',
    group: 'zeit',
  },
  {
    key: 'freizeit',
    label: 'Freizeit',
    description: 'Filme, Restaurants und Ideen',
    path: '/module/freizeit',
    entityTypes: ['leisure', 'date'],
    accent: 'bg-blue/15 text-blue',
    imageHint: 'Freizeit',
    group: 'zeit',
  },
  {
    key: 'rezepte',
    label: 'Rezepte',
    description: 'Lieblingsgerichte zu zweit',
    path: '/module/rezepte',
    entityTypes: ['recipe'],
    accent: 'bg-coral/15 text-coral',
    imageHint: 'Rezepte',
    group: 'zeit',
  },
  {
    key: 'erinnerungen',
    label: 'Erinnerungen',
    description: 'Fotos und Momente',
    path: '/erinnerungen',
    entityTypes: ['moment'],
    accent: 'bg-sand/40 text-text',
    imageHint: 'Erinnerungen',
    group: 'geschichte',
  },
  {
    key: 'timeline',
    label: 'Timeline',
    description: 'Eure gemeinsame Geschichte',
    path: '/timeline',
    accent: 'bg-surface-soft text-text',
    imageHint: 'Timeline',
    group: 'geschichte',
  },
  {
    key: 'pair',
    label: 'Paarprofil',
    description: 'Namen, Startdatum und Text',
    path: '/settings/pair',
    accent: 'bg-surface-soft text-text',
    imageHint: 'Paar',
    group: 'system',
  },
  {
    key: 'settings',
    label: 'Einstellungen',
    description: 'Benachrichtigungen und Sync',
    path: '/settings',
    accent: 'bg-surface-soft text-text-muted',
    imageHint: 'Settings',
    group: 'system',
  },
]

const GROUP_ORDER: { key: ModuleGroupKey; label: string }[] = [
  { key: 'alltag', label: 'Unser Alltag' },
  { key: 'plaene', label: 'Unsere Pläne' },
  { key: 'zeit', label: 'Unsere Zeit' },
  { key: 'geschichte', label: 'Unsere Geschichte' },
  { key: 'system', label: 'Konto' },
]

export function getGroupedModules(options?: { includeSystem?: boolean }): ModuleGroup[] {
  const includeSystem = options?.includeSystem ?? true
  return GROUP_ORDER.filter((g) => includeSystem || g.key !== 'system').map((g) => ({
    key: g.key,
    label: g.label,
    modules: MODULE_REGISTRY.filter((m) => m.group === g.key),
  }))
}

export const PRIMARY_NAV = [
  { key: 'home', label: 'Home', path: '/', end: true },
  { key: 'planen', label: 'Planen', path: '/planen' },
  { key: 'erinnerungen', label: 'Erinnerungen', path: '/erinnerungen' },
] as const
