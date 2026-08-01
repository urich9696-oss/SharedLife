import { v4 as uuidv4 } from 'uuid'
import { createEntity } from '@/lib/indexed-db/repositories/entities'
import { upsertEntityDetail } from '@/lib/indexed-db/repositories/entity-details'
import { createChecklist, createChecklistItem } from '@/lib/indexed-db/repositories/checklists'
import { createBudget, listBudgets } from '@/lib/indexed-db/repositories/budgets'
import { db } from '@/lib/indexed-db/db'
import { ensureShoppingList } from '@/features/shopping/shopping-service'
import type { CreateEntityPayload } from '@/lib/validation/entity'
import type { EntityType } from '@/lib/indexed-db/schema'

const SAMPLE_FLAG = 'sampleBatch'
const SAMPLE_BATCH = 'v4-rich-2026-08'

function dateDaysFromNow(days: number): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isoDaysFromNow(days: number, hour = 10): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

type SampleEntity = Omit<CreateEntityPayload, 'space_id' | 'id' | 'sort_order' | 'metadata'> & {
  id?: string
  metadata?: Record<string, unknown>
  detailType?: 'trip' | 'date' | 'goal' | 'event' | 'task' | 'list' | 'wish' | 'moment' | 'project'
  detail?: Record<string, unknown>
}

