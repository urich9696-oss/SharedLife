# SharedLife V8 – Produktbereinigung & UI-Vereinheitlichung

Stand: 2026-08-15  
Branch: `cursor/sharedlife-v8-ab0c`

## Ziel

V8 vereinheitlicht das UI-System und schärft die Informationsarchitektur:

- **Home** = jetzt / als Nächstes
- **Planen** = verbindlich & ausführbar (Wochenkalender Standard)
- **Plus** = erstellen (unverändert funktional)
- **Momente** = nur bewusst Erlebtes
- **Mehr** = Ablage (Wünsche, Ideen, Alltag, Einstellungen)

## Version

- `SharedLife V8 · 8.0.0`

## Wichtige Entscheidungen

1. **Hero** wählt nur geplante `trip`/`date` mit gültigem Start und Status ≠ cancelled/archived/draft. Keine Ideen, Events, Ziele.
2. **Momente / Unser gemeinsamer Weg** nutzen `deriveMomentChronicle` bzw. `selectRecentMoments` — nur `entity_type === 'moment'` (+ bewusste Timeline-Einträge). Keine Query-Migration, keine Medienlöschung.
3. **Reiseideen** = Trips ohne `starts_at`/`all_day_start` unter Mehr.
4. **Wochenkalender** ist Standard in Planen; Monat bleibt umschaltbar.
5. **Wunschlinks** öffnen aus der Listenzeile mit eigener Touch-Fläche; URL-Normalisierung in `wish-url.ts`.

## Migrationen

Keine SQL-/Schema-Migrationen. Korrektur ausschließlich über Query-/UI-Filter.

## Hero-Fix (Follow-up)

**Ursache:** `trip.status = draft` ist im Produkt „Geplant“ (`ENTITY_TYPE_META.trip.statusLabels`), nicht „Idee“. Der erste Hero-Selector schloss `draft` aus und zeigte deshalb Empty State trotz geplanter Reise mit Datum.

**Korrektur:** `getNextPlannedDateOrTrip` — `draft`/`active` mit `starts_at` oder `all_day_start` sind hero-fähig; Ideen ohne Datum ausgeschlossen; date-only über `parseAllDayDate`; Empty State nur wenn `entitiesLoaded`.

## Momente-Navigation (Follow-up)

Tabs: **Momente | Fotos | Alben** (einzeilig). Erleben/Unser Weg in „Momente“ zusammengeführt. Favoriten als Filter in Fotos. Header-„Neu“ entfernt (Plus-Button).

## Manuelle Prüfung

1. Einstellungen: SharedLife V8 · 8.0.0
2. Home: geplante Reise (`draft` + Datum) erscheint im Hero
3. Momente: drei Tabs, kein Zeilenumbruch auf 390 px
4. Planen startet in aktueller Woche
5. Wunsch mit Link → ein Tippen öffnet Shop
