/**
 * Füllt den SharedLife-Space mit realistischen Musterdaten
 * und übt dabei Sync-/CRUD-Pfade aus.
 *
 * Usage: node --env-file=.env.remote.local scripts/seed-sample-data.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const url = process.env.VITE_SUPABASE_URL
const anon = process.env.VITE_SUPABASE_ANON_KEY
const email = process.env.DENNIS_EMAIL
const password = process.env.DENNIS_PASSWORD || 'SharedLife-2026!'
const SPACE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

if (!url || !anon || !email) {
  console.error('Fehlende Env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, DENNIS_EMAIL')
  process.exit(1)
}

const client = createClient(url, anon)
const ids = {
  tripGreece: randomUUID(),
  tripWeekend: randomUUID(),
  tripBerlin: randomUUID(),
  dateDinner: randomUUID(),
  dateHike: randomUUID(),
  dateBoat: randomUUID(),
  goalApartment: randomUUID(),
  goalFitness: randomUUID(),
  goalSavings: randomUUID(),
  eventBrunch: randomUUID(),
  eventDentist: randomUUID(),
  eventAnniversary: randomUUID(),
  eventParents: randomUUID(),
  taskPacking: randomUUID(),
  taskInsurance: randomUUID(),
  taskGroceries: randomUUID(),
  taskFlowers: randomUUID(),
  taskLease: randomUUID(),
  listPacking: randomUUID(),
  listShopping: randomUUID(),
  wishCamera: randomUUID(),
  wishConcert: randomUUID(),
  wishCook: randomUUID(),
  momentLake: randomUUID(),
  momentFirstHome: randomUUID(),
  momentRain: randomUUID(),
  momentBreakfast: randomUUID(),
  momentConcert: randomUUID(),
  leisurePicnic: randomUUID(),
  leisureDinner: randomUUID(),
  leisureHike: randomUUID(),
  leisureFlea: randomUUID(),
  leisureCinema: randomUUID(),
  leisureSpa: randomUUID(),
  leisureCook: randomUUID(),
  leisureMuseum: randomUUID(),
  recipePasta: randomUUID(),
  recipeShakshuka: randomUUID(),
  recipeVeggies: randomUUID(),
  expenseRent: randomUUID(),
  expenseGroceries: randomUUID(),
  expenseTransit: randomUUID(),
  expenseBrunch: randomUUID(),
  expenseNetflix: randomUUID(),
  incomeDennis: randomUUID(),
  incomeLea: randomUUID(),
  incomeTax: randomUUID(),
  projectRenovation: randomUUID(),
  milestoneKitchen: randomUUID(),
  milestoneBath: randomUUID(),
  noteShared: randomUUID(),
  checklistPacking: randomUUID(),
  checklistShopping: randomUUID(),
  checklistRecipePasta: randomUUID(),
  budgetTrip: randomUUID(),
  budgetHome: randomUUID(),
  budgetMonth: randomUUID(),
  locAthens: randomUUID(),
  locZurich: randomUUID(),
  locLake: randomUUID(),
  remTrip: randomUUID(),
  remDate: randomUUID(),
  remTask: randomUUID(),
  widgetUpcoming: randomUUID(),
  widgetGoals: randomUUID(),
  widgetTasks: randomUUID(),
  widgetBudget: randomUUID(),
  widgetReminders: randomUUID(),
  linkTripList: randomUUID(),
  linkProjectMilestone: randomUUID(),
  deviceId: randomUUID(),
}

function isoDaysFromNow(days, hour = 10) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  d.setUTCHours(hour, 0, 0, 0)
  return d.toISOString()
}

function dateDaysFromNow(days) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

async function sync(token, mutation) {
  const res = await fetch(`${url}/functions/v1/sync-mutations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ mutation }),
  })
  const body = await res.json()
  if (!res.ok || body.error) {
    throw new Error(`${mutation.resourceType}/${mutation.operation}: ${body.error || res.status}`)
  }
  return body
}

async function createEntity(token, deviceId, entity) {
  return sync(token, {
    mutationId: randomUUID(),
    deviceId,
    spaceId: SPACE_ID,
    resourceType: 'entity',
    resourceId: entity.id,
    operation: 'create',
    expectedVersion: 1,
    payload: { ...entity, is_create: true },
    createdAt: new Date().toISOString(),
  })
}

async function createDetail(token, deviceId, entityId, detailType, payload) {
  return sync(token, {
    mutationId: randomUUID(),
    deviceId,
    spaceId: SPACE_ID,
    resourceType: 'entity_detail',
    resourceId: entityId,
    operation: 'create',
    expectedVersion: null,
    payload: { detail_type: detailType, payload },
    createdAt: new Date().toISOString(),
  })
}

async function createRow(token, deviceId, resourceType, resourceId, payload) {
  return sync(token, {
    mutationId: randomUUID(),
    deviceId,
    spaceId: SPACE_ID,
    resourceType,
    resourceId,
    operation: 'create',
    expectedVersion: null,
    payload,
    createdAt: new Date().toISOString(),
  })
}

async function main() {
  console.log('→ Login…')
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({ email, password })
  if (authErr) throw authErr
  const userId = auth.user.id
  const token = auth.session.access_token
  const deviceId = ids.deviceId

  console.log('→ Alte Smoke-/Testdaten soft-deleten…')
  const { data: existing } = await client
    .from('entities')
    .select('id,title')
    .eq('space_id', SPACE_ID)
    .is('deleted_at', null)

  const junk = (existing ?? []).filter((e) =>
    /smoke|logiktest|testaufgabe|wasser trinken|neues auto|griechenland/i.test(e.title),
  )
  if (junk.length) {
    await client
      .from('entities')
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
      .in(
        'id',
        junk.map((j) => j.id),
      )
  }

  // Alte Demo-Budgets/Reminders/Widgets aufräumen (nur Titel-Muster)
  await client
    .from('reminders')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('space_id', SPACE_ID)
    .is('deleted_at', null)
  await client
    .from('budgets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('space_id', SPACE_ID)
    .is('deleted_at', null)
  await client
    .from('widget_instances')
    .update({ deleted_at: new Date().toISOString() })
    .eq('space_id', SPACE_ID)
    .is('deleted_at', null)

  console.log('→ Entities anlegen…')
  const entities = [
    {
      id: ids.tripGreece,
      entity_type: 'trip',
      title: 'Griechenland Sommer',
      subtitle: 'Athen & Inselhopping',
      description: 'Zwei Wochen Sonne, Mezze und Meer — unser grosses Sommerabenteuer.',
      status: 'active',
      all_day_start: dateDaysFromNow(45),
      all_day_end: dateDaysFromNow(59),
    },
    {
      id: ids.tripWeekend,
      entity_type: 'trip',
      title: 'Wochenende im Tessin',
      subtitle: 'Kurzurlaub',
      description: 'Spontan nach Locarno — Wandern und Gelato.',
      status: 'draft',
      all_day_start: dateDaysFromNow(12),
      all_day_end: dateDaysFromNow(14),
    },
    {
      id: ids.dateDinner,
      entity_type: 'date',
      title: 'Dinner Date Kronenhalle',
      description: 'Reservierung um 19:30 — kein Handy am Tisch.',
      status: 'active',
      starts_at: isoDaysFromNow(5, 17),
      ends_at: isoDaysFromNow(5, 20),
    },
    {
      id: ids.dateHike,
      entity_type: 'date',
      title: 'Sonnenaufgang Uetliberg',
      description: 'Thermoskanne, Decken, frühes Aufstehen.',
      status: 'draft',
      starts_at: isoDaysFromNow(9, 3),
      ends_at: isoDaysFromNow(9, 7),
    },
    {
      id: ids.goalApartment,
      entity_type: 'goal',
      title: 'Gemeinsame Wohnung finden',
      description: 'Mind. 3.5 Zimmer, max. 45 Min Pendelweg, Balkon wäre Traum.',
      status: 'active',
    },
    {
      id: ids.goalFitness,
      entity_type: 'goal',
      title: 'Gemeinsam fitter werden',
      description: '2× pro Woche laufen oder Yoga.',
      status: 'active',
    },
    {
      id: ids.eventBrunch,
      entity_type: 'event',
      title: 'Brunch bei Sam & Alex',
      description: 'Salat mitbringen.',
      status: 'active',
      starts_at: isoDaysFromNow(2, 9),
      ends_at: isoDaysFromNow(2, 12),
    },
    {
      id: ids.eventDentist,
      entity_type: 'event',
      title: 'Zahnarzt Dennis',
      status: 'active',
      starts_at: isoDaysFromNow(8, 7),
      ends_at: isoDaysFromNow(8, 8),
    },
    {
      id: ids.eventAnniversary,
      entity_type: 'event',
      title: 'Jahrestag',
      description: 'Überraschung planen!',
      status: 'active',
      all_day_start: dateDaysFromNow(21),
      all_day_end: dateDaysFromNow(21),
    },
    {
      id: ids.taskPacking,
      entity_type: 'task',
      title: 'Kofferliste fertig machen',
      status: 'active',
      starts_at: isoDaysFromNow(1, 16),
    },
    {
      id: ids.taskInsurance,
      entity_type: 'task',
      title: 'Reiseversicherung prüfen',
      status: 'active',
      starts_at: isoDaysFromNow(3, 17),
    },
    {
      id: ids.taskGroceries,
      entity_type: 'task',
      title: 'Einkaufen für Brunch',
      status: 'active',
      starts_at: isoDaysFromNow(1, 15),
    },
    {
      id: ids.listPacking,
      entity_type: 'list',
      title: 'Packliste Griechenland',
      status: 'active',
    },
    {
      id: ids.listShopping,
      entity_type: 'list',
      title: 'Wocheneinkauf',
      status: 'active',
    },
    {
      id: ids.wishCamera,
      entity_type: 'wish',
      title: 'Kompaktkamera für Reisen',
      description: 'Leicht, gute Low-Light-Qualität.',
      status: 'active',
    },
    {
      id: ids.wishConcert,
      entity_type: 'wish',
      title: 'Konzerttickets Openair',
      status: 'active',
    },
    {
      id: ids.wishCook,
      entity_type: 'wish',
      title: 'Kochkurs-Gutschein',
      status: 'active',
    },
    {
      id: ids.momentLake,
      entity_type: 'moment',
      title: 'Sonnenuntergang am Zürichsee',
      description: 'Eis in der Hand, Beine im Wasser — ein perfekter Juliabend.',
      status: 'active',
      all_day_start: dateDaysFromNow(-10),
      all_day_end: dateDaysFromNow(-10),
    },
    {
      id: ids.momentFirstHome,
      entity_type: 'moment',
      title: 'Erster gemeinsamer Schlüssel',
      description: 'Der Moment, als wir die Wohnungstür zum ersten Mal aufgeschlossen haben.',
      status: 'active',
      all_day_start: dateDaysFromNow(-120),
      all_day_end: dateDaysFromNow(-120),
    },
    {
      id: ids.momentRain,
      entity_type: 'moment',
      title: 'Regenwanderung mit Lachen',
      description: 'Komplett nass, trotzdem die besten Fotos.',
      status: 'active',
      all_day_start: dateDaysFromNow(-5),
      all_day_end: dateDaysFromNow(-5),
    },
    {
      id: ids.momentBreakfast,
      entity_type: 'moment',
      title: 'Sonntagsfrühstück im Bett',
      description: 'Croissants, Orangensaft, keine Pläne.',
      status: 'active',
      all_day_start: dateDaysFromNow(-2),
      all_day_end: dateDaysFromNow(-2),
    },
    {
      id: ids.momentConcert,
      entity_type: 'moment',
      title: 'Konzert im Dachstock',
      description: 'Live-Musik, geteilte Kopfhörer auf dem Heimweg.',
      status: 'active',
      all_day_start: dateDaysFromNow(-18),
      all_day_end: dateDaysFromNow(-18),
    },
    {
      id: ids.leisurePicnic,
      entity_type: 'leisure',
      title: 'Picknick am Zürichsee',
      description: 'Decke, Lemonade, Playlist für den Sonnenuntergang.',
      status: 'active',
      all_day_start: dateDaysFromNow(3),
      all_day_end: dateDaysFromNow(3),
      metadata: { place: 'Zürichhorn', ideaCategory: 'date', seed: 'sample-v2' },
    },
    {
      id: ids.leisureDinner,
      entity_type: 'leisure',
      title: 'Kerzenlicht-Dinner zu Hause',
      description: 'Drei Gänge, kein Handy, Lieblingswein.',
      status: 'active',
      all_day_start: dateDaysFromNow(6),
      all_day_end: dateDaysFromNow(6),
      metadata: { place: 'Zuhause', ideaCategory: 'date', seed: 'sample-v2' },
    },
    {
      id: ids.leisureHike,
      entity_type: 'leisure',
      title: 'Nachtwanderung Uetliberg',
      description: 'Stirnlampen, Thermoskanne, Sternenhimmel.',
      status: 'draft',
      all_day_start: dateDaysFromNow(14),
      all_day_end: dateDaysFromNow(14),
      metadata: { place: 'Uetliberg', ideaCategory: 'date', seed: 'sample-v2' },
    },
    {
      id: ids.leisureFlea,
      entity_type: 'leisure',
      title: 'Flohmarkt & Café Brunnen',
      description: 'Schätze suchen, danach Cappuccino teilen.',
      status: 'active',
      all_day_start: dateDaysFromNow(10),
      all_day_end: dateDaysFromNow(10),
      metadata: { place: 'Bürkliplatz', ideaCategory: 'date', seed: 'sample-v2' },
    },
    {
      id: ids.leisureCinema,
      entity_type: 'leisure',
      title: 'Kino + Streetfood',
      description: 'Spontaner Filmabend, danach Food Court.',
      status: 'active',
      all_day_start: dateDaysFromNow(2),
      all_day_end: dateDaysFromNow(2),
      metadata: { place: 'Sihlcity', ideaCategory: 'date', seed: 'sample-v2' },
    },
    {
      id: ids.leisureSpa,
      entity_type: 'leisure',
      title: 'Therme Bad Zurzach',
      description: 'Ganzer Tag entspannen, Sauna-Runde.',
      status: 'active',
      all_day_start: dateDaysFromNow(21),
      all_day_end: dateDaysFromNow(21),
      metadata: { place: 'Bad Zurzach', ideaCategory: 'date', seed: 'sample-v2' },
    },
    {
      id: ids.leisureCook,
      entity_type: 'leisure',
      title: 'Kochkurs für zwei',
      description: 'Pasta frisch machen lernen.',
      status: 'draft',
      all_day_start: dateDaysFromNow(28),
      all_day_end: dateDaysFromNow(28),
      metadata: { place: 'Zürich', ideaCategory: 'date', seed: 'sample-v2' },
    },
    {
      id: ids.leisureMuseum,
      entity_type: 'leisure',
      title: 'Museumsnacht',
      description: 'Kunsthalle + anschliessend Weinbar.',
      status: 'active',
      all_day_start: dateDaysFromNow(35),
      all_day_end: dateDaysFromNow(35),
      metadata: { place: 'Kunsthaus Zürich', ideaCategory: 'date', seed: 'sample-v2' },
    },
    {
      id: ids.tripBerlin,
      entity_type: 'trip',
      title: 'Berlin Kurztrip',
      description: 'Kultur, Streetfood, Flohmärkte.',
      status: 'draft',
      all_day_start: dateDaysFromNow(70),
      all_day_end: dateDaysFromNow(73),
    },
    {
      id: ids.dateBoat,
      entity_type: 'date',
      title: 'Bootsfahrt Vierwaldstättersee',
      description: 'Tickets online, Picnic-Korb mitnehmen.',
      status: 'active',
      starts_at: isoDaysFromNow(18, 11),
      ends_at: isoDaysFromNow(18, 16),
    },
    {
      id: ids.goalSavings,
      entity_type: 'goal',
      title: 'Notfallpolster aufbauen',
      description: '3 Monatsausgaben auf dem Sparkonto.',
      status: 'active',
    },
    {
      id: ids.eventParents,
      entity_type: 'event',
      title: 'Elternabend Lea',
      status: 'active',
      starts_at: isoDaysFromNow(4, 18),
      ends_at: isoDaysFromNow(4, 20),
    },
    {
      id: ids.taskFlowers,
      entity_type: 'task',
      title: 'Blumen fürs Wohnzimmer',
      status: 'active',
      starts_at: isoDaysFromNow(0, 12),
    },
    {
      id: ids.taskLease,
      entity_type: 'task',
      title: 'Mietvertrag vergleichen',
      status: 'draft',
      starts_at: isoDaysFromNow(7, 19),
    },
    {
      id: ids.recipePasta,
      entity_type: 'recipe',
      title: 'Pasta al Limone',
      description: 'Zitronig, cremig, unter 20 Minuten.',
      status: 'active',
    },
    {
      id: ids.recipeShakshuka,
      entity_type: 'recipe',
      title: 'Shakshuka für zwei',
      description: 'Wochenend-Brunch Klassiker.',
      status: 'active',
    },
    {
      id: ids.recipeVeggies,
      entity_type: 'recipe',
      title: 'Ofengemüse mit Halloumi',
      description: 'One-Tray, wenig Abwasch.',
      status: 'active',
    },
    {
      id: ids.expenseRent,
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
        seed: 'sample-v2',
      },
    },
    {
      id: ids.expenseGroceries,
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
        seed: 'sample-v2',
      },
    },
    {
      id: ids.expenseTransit,
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
        seed: 'sample-v2',
      },
    },
    {
      id: ids.expenseBrunch,
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
        seed: 'sample-v2',
      },
    },
    {
      id: ids.expenseNetflix,
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
        seed: 'sample-v2',
      },
    },
    {
      id: ids.incomeDennis,
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
        seed: 'sample-v2',
      },
    },
    {
      id: ids.incomeLea,
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
        seed: 'sample-v2',
      },
    },
    {
      id: ids.incomeTax,
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
        seed: 'sample-v2',
      },
    },
    {
      id: ids.projectRenovation,
      entity_type: 'project',
      title: 'Wohnung auffrischen',
      description: 'Küche streichen, Bad renovieren, neue Lampen.',
      status: 'active',
      all_day_start: dateDaysFromNow(-30),
      all_day_end: dateDaysFromNow(60),
    },
    {
      id: ids.milestoneKitchen,
      entity_type: 'milestone',
      title: 'Küche fertig gestrichen',
      status: 'completed',
      all_day_start: dateDaysFromNow(-5),
      all_day_end: dateDaysFromNow(-5),
    },
    {
      id: ids.milestoneBath,
      entity_type: 'milestone',
      title: 'Bad-Handwerker gebucht',
      status: 'active',
      all_day_start: dateDaysFromNow(14),
      all_day_end: dateDaysFromNow(14),
    },
    {
      id: ids.noteShared,
      entity_type: 'note',
      title: 'Hausregeln light',
      description: 'Wäsche: wer startet, hängt auf. Geschirr: abends leer.',
      status: 'active',
    },
  ]

  for (const entity of entities) {
    const { id, metadata: entityMeta, ...rest } = entity
    await createEntity(token, deviceId, {
      id,
      space_id: SPACE_ID,
      sort_order: 0,
      metadata: { seed: 'sample-v2', ...(entityMeta || {}) },
      ...rest,
    })
    process.stdout.write('.')
  }
  console.log(` ${entities.length} Entities`)

  console.log('→ Details…')
  await createDetail(token, deviceId, ids.tripGreece, 'trip', {
    destination: 'Athen / Kykladen',
  })
  await createDetail(token, deviceId, ids.tripWeekend, 'trip', {
    destination: 'Locarno',
  })
  await createDetail(token, deviceId, ids.tripBerlin, 'trip', {
    destination: 'Berlin',
  })
  await createDetail(token, deviceId, ids.dateDinner, 'date', {
    occasion: 'Date Night',
    venueName: 'Kronenhalle',
    dressCode: 'smart casual',
    mood: 'romantisch',
    surprise: false,
  })
  await createDetail(token, deviceId, ids.dateHike, 'date', {
    occasion: 'Abenteuer',
    venueName: 'Uetliberg',
    mood: 'aktiv',
    surprise: true,
  })
  await createDetail(token, deviceId, ids.dateBoat, 'date', {
    occasion: 'Ausflug',
    venueName: 'Vierwaldstättersee',
    mood: 'entspannt',
    surprise: false,
  })
  await createDetail(token, deviceId, ids.goalApartment, 'goal', {
    progressKind: 'percent',
    current: 35,
    target: 100,
    milestones: 'Besichtigungen laufen',
  })
  await createDetail(token, deviceId, ids.goalFitness, 'goal', {
    progressKind: 'count',
    current: 6,
    target: 24,
    milestones: 'Wochenziel: 2 Einheiten',
  })
  await createDetail(token, deviceId, ids.goalSavings, 'goal', {
    progressKind: 'currency',
    current: 4800,
    target: 12000,
    milestones: 'Sparrate 500/Monat',
  })
  await createDetail(token, deviceId, ids.eventBrunch, 'event', {
    locationName: 'Zürich West',
    recurrenceRule: '',
    calendarColor: '#8FA18A',
  })
  await createDetail(token, deviceId, ids.eventAnniversary, 'event', {
    locationName: 'Geheim',
    recurrenceRule: '',
    calendarColor: '#C98F82',
  })
  await createDetail(token, deviceId, ids.eventParents, 'event', {
    locationName: 'Schule',
    recurrenceRule: '',
  })
  await createDetail(token, deviceId, ids.taskPacking, 'task', {
    priority: 'high',
    assigneeId: userId,
    dueDate: dateDaysFromNow(1),
  })
  await createDetail(token, deviceId, ids.taskInsurance, 'task', {
    priority: 'medium',
    assigneeId: '',
    dueDate: dateDaysFromNow(3),
  })
  await createDetail(token, deviceId, ids.taskGroceries, 'task', {
    priority: 'low',
    dueDate: dateDaysFromNow(1),
  })
  await createDetail(token, deviceId, ids.taskFlowers, 'task', {
    priority: 'low',
    dueDate: dateDaysFromNow(0),
  })
  await createDetail(token, deviceId, ids.taskLease, 'task', {
    priority: 'high',
    dueDate: dateDaysFromNow(7),
  })
  await createDetail(token, deviceId, ids.listPacking, 'list', {
    listKind: 'packing',
    isCheckable: true,
  })
  await createDetail(token, deviceId, ids.listShopping, 'list', {
    listKind: 'shopping',
    isCheckable: true,
  })
  await createDetail(token, deviceId, ids.wishCamera, 'wish', {
    url: 'https://example.com/kamera',
    price: '649',
    currency: 'CHF',
    priority: 'high',
    fulfilled: false,
  })
  await createDetail(token, deviceId, ids.wishConcert, 'wish', {
    url: 'https://example.com/openair',
    price: '180',
    currency: 'CHF',
    priority: 'dream',
    fulfilled: false,
  })
  await createDetail(token, deviceId, ids.wishCook, 'wish', {
    url: '',
    price: '220',
    currency: 'CHF',
    priority: 'medium',
    fulfilled: false,
  })
  await createDetail(token, deviceId, ids.momentLake, 'moment', {
    capturedAt: isoDaysFromNow(-10, 18),
    mood: 'glücklich',
    weather: 'klar',
    highlight: true,
  })
  await createDetail(token, deviceId, ids.momentFirstHome, 'moment', {
    capturedAt: isoDaysFromNow(-120, 14),
    mood: 'aufgeregt',
    weather: '',
    highlight: true,
  })
  await createDetail(token, deviceId, ids.momentRain, 'moment', {
    capturedAt: isoDaysFromNow(-5, 15),
    mood: 'verspielt',
    weather: 'Regen',
    highlight: false,
  })
  await createDetail(token, deviceId, ids.momentBreakfast, 'moment', {
    capturedAt: isoDaysFromNow(-2, 10),
    mood: 'entspannt',
    weather: 'sonnig',
    highlight: true,
  })
  await createDetail(token, deviceId, ids.momentConcert, 'moment', {
    capturedAt: isoDaysFromNow(-18, 21),
    mood: 'begeistert',
    weather: '',
    highlight: false,
  })
  await createDetail(token, deviceId, ids.projectRenovation, 'project', {
    category: 'Zuhause',
    startDate: dateDaysFromNow(-30),
    targetEndDate: dateDaysFromNow(60),
    progressPercent: 40,
  })
  await createDetail(token, deviceId, ids.milestoneKitchen, 'milestone', {
    projectEntityId: ids.projectRenovation,
    targetDate: dateDaysFromNow(-5),
    achievedAt: isoDaysFromNow(-5, 16),
    weight: 2,
  })
  await createDetail(token, deviceId, ids.milestoneBath, 'milestone', {
    projectEntityId: ids.projectRenovation,
    targetDate: dateDaysFromNow(14),
    achievedAt: '',
    weight: 3,
  })
  console.log('  Details ok')

  console.log('→ Checklisten…')
  await createRow(token, deviceId, 'checklist', ids.checklistPacking, {
    entity_id: ids.listPacking,
    title: 'Packen',
  })
  await createRow(token, deviceId, 'checklist', ids.checklistShopping, {
    entity_id: ids.listShopping,
    title: 'Einkaufen',
  })
  const packingItems = ['Reisepass', 'Adapter', 'Sonnencreme', 'Badehose/Bikini', 'Powerbank', 'Reiseapotheke']
  for (const [i, title] of packingItems.entries()) {
    await createRow(token, deviceId, 'checklist_item', randomUUID(), {
      checklist_id: ids.checklistPacking,
      title,
      is_checked: i < 2,
      checked_at: i < 2 ? new Date().toISOString() : null,
      sort_order: i,
    })
  }
  const shoppingItems = ['Brot', 'Avocados', 'Eier', 'Beeren', 'Orangensaft', 'Blumen']
  for (const [i, title] of shoppingItems.entries()) {
    await createRow(token, deviceId, 'checklist_item', randomUUID(), {
      checklist_id: ids.checklistShopping,
      title,
      is_checked: false,
      sort_order: i,
    })
  }
  console.log('  Checklisten ok')

  console.log('→ Budgets & Transaktionen…')
  await createRow(token, deviceId, 'budget', ids.budgetTrip, {
    entity_id: ids.tripGreece,
    name: 'Griechenland-Budget',
    description: 'Flüge, Hotel, Essen, Aktivitäten',
    currency: 'CHF',
    amount_limit: '4500.00',
    amount_spent: '1280.00',
    period_start: dateDaysFromNow(40),
    period_end: dateDaysFromNow(60),
  })
  const monthStart = (() => {
    const d = new Date()
    d.setUTCDate(1)
    return d.toISOString().slice(0, 10)
  })()
  const monthEnd = (() => {
    const d = new Date()
    d.setUTCMonth(d.getUTCMonth() + 1, 0)
    return d.toISOString().slice(0, 10)
  })()
  await createRow(token, deviceId, 'budget', ids.budgetMonth, {
    entity_id: null,
    name: 'Monatsbudget',
    description: 'Gemeinsames Monatsbudget',
    currency: 'CHF',
    amount_limit: '3500.00',
    amount_spent: '0.00',
    period_start: monthStart,
    period_end: monthEnd,
  })
  await createRow(token, deviceId, 'budget', ids.budgetHome, {
    entity_id: ids.projectRenovation,
    name: 'Renovierung',
    description: 'Farbe, Bad, Lampen',
    currency: 'CHF',
    amount_limit: '3000.00',
    amount_spent: '860.00',
    period_start: dateDaysFromNow(-30),
    period_end: dateDaysFromNow(60),
  })
  const txs = [
    { budget_id: ids.budgetTrip, amount: '780.00', description: 'Flüge Zürich–Athen', category: 'Transport', days: -2 },
    { budget_id: ids.budgetTrip, amount: '500.00', description: 'Hotel-Anzahlung', category: 'Unterkunft', days: -1 },
    { budget_id: ids.budgetHome, amount: '120.00', description: 'Wandfarbe Küche', category: 'Material', days: -7 },
    { budget_id: ids.budgetHome, amount: '740.00', description: 'Bad-Armaturen', category: 'Material', days: -3 },
    {
      budget_id: ids.budgetHome,
      amount: '200.00',
      description: 'Geburtstagskasse Einzahlung',
      category: 'Einnahme',
      days: -5,
      is_income: true,
    },
  ]
  for (const tx of txs) {
    await createRow(token, deviceId, 'transaction', randomUUID(), {
      budget_id: tx.budget_id,
      amount: tx.amount,
      currency: 'CHF',
      description: tx.description,
      category: tx.category,
      transaction_date: dateDaysFromNow(tx.days),
      is_income: Boolean(tx.is_income),
      paid_by: userId,
    })
  }
  console.log('  Finanzen ok')

  console.log('→ Orte…')
  await createRow(token, deviceId, 'location', ids.locAthens, {
    name: 'Athen Zentrum',
    city: 'Athen',
    address_line: 'Plaka',
  })
  await createRow(token, deviceId, 'location', ids.locZurich, {
    name: 'Kronenhalle',
    city: 'Zürich',
    address_line: 'Rämistrasse 4',
  })
  await createRow(token, deviceId, 'location', ids.locLake, {
    name: 'Zürichhorn',
    city: 'Zürich',
    address_line: 'Bellerivestrasse',
  })
  await createRow(token, deviceId, 'entity_location', randomUUID(), {
    entity_id: ids.tripGreece,
    location_id: ids.locAthens,
    role: 'venue',
    sort_order: 0,
  })
  await createRow(token, deviceId, 'entity_location', randomUUID(), {
    entity_id: ids.dateDinner,
    location_id: ids.locZurich,
    role: 'venue',
    sort_order: 0,
  })
  await createRow(token, deviceId, 'entity_location', randomUUID(), {
    entity_id: ids.momentLake,
    location_id: ids.locLake,
    role: 'venue',
    sort_order: 0,
  })
  console.log('  Orte ok')

  console.log('→ Notizen & Links…')
  await createRow(token, deviceId, 'note', randomUUID(), {
    entity_id: ids.noteShared,
    content: '## Hausregeln light\n\n- Wäsche: wer startet, hängt auf\n- Geschirr: abends leer\n- Sonntag: gemeinsamer Wochenplan',
    content_format: 'markdown',
    word_count: 24,
  })
  // note table has unique entity_id - createRow with random id but entity_id = noteShared
  await createRow(token, deviceId, 'entity_link', ids.linkTripList, {
    source_entity_id: ids.tripGreece,
    target_entity_id: ids.listPacking,
    link_type: 'has_part',
    label: 'Packliste',
  })
  await createRow(token, deviceId, 'entity_link', ids.linkProjectMilestone, {
    source_entity_id: ids.projectRenovation,
    target_entity_id: ids.milestoneBath,
    link_type: 'has_part',
    label: 'Nächster Meilenstein',
  })
  console.log('  Notizen/Links ok')

  console.log('→ Erinnerungen…')
  await createRow(token, deviceId, 'reminder', ids.remTrip, {
    entity_id: ids.tripGreece,
    title: 'Koffer packen starten',
    body: 'Noch 2 Wochen bis Griechenland — Packliste checken.',
    remind_at: isoDaysFromNow(30, 16),
    next_trigger_at: isoDaysFromNow(30, 16),
    timezone: 'Europe/Zurich',
    is_active: true,
    notify_push: true,
    notify_in_app: true,
  })
  await createRow(token, deviceId, 'reminder', ids.remDate, {
    entity_id: ids.dateDinner,
    title: 'Tischreservierung bestätigen',
    body: 'Kronenhalle — einen Tag vorher anrufen.',
    remind_at: isoDaysFromNow(4, 15),
    next_trigger_at: isoDaysFromNow(4, 15),
    timezone: 'Europe/Zurich',
    is_active: true,
    notify_push: true,
    notify_in_app: true,
  })
  await createRow(token, deviceId, 'reminder', ids.remTask, {
    entity_id: ids.taskInsurance,
    title: 'Versicherung heute erledigen',
    body: 'Reiseversicherung online prüfen.',
    remind_at: isoDaysFromNow(0, 17),
    next_trigger_at: isoDaysFromNow(0, 17),
    timezone: 'Europe/Zurich',
    is_active: true,
    notify_push: true,
    notify_in_app: true,
  })
  console.log('  Erinnerungen ok')

  console.log('→ Widgets…')
  const widgets = [
    {
      id: ids.widgetUpcoming,
      widget_type: 'upcoming_events',
      title: 'Demnächst',
      config: { daysAhead: 21, entityTypes: ['event', 'date', 'trip'] },
      grid_x: 0,
      grid_y: 0,
      grid_w: 2,
      grid_h: 1,
      sort_order: 0,
    },
    {
      id: ids.widgetGoals,
      widget_type: 'goal_progress',
      title: 'Wohnungsziel',
      entity_id: ids.goalApartment,
      config: { entityId: ids.goalApartment, showMotivation: true },
      grid_x: 0,
      grid_y: 1,
      grid_w: 1,
      grid_h: 1,
      sort_order: 1,
    },
    {
      id: ids.widgetTasks,
      widget_type: 'tasks',
      title: 'Aufgaben',
      config: { limit: 5 },
      grid_x: 1,
      grid_y: 1,
      grid_w: 1,
      grid_h: 1,
      sort_order: 2,
    },
    {
      id: ids.widgetBudget,
      widget_type: 'budget_progress',
      title: 'Reisebudget',
      config: { budgetId: ids.budgetTrip, showRemaining: true },
      grid_x: 0,
      grid_y: 2,
      grid_w: 1,
      grid_h: 1,
      sort_order: 3,
    },
    {
      id: ids.widgetReminders,
      widget_type: 'reminders',
      title: 'Erinnerungen',
      config: { limit: 5 },
      grid_x: 1,
      grid_y: 2,
      grid_w: 1,
      grid_h: 1,
      sort_order: 4,
    },
  ]
  for (const w of widgets) {
    await createRow(token, deviceId, 'widget_instance', w.id, {
      widget_type: w.widget_type,
      title: w.title,
      entity_id: w.entity_id ?? null,
      config: w.config,
      grid_x: w.grid_x,
      grid_y: w.grid_y,
      grid_w: w.grid_w,
      grid_h: w.grid_h,
      is_visible: true,
      sort_order: w.sort_order,
    })
  }
  console.log('  Widgets ok')

  // Soft-delete update + restore smoke on one draft trip? Skip — keep data clean.

  console.log('→ Bestandsaufnahme…')
  const summary = {}
  const tables = [
    ['entities', true],
    ['reminders', true],
    ['budgets', true],
    ['transactions', true],
    ['checklists', true],
    ['checklist_items', true],
    ['locations', true],
    ['entity_locations', false],
    ['notes', true],
    ['entity_links', true],
    ['widget_instances', true],
  ]
  for (const [table, filterDeleted] of tables) {
    let q = client.from(table).select('*', { count: 'exact', head: true }).eq('space_id', SPACE_ID)
    if (filterDeleted) q = q.is('deleted_at', null)
    const { count, error } = await q
    if (error) {
      const res = await client.from(table).select('*', { count: 'exact', head: true }).eq('space_id', SPACE_ID)
      summary[table] = res.count
    } else {
      summary[table] = count
    }
  }

  const { data: liveEntities } = await client
    .from('entities')
    .select('entity_type,title')
    .eq('space_id', SPACE_ID)
    .is('deleted_at', null)
    .order('entity_type')

  console.log('\n✅ Musterdaten fertig\n')
  console.log(summary)
  console.log('\nEntities:')
  for (const e of liveEntities ?? []) {
    console.log(`  · ${e.entity_type}: ${e.title}`)
  }
}

main().catch((err) => {
  console.error('\n❌ Seed fehlgeschlagen:', err.message || err)
  process.exit(1)
})
