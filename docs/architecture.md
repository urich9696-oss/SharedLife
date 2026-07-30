# SharedLife – Architektur

## Überblick

SharedLife ist eine private Progressive Web App für genau zwei Nutzer (Dennis und Lea). Ein gemeinsamer Space, identische Rechte, Offline-First, fotozentrierte UX.

## Stack

| Schicht | Technologie |
|---------|-------------|
| UI | React 19, TypeScript strict, Vite 8 |
| Routing | React Router |
| Serverzustand | TanStack Query |
| Lokale DB | Dexie (IndexedDB) |
| Backend | Supabase (Auth, Postgres, Storage, Realtime, Edge Functions, Cron) |
| Formulare | React Hook Form + Zod |
| Motion | CSS + Motion (komplexe Übergänge) |
| Styling | CSS-Variablen (Design-Tokens) + Tailwind an Tokens gebunden |
| PWA | vite-plugin-pwa / Workbox |

## Datenprinzip

```
Entities → Fachdaten → Verknüpfungen → Widgets → Views
```

Eine Information existiert einmal als kanonischer Datensatz. Views und Widgets referenzieren, sie kopieren nicht.

## Schreibpfad (Offline-First)

1. UUID für Datensatz + Mutations-ID lokal erzeugen
2. Zod-Validierung
3. Optimistic Update in Dexie + Outbox atomar
4. UI: „lokal gespeichert“ / „wird synchronisiert“
5. Sync-Edge-Function prüft Auth, Membership, Schema, Mutations-ID, Version
6. Atomare DB-Änderung + Activity Log + Mutation Receipt
7. Client ersetzt lokale Kopie mit Serverstand, entfernt Outbox-Eintrag
8. Bei Versionskonflikt: Konfliktansicht (Server behalten / lokal übernehmen / mergen)

## Schichten

```
Präsentation → Features → Forms/Zod → App-Services → lokale Repositories
→ Sync-Engine → Supabase Client → Edge Functions → Postgres/RLS/Storage
```

## Sicherheit

- RLS auf jeder privaten Tabelle via `is_space_member(space_id)`
- OTP ohne Auto-Signup (`shouldCreateUser: false`)
- Privater Storage-Bucket, Pfad `space_id/media_id/variant/file`
- Keine Service-Role / privaten VAPID-Keys im Frontend
- Memberships nicht durch normale Clients manipulierbar

## Realtime

Realtime aktualisiert lokale Spiegel und Query-Caches, überschreibt aber niemals unbestätigte Outbox-Mutationen derselben Ressource.

## Deployment

- Local: Vite + lokale Supabase
- Preview: Vercel Preview + separates Supabase-Dev-Projekt
- Production: Vercel Production + separates Supabase-Prod-Projekt
- Erinnerungsversand: Supabase Cron → Edge Function (nicht browserabhängig)
