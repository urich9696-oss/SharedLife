# SharedLife – Offline-First Sync

Dieses Dokument beschreibt die lokale Sync-Schicht: IndexedDB-Spiegel, Outbox, Sync-Engine, Realtime und Konfliktbehandlung.

## Architektur

```
UI → Repository (optimistic) → Dexie + Outbox
                ↓
         Sync-Engine (flush)
                ↓
    Edge Function sync-mutations
                ↓
         Postgres + mutation_receipts
                ↑
         Realtime (postgres_changes)
```

## IndexedDB (`SharedLifeDB`)

| Store | Zweck |
|-------|--------|
| `entities`, `entityDetails`, `notes`, … | Lokale Spiegel der Postgres-Tabellen |
| `outbox` | Ausstehende Mutationen mit Status & Backoff |
| `uploadQueue` / `localMediaBlobs` | Medien-Upload-Warteschlange |
| `conflictCopies` | Lokale Konflikt-Kopien zur Auflösung |
| `syncMeta` | `lastSyncAt`, `deviceId` |
| `device` | Geräte-Metadaten |

Geräte-UUID wird clientseitig erzeugt (`getOrCreateDeviceId`) und bei Logout beibehalten.

## Schreibpfad

1. Zod-Validierung des Payloads
2. Optimistic Update in Dexie
3. Outbox-Eintrag atomar in derselben Transaktion
4. UI zeigt „lokal gespeichert“ / pending count
5. Sync-Engine sendet an `/functions/v1/sync-mutations`
6. Bei Erfolg: Receipt, Outbox-Eintrag löschen, kanonische Server-Zeile lokal speichern
7. Bei Konflikt: `conflictCopies` + Fehlerstatus
8. Offline: Outbox bleibt `pending`, kein Mock-Erfolg

## Outbox & Backoff

- Status: `pending` → `syncing` → gelöscht (Erfolg) oder `failed`
- Exponentielles Backoff mit Jitter: Basis 1s, Max 60s
- Trigger: `online`, `visibilitychange`, `focus`, Intervall (30s)

## Mutation-Envelope (Zod)

```typescript
{
  mutationId, deviceId, spaceId,
  resourceType, resourceId,
  operation: 'create' | 'update' | 'soft_delete' | 'restore' | 'upsert_related',
  expectedVersion, payload, createdAt
}
```

## Edge Function `sync-mutations`

- CORS + JWT-Validierung
- Mitgliedschaft via `space_members`
- Idempotenz über `mutation_receipts`
- Entities: RPC `apply_entity_mutation`, `soft_delete_entity`, `restore_entity`
- Checklisten, Budgets, Transaktionen: direkte RLS-geschützte Writes + Receipt

Antworten:

- Erfolg: `{ ok: true, receipt: { serverRow, version, … } }`
- Konflikt: `{ conflict: true, serverRow, localPayload, clientVersion, serverVersion }`

## Realtime

`postgres_changes` auf `entities`, `checklists`, `budgets` pro `space_id`.

**Regel:** Eingehende Events werden **nicht** angewendet, wenn für dieselbe `resourceType` + `resourceId` noch eine Outbox-Mutation pending/syncing/failed ist.

## SyncProvider

React Context (`src/features/sync/SyncProvider.tsx`):

| Feld | Bedeutung |
|------|-----------|
| `online` | Browser-Netzwerkstatus |
| `pendingCount` | Offene Outbox-Einträge |
| `syncing` | Flush läuft |
| `conflicts` | Unaufgelöste `conflictCopies` |
| `lastSyncAt` | Letzter erfolgreicher Flush |
| `flushNow()` | Manueller Sync |

## Auth & Logout

- OTP via Supabase (`shouldCreateUser: false`)
- `signOut()` löscht alle privaten IndexedDB-Daten via `clearUserData()` (außer `deviceId`)
- `AuthProvider` liefert `session`, `profile`, `spaceId`

## Fehler (Deutsch)

Kategorien in `src/lib/errors/types.ts`, Nutzer-Texte in `to-user-message.ts`.

## Tests

```bash
npm test -- src/features/sync/outbox.test.ts
npm test -- src/lib/dates/
npm test -- src/lib/validation/mutation.test.ts
```

## Lokale Entwicklung

```bash
# .env.local
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon-key aus supabase status>

npm run db:start
npm run dev
```

Edge Function deployen/lokal:

```bash
supabase functions serve sync-mutations
```
