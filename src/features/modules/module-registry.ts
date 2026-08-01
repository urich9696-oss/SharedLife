import type { EntityType } from '@/lib/indexed-db/schema'

export interface ModuleDefinition {
  key: string
  label: string
  description: string
  path: string
  entityTypes?: EntityType[]
  accent: string
  imageHint: string
}

/** Desktop sidebar + mobile „Mehr“ overview */
export const MODULE_REGISTRY: ModuleDefinition[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'Heute und euer gemeinsames Leben',
    path: '/',
    accent: 'bg-primary/15 text-primary',
    imageHint: 'Zuhause',
  },
  {
    key: 'beziehung',
    label: 'Beziehung',
    description: 'Dates, Wünsche und Journal',
    path: '/module/beziehung',
    entityTypes: ['date', 'wish', 'journal', 'moment'],
    accent: 'bg-emotional/15 text-emotional',
    imageHint: 'Beziehung',
  },
  {
    key: 'reisen',
    label: 'Reisen',
    description: 'Trips, Packlisten und Erinnerungen',
    path: '/module/reisen',
    entityTypes: ['trip'],
    accent: 'bg-blue/15 text-blue',
    imageHint: 'Reisen',
  },
  {
    key: 'zuhause',
    label: 'Zuhause',
    description: 'Haushalt, Inventar und Wartung',
    path: '/module/zuhause',
    entityTypes: ['household', 'task'],
    accent: 'bg-primary/15 text-primary',
    imageHint: 'Zuhause',
  },
  {
    key: 'finanzen',
    label: 'Finanzen',
    description: 'Ausgaben, Budgets und Sparziele',
    path: '/module/finanzen',
    entityTypes: ['expense', 'goal'],
    accent: 'bg-green/15 text-green',
    imageHint: 'Finanzen',
  },
  {
    key: 'einkauf',
    label: 'Einkauf',
    description: 'Gemeinsame Einkaufslisten',
    path: '/module/einkauf',
    entityTypes: ['list'],
    accent: 'bg-orange/15 text-orange',
    imageHint: 'Einkauf',
  },
  {
    key: 'rezepte',
    label: 'Rezepte',
    description: 'Lieblingsgerichte zu zweit',
    path: '/module/rezepte',
    entityTypes: ['recipe'],
    accent: 'bg-coral/15 text-coral',
    imageHint: 'Rezepte',
  },
  {
    key: 'ziele',
    label: 'Ziele',
    description: 'Gemeinsame Vorhaben',
    path: '/module/ziele',
    entityTypes: ['goal', 'milestone'],
    accent: 'bg-purple/15 text-purple',
    imageHint: 'Ziele',
  },
  {
    key: 'freizeit',
    label: 'Freizeit',
    description: 'Filme, Restaurants und Ideen',
    path: '/module/freizeit',
    entityTypes: ['leisure', 'date'],
    accent: 'bg-blue/15 text-blue',
    imageHint: 'Freizeit',
  },
  {
    key: 'geschenke',
    label: 'Geschenke',
    description: 'Ideen, Anlässe und Status',
    path: '/module/geschenke',
    entityTypes: ['gift', 'wish'],
    accent: 'bg-emotional/15 text-emotional',
    imageHint: 'Geschenke',
  },
  {
    key: 'erinnerungen',
    label: 'Erinnerungen',
    description: 'Fotos und Momente',
    path: '/erinnerungen',
    entityTypes: ['moment'],
    accent: 'bg-sand/40 text-text',
    imageHint: 'Erinnerungen',
  },
  {
    key: 'timeline',
    label: 'Timeline',
    description: 'Eure gemeinsame Geschichte',
    path: '/timeline',
    accent: 'bg-surface-soft text-text',
    imageHint: 'Timeline',
  },
  {
    key: 'settings',
    label: 'Einstellungen',
    description: 'Profil, Sync und Benachrichtigungen',
    path: '/settings',
    accent: 'bg-surface-soft text-text-muted',
    imageHint: 'Settings',
  },
]

export const DASHBOARD_MODULE_CARDS = MODULE_REGISTRY.filter((m) =>
  ['beziehung', 'reisen', 'zuhause', 'finanzen', 'einkauf', 'rezepte', 'ziele', 'freizeit'].includes(
    m.key,
  ),
)
