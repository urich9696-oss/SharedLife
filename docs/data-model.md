# SharedLife – Datenmodell

SharedLife speichert jede Information **einmal** als kanonischen Datensatz. Views und Widgets referenzieren Inhalte; sie duplizieren sie nicht.

## Architekturprinzip

```
Entities → Fachdaten (*_details) → Verknüpfungen → Widgets → Views
```

## Identität und Spaces

| Tabelle | Zweck |
|---------|--------|
| `spaces` | Gemeinsamer Lebensraum (V1: ein Space für zwei Personen) |
| `profiles` | Öffentliches Profil pro `auth.users` |
| `space_members` | Mitgliedschaft; **nicht client-schreibbar** |
| `devices` | Client-Geräte für Sync/Push (client-generierte UUID) |

Jede geteilte Tabelle trägt `space_id`. Mitgliedschaft wird über `is_space_member(space_id)` geprüft.

### Feste Seed-UUIDs (lokal)

| Ressource | UUID |
|-----------|------|
| Space „SharedLife“ | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa` |
| Dennis | `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb` |
| Lea | `cccccccc-cccc-4ccc-8ccc-cccccccccccc` |

## Entities (Kern)

`entities` ist die polymorphe Wurzeltabelle:

- **Typen:** `trip`, `date`, `goal`, `event`, `task`, `list`, `wish`, `moment`, `project`, `note`, `milestone`
- **Version:** `version` (Integer, default 1) für Optimistic Concurrency
- **Soft Delete:** `deleted_at` / `deleted_by` – kein Hard Delete für Clients
- **Zeit:** `starts_at`/`ends_at` (timestamptz) oder `all_day_start`/`all_day_end` (date)
- **Flexibel:** `metadata` (jsonb)

Indizes decken Space-Filter, Typ, Aktualisierung, Papierkorb und Metadaten ab.

## Fachdaten (*_details)

Schmale 1:1-Erweiterungstabellen mit `entity_id` als PK/FK:

| Tabelle | Entity-Typ | Besonderheiten |
|---------|------------|----------------|
| `trip_details` | trip | Ziel, Transport, Budget (`numeric(14,2)`) |
| `date_details` | date | Anlass, Location, geschätzte Kosten |
| `goal_details` | goal | Fortschritt %, Zieldatum |
| `event_details` | event | Wiederholung, Kalenderfarbe |
| `task_details` | task | Fälligkeit, Priorität, Assignee |
| `list_details` | list | Listenart, checkable |
| `wish_details` | wish | URL, Preis, Priorität |
| `moment_details` | moment | Aufnahmezeit, Highlight |
| `project_details` | project | Zeitraum, Fortschritt |
| `milestone_details` | milestone | Projekt-Referenz, Gewicht |

`note`-Inhalte liegen in der separaten Tabelle `notes` (Markdown), nicht in `*_details`.

Trigger setzen `space_id` konsistent zur Parent-Entity und validieren den `entity_type`.

## Verknüpfungen und Inhalte

| Tabelle | Zweck |
|---------|--------|
| `entity_links` | Gerichtete Beziehungen zwischen Entities |
| `notes` | Markdown-Inhalt (1:1 mit note-Entity) |
| `checklists` / `checklist_items` | Abhaklisten an Entities |
| `budgets` / `transactions` | Finanzen; Beträge immer `numeric(14,2)` |
| `locations` / `entity_locations` | Orte mit Rollen (venue, start, …) |
| `media_assets` / `entity_media` | Medien-Metadaten; Storage-Pfad `{space_id}/{media_id}/{variant}/{file}` |
| `timeline_entries` / `timeline_entry_media` | Gemeinsame Geschichte / Rückblicke |

## Sync und Audit

| Tabelle | Zweck | Client-Schreiben |
|---------|--------|------------------|
| `activity_log` | Append-only Audit | Nur via SECURITY DEFINER / Service Role |
| `mutation_receipts` | Idempotenz (`mutation_id` unique) | Nur via SECURITY DEFINER / Service Role |
| `conflict_versions` | Versionskonflikte | Nur Service Role |

### RPC-Funktionen

- `apply_entity_mutation(...)` – Upsert mit Versionsprüfung, Receipt, Activity Log
- `soft_delete_entity(...)` – Papierkorb
- `restore_entity(...)` – Wiederherstellen
- `log_activity(...)`, `record_mutation_receipt(...)` – intern

Version wird **nur bei echten Feldänderungen** erhöht (`entity_payload_changed`).

## Widgets und Erinnerungen

| Tabelle | Zweck |
|---------|--------|
| `view_layouts` | Layout pro View-Key (`home`, `plan`, …) |
| `widget_instances` | Konkrete Widget-Platzierung (Grid, Config) |
| `reminders` | Erinnerungen mit `remind_at` (timestamptz) |
| `push_subscriptions` | Web-Push pro User/Gerät |
| `reminder_deliveries` | Versandprotokoll (Cron/Edge only) |

## Konventionen

- **UUIDs** überall als Primärschlüssel
- **Geld:** `numeric(14,2)`, nie Float
- **Instants:** `timestamptz`; ganztägig: `date`
- **Kein dynamisches SQL** vom Client – Mutationen über typisierte RPCs oder direkte RLS-geschützte Writes
- **updated_at:** Trigger `set_updated_at()` auf allen relevanten Tabellen

## Migrationen

Reihenfolge unter `supabase/migrations/`:

1. Extensions & Helfer (`is_space_member`, `set_updated_at`)
2. Core (spaces, profiles, members, devices)
3. entities
4. *_details
5. Verknüpfungen, Medien, Timeline, Sync-Metadaten
6. Widgets & Reminders
7. RLS
8. Storage (`media` Bucket)
9. Sync-RPCs

Lokal: `npm run db:reset` wendet Migrationen + `seed.sql` an.
