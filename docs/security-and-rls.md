# SharedLife – Sicherheit und RLS

## Grundsatz

Jede private Tabelle hat **Row Level Security (RLS)** aktiviert. Zugriff basiert auf Space-Mitgliedschaft via `is_space_member(space_id)` – eine `SECURITY DEFINER`-Funktion mit festem `search_path = public`.

Clients nutzen ausschließlich den **anon/authenticated** Key. Die **Service Role** bleibt auf Edge Functions, Cron und Admin reserviert.

## Auth

- **E-Mail OTP** (6-stellig, 3600 s Gültigkeit) — Standard-Login in der PWA
- Optional Passwort-Login
- **Kein öffentlicher Signup** (`enable_signup = false`)
- OTP-Login mit `shouldCreateUser: false` im Client (kein Auto-Signup)
- Partner-Zugang: Edge Function `invite-partner` (Service Role) legt Auth-User + Membership an

## Mitgliedschaft

| Operation | `space_members` |
|-----------|-----------------|
| SELECT | Mitglieder des Space |
| INSERT / UPDATE / DELETE | **Verweigert** für `authenticated` |

Mitgliedschaften werden nur über Service Role gesetzt: Seed, Admin oder **`invite-partner`** (nur Space-Owner).

## Profile

| Operation | Regel |
|-----------|--------|
| SELECT | Eigenes Profil **oder** Profil eines Co-Mitglieds im selben Space |
| INSERT | Nur `id = auth.uid()` |
| UPDATE | Nur eigenes Profil |
| DELETE | Gesperrt (REVOKE) |

## Standard-Space-Tabellen

Für Entities, Details, Links, Finanzen, Medien, Timeline, Widgets, Reminders:

| Operation | Regel |
|-----------|--------|
| SELECT / INSERT / UPDATE | `is_space_member(space_id)` |
| DELETE | **REVOKE** auf `authenticated` – nur Soft Delete via `deleted_at` |

`spaces`: SELECT und UPDATE für Mitglieder (kein INSERT durch Clients in V1).

## Geräte und Push

- **`devices`:** Nutzer sehen Space-Geräte; INSERT/UPDATE nur für `user_id = auth.uid()`
- **`push_subscriptions`:** Nur eigene Subscriptions (`user_id = auth.uid()`)

## Systemtabellen (eingeschränktes Schreiben)

Diese Tabellen sind für Clients **read-mostly**; direktes INSERT/UPDATE nur mit Service Role:

| Tabelle | SELECT | INSERT | UPDATE |
|---------|--------|--------|--------|
| `activity_log` | Mitglied | Service Role | – |
| `mutation_receipts` | Mitglied | Service Role | – |
| `conflict_versions` | Mitglied | Service Role | Service Role |
| `reminder_deliveries` | Mitglied | Service Role | Service Role |

`SECURITY DEFINER`-Funktionen (`log_activity`, `record_mutation_receipt`, `apply_entity_mutation`, …) schreiben im Namen des authentifizierten Users und prüfen vorher `is_space_member`.

## Storage

- Bucket **`media`**: privat (`public = false`)
- Pfadkonvention: `{space_id}/{media_id}/{variant}/{filename}`
- Policy: erstes Pfadsegment = `space_id` → `is_space_member(space_id)`
- SELECT / INSERT / UPDATE für Mitglieder
- DELETE für `authenticated` explizit verweigert (`using (false)`)

## Sync-Sicherheit

1. Client erzeugt `mutation_id` (UUID) und `expected_version`
2. Edge Function oder RPC `apply_entity_mutation` prüft Mitgliedschaft
3. Bei Versionskonflikt: Eintrag in `conflict_versions`, Exception `40001`
4. Erfolg: `mutation_receipts` (idempotent bei gleicher `mutation_id`)
5. Audit: `activity_log`

Kein generisches dynamisches SQL vom Client – `apply_row_mutation` erlaubt nur eine Whitelist von Tabellennamen.

## Hard Delete

`REVOKE DELETE` auf allen privaten Tabellen für `authenticated` und `anon`. Endgültige Bereinigung nur mit Service Role (z. B. GDPR-Export/Löschung).

## Tests

`supabase/tests/rls_tests.sql` (pgTAP) prüft:

- **Dennis / Lea:** Space, Entities, Co-Profile lesbar; Mitgliedschaften sichtbar
- **Fremder:** kein Zugriff auf Space-Daten
- Kein INSERT in `space_members` durch Members
- Kein Hard DELETE auf `entities`
- Kein direktes INSERT in `activity_log`; `log_activity` funktioniert

Ausführen: `npm run test:db`

## Checkliste für neue Tabellen

1. `space_id uuid not null` (wenn geteilt)
2. RLS aktivieren
3. Policies: `is_space_member(space_id)` für SELECT/INSERT/UPDATE
4. `REVOKE DELETE` von `authenticated`
5. `set_updated_at` Trigger falls `updated_at` vorhanden
6. Keine Service-Role-Keys im Frontend
