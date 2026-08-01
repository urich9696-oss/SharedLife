# SharedLife V3 – Product Cleanup

Stand: 2026-08-01  
Branch: `cursor/sharedlife-v3-product-cleanup-2035`  
Basis: `cursor/sharedlife-mobile-product-6425` (Draft-PR #3)

## 1. Analysierter Ausgangszustand

- Stack und Offline-First-Architektur aus V1/Mobile-Produkt waren vorhanden und baseline-grün:
  - Typecheck, Lint, Unit-Tests (51), Build erfolgreich
- UI zeigte zu viele gleichwertige Module (Planen mit 15 Segmenten, Mehr mit 4 Lebenswelten + System)
- Home war ein umfangreicheres Dashboard mit fester Reise-Hero-Logik
- Entity-Typen und Dexie/Supabase-Datenmodell blieben die technische Grundlage

## 2. Umgesetzte Änderungen

- Kanonische Inhaltszuordnung (`src/features/content/content-map.ts`)
- Planen auf genau drei Tabs: Kalender, Vorhaben, Aufgaben
- Dynamischer, deterministischer Home-Hero
- Home-Reihenfolge: Hero → Heute → Schnellzugriffe → Als Nächstes → letzter Moment
- Plus-Sheet kontextabhängig + „Mehr erstellen“ ohne technische Begriffe
- Mehr-Bereich: Paarprofil-Karte + Alltag / Inspiration / Finanzen / Einstellungen
- Momente mit Timeline / Fotos / Alben / Favoriten
- Detailseiten: „Abschnitt“ statt „Widget“ in der UI
- Einkauf: optionale Menge/Einheit per Progressive Disclosure
- Legacy-Routen: `/calendar`, `/module/reisen`, `/module/ziele`, `/module/beziehung`, `/momente`
- Additive Migration `20260801000013_space_invites_grants.sql`

## 3. Entfernte sichtbare Doppelungen

- Reisen/Ziele/Projekte/Dates nicht mehr als parallele Hauptmodule unter Planen
- Budgets/Erinnerungen/Einkauf/Finanzen nicht mehr als Planen-Segmente
- Home zeigt Hero-Inhalt nicht erneut unter „Als Nächstes“
- Dates/Reisen nicht unter Inspiration dupliziert

## 4. Neue Informationsarchitektur

Bottom-Nav: Home · Planen · Plus · Momente · Mehr

- Planen: Kalender / Vorhaben / Aufgaben
- Momente: Timeline / Fotos / Alben / Favoriten
- Mehr: Paarprofil + Alltag / Inspiration / Finanzen / Einstellungen
- Einkauf bleibt festes Modul

## 5. Legacy-Strukturen (intern erhalten)

- Alle Entity-Typen in Dexie/Supabase bleiben
- Widget-Instanzen und Registry bleiben technisch
- Detail-Tabellen `*_details`, Outbox, Upload-Queue bleiben
- `space_invites` vorbereitet, ohne Versand/Einladung

## 6. Datenbankmigrationen

| Migration | Zweck | Status |
|-----------|-------|--------|
| …00011 pair profile + entity types | vorhanden | lokal im Repo |
| …00012 shopping fields | vorhanden | lokal im Repo |
| …00013 space_invites grants | neu, additiv | lokal vorbereitet |

Remote-Anwendung: **offen**, falls keine Remote-Zugangsdaten vorliegen.

## 7. RLS- und Storage-Status

- Mitgliedschaft über `is_space_member(space_id)`
- Kein öffentlicher Signup (`enable_signup = false`, `shouldCreateUser: false`)
- Storage-Bucket `media` privat, pfadbasiert auf Space
- `space_invites`: RLS + Grants ergänzt; kein Invite-Flow aktiv
- Remote-Policy-Validierung: **offen ohne Remote-Zugriff**

## 8. Offline-/Realtime-Status

- Dexie + Outbox + Upload-Queue unverändert als Grundlage
- Realtime für entities/checklists/checklist_items/budgets
- Einkauf bleibt offline-fähig mit späterer Sync
- Echter Zwei-Geräte-Test: nur manuell prüfbar

## 9. Tests

Siehe Abschlussbericht und CI-Lauf im PR.

## 10. Externe Blocker

- Remote-Supabase-Migration/Push/Realtime nicht vorgetäuscht
- iPhone-Standalone- und Zwei-Geräte-QA nur manuell

## 11. Manuelle QA

Siehe `docs/qa-checklist-v3.md`.
