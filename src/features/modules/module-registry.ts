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

/** V3 Mehr-Gruppen */
export type ModuleGroupKey = 'alltag' | 'inspiration' | 'finanzen' | 'einstellungen'

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
    description: 'Kalender, Vorhaben und Aufgaben',
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
    key: 'rezepte',
    label: 'Rezepte',
    description: 'Lieblingsgerichte zu zweit',
    path: '/module/rezepte',
    entityTypes: ['recipe'],
    accent: 'bg-coral/15 text-coral',
    imageHint: 'Rezepte',
    group: 'alltag',
  },
  {
    key: 'geschenke',
    label: 'Wünsche',
    description: 'Wünsche und Geschenkideen',
    path: '/module/geschenke',
    entityTypes: ['gift', 'wish'],
    accent: 'bg-emotional/15 text-emotional',
    imageHint: 'Wünsche',
    group: 'inspiration',
  },
  {
    key: 'freizeit',
    label: 'Date Ideen',
    description: 'Ideen für gemeinsame Dates',
    path: '/module/freizeit',
    entityTypes: ['leisure'],
    accent: 'bg-blue/15 text-blue',
    imageHint: 'Date Ideen',
    group: 'inspiration',
  },

  {
    key: 'finanzen',
    label: 'Finanzen',
    description: 'Budgets und Ausgaben im Überblick',
    path: '/module/finanzen',
    entityTypes: ['expense', 'goal'],
    accent: 'bg-green/15 text-green',
    imageHint: 'Finanzen',
    group: 'finanzen',
  },
  {
    key: 'settings',
    label: 'App-Einstellungen',
    description: 'Darstellung, Sync und Benachrichtigungen',
    path: '/settings',
    accent: 'bg-surface-soft text-text-muted',
    imageHint: 'Settings',
    group: 'einstellungen',
  },
  {
    key: 'pair',
    label: 'Profil & Space',
    description: 'Paarprofil und gemeinsamer Space',
    path: '/settings/pair',
    accent: 'bg-surface-soft text-text',
    imageHint: 'Paar',
    group: 'einstellungen',
  },
  {
    key: 'trash',
    label: 'Papierkorb',
    description: 'Gelöschte Einträge wiederherstellen',
    path: '/trash',
    accent: 'bg-surface-soft text-text-muted',
    imageHint: 'Papierkorb',
    group: 'einstellungen',
  },
  {
    key: 'conflicts',
    label: 'Sync-Konflikte',
    description: 'Abweichungen zwischen Geräten klären',
    path: '/conflicts',
    accent: 'bg-surface-soft text-text-muted',
    imageHint: 'Sync',
    group: 'einstellungen',
  },
]

/** Legacy-Modulpfade → neuer kanonischer Ort (Deep Links bleiben gültig) */
export const LEGACY_MODULE_REDIRECTS: Record<string, string> = {
  reisen: '/planen?tab=vorhaben&filter=trip',
  ziele: '/planen?tab=vorhaben&filter=goal',
  beziehung: '/erinnerungen',
  /** Zuhause-Modul entfernt – Deep Links landen im Alltag (Einkauf) */
  zuhause: '/einkauf',
}

const GROUP_ORDER: { key: ModuleGroupKey; label: string }[] = [
  { key: 'alltag', label: 'Alltag' },
  { key: 'inspiration', label: 'Inspiration' },
  { key: 'finanzen', label: 'Finanzen' },
  { key: 'einstellungen', label: 'Einstellungen' },
]

export function getGroupedModules(options?: { includeSystem?: boolean }): ModuleGroup[] {
  const includeSystem = options?.includeSystem ?? true
  return GROUP_ORDER.filter((g) => includeSystem || g.key !== 'einstellungen').map((g) => ({
    key: g.key,
    label: g.label,
    modules: MODULE_REGISTRY.filter((m) => m.group === g.key),
  }))
}

export const PRIMARY_NAV = [
  { key: 'home', label: 'Home', path: '/', end: true },
  { key: 'planen', label: 'Planen', path: '/planen' },
  { key: 'erinnerungen', label: 'Momente', path: '/erinnerungen' },
] as const