/** Lädt reichhaltige fiktive Musterdaten in den lokalen Space (mit Sync-Outbox). */
export async function loadSampleData(spaceId: string, userId: string | null): Promise<number> {
  const existing = await db.entities
    .where('space_id')
    .equals(spaceId)
    .filter((e) => !e.deleted_at && e.metadata?.[SAMPLE_FLAG] === SAMPLE_BATCH)
    .count()
  if (existing > 0) {
    return 0
  }

  const samples: SampleEntity[] = [
    // Date Ideen (leisure) mit Datums-Vorschlag
    {
      entity_type: 'leisure',
      title: 'Picknick am Zürichsee',
      description: 'Decke, selbstgemachte Lemonade, Playlist für den Sonnenuntergang.',
      status: 'active',
      all_day_start: dateDaysFromNow(3),
      all_day_end: dateDaysFromNow(3),
      metadata: { place: 'Zürichhorn', link: 'https://maps.google.com', ideaCategory: 'date' },
    },
    {
      entity_type: 'leisure',
      title: 'Kerzenlicht-Dinner zu Hause',
      description: 'Drei Gänge, kein Handy, Lieblingswein.',
      status: 'active',
      all_day_start: dateDaysFromNow(6),
      all_day_end: dateDaysFromNow(6),
      metadata: { place: 'Zuhause', ideaCategory: 'date' },
    },
    {
      entity_type: 'leisure',
      title: 'Nachtwanderung Uetliberg',
      description: 'Stirnlampen, Thermoskanne, Sternenhimmel.',
      status: 'draft',
      all_day_start: dateDaysFromNow(14),
      all_day_end: dateDaysFromNow(14),
      metadata: { place: 'Uetliberg', ideaCategory: 'date' },
    },
    {
      entity_type: 'leisure',
      title: 'Flohmarkt & Café Brunnen',
      description: 'Schätze suchen, danach Cappuccino teilen.',
      status: 'active',
      all_day_start: dateDaysFromNow(10),
      all_day_end: dateDaysFromNow(10),
      metadata: { place: 'Bürkliplatz', ideaCategory: 'date' },
    },
    {
      entity_type: 'leisure',
      title: 'Kino + Streetfood',
      description: 'Spontaner Filmabend, danach Food Court.',
      status: 'active',
      all_day_start: dateDaysFromNow(2),
      all_day_end: dateDaysFromNow(2),
      metadata: { place: 'Sihlcity', link: 'https://www.kitag.com', ideaCategory: 'date' },
    },
    {
      entity_type: 'leisure',
      title: 'Therme Bad Zurzach',
      description: 'Ganzer Tag entspannen, Sauna-Runde.',
      status: 'active',
      all_day_start: dateDaysFromNow(21),
      all_day_end: dateDaysFromNow(21),
      metadata: { place: 'Bad Zurzach', ideaCategory: 'date' },
    },
    {
      entity_type: 'leisure',
      title: 'Kochkurs für zwei',
      description: 'Pasta frisch machen lernen.',
      status: 'draft',
      all_day_start: dateDaysFromNow(28),
      all_day_end: dateDaysFromNow(28),
      metadata: { place: 'Zürich', ideaCategory: 'date' },
    },
    {
      entity_type: 'leisure',
      title: 'Museumsnacht',
      description: 'Kunsthalle + anschliessend Weinbar.',
      status: 'active',
      all_day_start: dateDaysFromNow(35),
      all_day_end: dateDaysFromNow(35),
      metadata: { place: 'Kunsthaus Zürich', ideaCategory: 'date' },
    },

    // Dates
    {
      entity_type: 'date',
      title: 'Dinner Date Kronenhalle',
      description: 'Reservierung 19:30 — kein Handy am Tisch.',
      status: 'active',
      starts_at: isoDaysFromNow(5, 19),
      ends_at: isoDaysFromNow(5, 22),
      detailType: 'date',
      detail: { phase: 'planned', budgetId: null },
      metadata: { reservationStatus: 'confirmed', assigneeRole: 'gemeinsam' },
    },
    {
      entity_type: 'date',
      title: 'Sonnenaufgang Uetliberg',
      description: 'Thermoskanne, Decken, frühes Aufstehen.',
      status: 'draft',
      starts_at: isoDaysFromNow(9, 5),
      ends_at: isoDaysFromNow(9, 8),
      detailType: 'date',
      detail: { phase: 'idea' },
      metadata: { reservationStatus: 'none', assigneeRole: 'gemeinsam' },
    },
    {
      entity_type: 'date',
      title: 'Bootsfahrt Vierwaldstättersee',
      description: 'Tickets online, Picnic-Korb mitnehmen.',
      status: 'active',
      starts_at: isoDaysFromNow(18, 11),
      ends_at: isoDaysFromNow(18, 16),
      detailType: 'date',
      detail: { phase: 'planned' },
      metadata: { reservationStatus: 'pending', assigneeRole: 'lea' },
    },

    // Trips
    {
      entity_type: 'trip',
      title: 'Griechenland – Inselhopping',
      description: 'Athen → Naxos → Santorin. Leichte Koffer, viel Sonne.',
      status: 'active',
      all_day_start: dateDaysFromNow(45),
      all_day_end: dateDaysFromNow(56),
      detailType: 'trip',
      detail: { destination: 'Griechenland', accommodation: 'Mix Airbnb / Boutique' },
      metadata: {
        packingListText: 'Adapter\nSonnencreme\nWanderstiefel\nBademode',
        placesText: 'Akropolis\nNaxos Altstadt\nOia Sunset',
        budgetAmount: '2800',
      },
    },
    {
      entity_type: 'trip',
      title: 'Wochenende Tessin',
      description: 'See, Gelato, Wanderung Monte Brè.',
      status: 'active',
      all_day_start: dateDaysFromNow(12),
      all_day_end: dateDaysFromNow(14),
      detailType: 'trip',
      detail: { destination: 'Lugano', accommodation: 'Hotel Bellevue' },
      metadata: { budgetAmount: '650', placesText: 'Paradiso\nGandria\nMonte Brè' },
    },
    {
      entity_type: 'trip',
      title: 'Berlin Kurztrip',
      description: 'Kultur, Streetfood, Flohmärkte.',
      status: 'draft',
      all_day_start: dateDaysFromNow(70),
      all_day_end: dateDaysFromNow(73),
      detailType: 'trip',
      detail: { destination: 'Berlin' },
      metadata: { budgetAmount: '900' },
    },

    // Goals
    {
      entity_type: 'goal',
      title: 'Gemeinsame Wohnung finden',
      description: 'Mind. 3.5 Zimmer, max. 45 Min Pendelweg, Balkon wäre Traum.',
      status: 'active',
      detailType: 'goal',
      detail: { targetAmount: '0', currentAmount: '0', motivation: 'Unser Nest' },
      metadata: {},
    },
    {
      entity_type: 'goal',
      title: 'Gemeinsam fitter werden',
      description: '2× pro Woche laufen oder Yoga.',
      status: 'active',
      detailType: 'goal',
      detail: { targetAmount: '24', currentAmount: '7', unit: 'Workouts' },
      metadata: {},
    },
    {
      entity_type: 'goal',
      title: 'Notfallpolster aufbauen',
      description: '3 Monatsausgaben auf dem Sparkonto.',
      status: 'active',
      detailType: 'goal',
      detail: { targetAmount: '12000', currentAmount: '4800' },
      metadata: {},
    },

    // Events
    {
      entity_type: 'event',
      title: 'Brunch bei Sam & Alex',
      description: 'Salat mitbringen.',
      status: 'active',
      starts_at: isoDaysFromNow(2, 11),
      ends_at: isoDaysFromNow(2, 14),
      detailType: 'event',
      detail: {},
      metadata: { eventAssignment: 'termin', assigneeRole: 'gemeinsam' },
    },
    {
      entity_type: 'event',
      title: 'Zahnarzt Dennis',
      status: 'active',
      starts_at: isoDaysFromNow(8, 9),
      ends_at: isoDaysFromNow(8, 10),
      detailType: 'event',
      detail: {},
      metadata: { eventAssignment: 'termin', assigneeRole: 'dennis' },
    },
    {
      entity_type: 'event',
      title: 'Jahrestag',
      description: 'Überraschung planen!',
      status: 'active',
      all_day_start: dateDaysFromNow(21),
      all_day_end: dateDaysFromNow(21),
      detailType: 'event',
      detail: {},
      metadata: { eventAssignment: 'termin', assigneeRole: 'gemeinsam' },
    },
    {
      entity_type: 'event',
      title: 'Elternabend Lea',
      status: 'active',
      starts_at: isoDaysFromNow(4, 18),
      ends_at: isoDaysFromNow(4, 20),
      detailType: 'event',
      detail: {},
      metadata: { assigneeRole: 'lea' },
    },

    // Tasks
    {
      entity_type: 'task',
      title: 'Kofferliste fertig machen',
      status: 'active',
      starts_at: isoDaysFromNow(1, 18),
      detailType: 'task',
      detail: { priority: 'high' },
      metadata: {
        assigneeRole: 'gemeinsam',
        subtasksText: 'Adapter prüfen\nMedikamente\nSnacks für Flug',
        recurrenceRule: 'none',
      },
    },
    {
      entity_type: 'task',
      title: 'Reiseversicherung prüfen',
      status: 'active',
      starts_at: isoDaysFromNow(3, 17),
      detailType: 'task',
      detail: { priority: 'medium' },
      metadata: { assigneeRole: 'dennis', recurrenceRule: 'none' },
    },
    {
      entity_type: 'task',
      title: 'Einkaufen für Brunch',
      status: 'active',
      starts_at: isoDaysFromNow(1, 16),
      detailType: 'task',
      detail: { priority: 'medium' },
      metadata: { assigneeRole: 'lea', recurrenceRule: 'none' },
    },
    {
      entity_type: 'task',
      title: 'Blumen fürs Wohnzimmer',
      status: 'active',
      starts_at: isoDaysFromNow(0, 12),
      detailType: 'task',
      detail: {},
      metadata: { assigneeRole: 'gemeinsam', recurrenceRule: 'weekly' },
    },
    {
      entity_type: 'task',
      title: 'Mietvertrag vergleichen',
      status: 'draft',
      starts_at: isoDaysFromNow(7, 19),
      detailType: 'task',
      detail: { priority: 'high' },
      metadata: { assigneeRole: 'dennis' },
    },

    // Moments
    {
      entity_type: 'moment',
      title: 'Sonnenuntergang am Zürichsee',
      description: 'Eis in der Hand, Beine im Wasser — ein perfekter Juliabend.',
      status: 'active',
      all_day_start: dateDaysFromNow(-10),
      all_day_end: dateDaysFromNow(-10),
      detailType: 'moment',
      detail: { mood: 'glücklich', isFavorite: true },
      metadata: { place: 'Zürichsee', momentCategory: 'alltag', belonging: 'gemeinsam' },
    },
    {
      entity_type: 'moment',
      title: 'Erster gemeinsamer Schlüssel',
      description: 'Tür auf, Kaffee rein, Musik an.',
      status: 'active',
      all_day_start: dateDaysFromNow(-40),
      all_day_end: dateDaysFromNow(-40),
      detailType: 'moment',
      detail: { isFavorite: true },
      metadata: { place: 'Zuhause', momentCategory: 'meilenstein', belonging: 'gemeinsam' },
    },
    {
      entity_type: 'moment',
      title: 'Regenwanderung mit Lachen',
      description: 'Komplett nass, trotzdem die besten Fotos.',
      status: 'active',
      all_day_start: dateDaysFromNow(-5),
      all_day_end: dateDaysFromNow(-5),
      detailType: 'moment',
      detail: {},
      metadata: { place: 'Sihlwald', momentCategory: 'abenteuer', belonging: 'gemeinsam' },
    },
    {
      entity_type: 'moment',
      title: 'Sonntagsfrühstück im Bett',
      description: 'Croissants, Orangensaft, keine Pläne.',
      status: 'active',
      all_day_start: dateDaysFromNow(-2),
      all_day_end: dateDaysFromNow(-2),
      detailType: 'moment',
      detail: { isFavorite: true },
      metadata: { place: 'Zuhause', momentCategory: 'alltag', belonging: 'gemeinsam' },
    },
    {
      entity_type: 'moment',
      title: 'Konzert im Dachstock',
      description: 'Live-Musik, geteilte Kopfhörer auf dem Heimweg.',
      status: 'active',
      all_day_start: dateDaysFromNow(-18),
      all_day_end: dateDaysFromNow(-18),
      detailType: 'moment',
      detail: {},
      metadata: { place: 'Zürich', momentCategory: 'kultur', belonging: 'gemeinsam' },
    },

    // Wishes
    {
      entity_type: 'wish',
      title: 'Kompaktkamera für Reisen',
      description: 'Leicht, gute Low-Light-Qualität.',
      status: 'active',
      detailType: 'wish',
      detail: { price: '650', priority: 'high', url: '' },
      metadata: { occasion: 'Geburtstag', wishStatus: 'open' },
    },
    {
      entity_type: 'wish',
      title: 'Konzerttickets Openair',
      status: 'active',
      detailType: 'wish',
      detail: { price: '180', priority: 'medium' },
      metadata: { occasion: 'Sommer', wishStatus: 'open' },
    },
    {
      entity_type: 'wish',
      title: 'Kochkurs-Gutschein',
      status: 'active',
      detailType: 'wish',
      detail: { price: '220', priority: 'low' },
      metadata: { occasion: 'Weihnachten', wishStatus: 'open' },
    },

    // Recipes
    {
      entity_type: 'recipe',
      title: 'Pasta al Limone',
      description: 'Zitronig, cremig, unter 20 Minuten.',
      status: 'active',
      metadata: {
        ingredientsText: 'Spaghetti\nZitrone\nParmesan\nButter\nPfeffer',
      },
    },
    {
      entity_type: 'recipe',
      title: 'Shakshuka für zwei',
      description: 'Wochenend-Brunch Klassiker.',
      status: 'active',
      metadata: {
        ingredientsText: 'Eier\nTomaten\nPaprika\nZwiebel\nKreuzkümmel\nBrot',
      },
    },
    {
      entity_type: 'recipe',
      title: 'Ofengemüse mit Halloumi',
      description: 'One-Tray, wenig Abwasch.',
      status: 'active',
      metadata: {
        ingredientsText: 'Zucchini\nPaprika\nHalloumi\nOlivenöl\nThymian',
      },
    },

    // Expenses / income
    {
      entity_type: 'expense',
      title: 'Miete',
      status: 'active',
      all_day_start: dateDaysFromNow(-3),
      metadata: {
        amount: '1850',
        category: 'Wohnen',
        paidBy: 'gemeinsam',
        financeKind: 'expense',
        recurrence: 'monthly',
      },
    },
    {
      entity_type: 'expense',
      title: 'Wocheneinkauf Coop',
      status: 'active',
      all_day_start: dateDaysFromNow(-1),
      metadata: {
        amount: '112.40',
        category: 'Lebensmittel',
        paidBy: 'lea',
        financeKind: 'expense',
        recurrence: 'once',
      },
    },
    {
      entity_type: 'expense',
      title: 'ÖV-Abo Dennis',
      status: 'active',
      all_day_start: dateDaysFromNow(-5),
      metadata: {
        amount: '86',
        category: 'Mobilität',
        paidBy: 'dennis',
        financeKind: 'expense',
        recurrence: 'monthly',
      },
    },
    {
      entity_type: 'expense',
      title: 'Restaurant Brunch',
      status: 'active',
      all_day_start: dateDaysFromNow(-6),
      metadata: {
        amount: '68.50',
        category: 'Freizeit',
        paidBy: 'gemeinsam',
        financeKind: 'expense',
        recurrence: 'once',
      },
    },
    {
      entity_type: 'expense',
      title: 'Netflix',
      status: 'active',
      all_day_start: dateDaysFromNow(-8),
      metadata: {
        amount: '18.90',
        category: 'Abo',
        paidBy: 'gemeinsam',
        financeKind: 'expense',
        recurrence: 'monthly',
      },
    },
    {
      entity_type: 'expense',
      title: 'Lohn Dennis',
      status: 'active',
      all_day_start: dateDaysFromNow(-2),
      metadata: {
        amount: '5200',
        category: 'Gehalt',
        paidBy: 'dennis',
        financeKind: 'income',
        recurrence: 'monthly',
      },
    },
    {
      entity_type: 'expense',
      title: 'Lohn Lea',
      status: 'active',
      all_day_start: dateDaysFromNow(-2),
      metadata: {
        amount: '4100',
        category: 'Gehalt',
        paidBy: 'lea',
        financeKind: 'income',
        recurrence: 'monthly',
      },
    },
    {
      entity_type: 'expense',
      title: 'Steuer-Rückerstattung',
      status: 'active',
      all_day_start: dateDaysFromNow(-12),
      metadata: {
        amount: '340',
        category: 'Sonstiges',
        paidBy: 'gemeinsam',
        financeKind: 'income',
        recurrence: 'once',
      },
    },
  ]

  let created = 0

  for (const sample of samples) {
    const id = sample.id ?? uuidv4()
    const { detailType, detail, ...payload } = sample
    await createEntity(
      {
        id,
        space_id: spaceId,
        ...payload,
        metadata: {
          ...(payload.metadata ?? {}),
          [SAMPLE_FLAG]: SAMPLE_BATCH,
        },
        sort_order: created,
      },
      userId,
    )
    if (detailType) {
      await upsertEntityDetail({
        entityId: id,
        spaceId,
        detailType,
        payload: detail ?? {},
      })
    }

    if ((payload.entity_type as EntityType) === 'recipe') {
      const checklist = await createChecklist({
        id: uuidv4(),
        spaceId,
        entityId: id,
        title: 'Zutaten',
      })
      const lines = String(payload.metadata?.ingredientsText || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      for (let i = 0; i < lines.length; i++) {
        await createChecklistItem({
          id: uuidv4(),
          spaceId,
          checklistId: checklist.id,
          title: `🍽️ ${lines[i]}`,
          sortOrder: i,
        })
      }
    }

    created += 1
  }

  // Einkaufsliste füllen
  const shopping = await ensureShoppingList(spaceId, userId)
  const shoppingItems = [
    'Milch',
    'Brot',
    'Avocados',
    'Zitronen',
    'Spaghetti',
    'Eier',
    'Blumen',
    'Kaffeebohnen',
  ]
  for (let i = 0; i < shoppingItems.length; i++) {
    await createChecklistItem({
      id: uuidv4(),
      spaceId,
      checklistId: shopping.checklistId,
      title: shoppingItems[i],
      sortOrder: 100 + i,
    })
  }

  // Monatsbudget (über Repository → Sync-Outbox)
  const budgets = await listBudgets(spaceId)
  const hasMonthly = budgets.some((b) => b.name.toLowerCase() === 'monatsbudget')
  if (!hasMonthly) {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    await createBudget(
      {
        id: uuidv4(),
        space_id: spaceId,
        name: 'Monatsbudget',
        description: 'Gemeinsames Monatsbudget (Musterdaten)',
        currency: 'CHF',
        amount_limit: '3500.00',
        period_start: fmt(start),
        period_end: fmt(end),
      },
      userId,
    )
  }

  return created
}
