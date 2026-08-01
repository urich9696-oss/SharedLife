# SharedLife

Private Progressive Web App für **Dennis und Lea** – gemeinsames digitales Zuhause für Organisation, Erinnerungen, Reisen, Dates, Ziele und Momente.

Warm Editorial · Photo First · Offline-First · Apple-inspiriert

## Stack

React 19 · TypeScript · Vite · TanStack Query · Dexie · Supabase · PWA · Vitest · Playwright

## Lokaler Start

```bash
cp .env.example .env.local
# VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY setzen

npm install
npm run prepare:icons   # falls Icons fehlen
npm run dev
```

Lokale Datenbank (Docker + Supabase CLI):

```bash
npm run db:start
npm run db:reset
```

Details: [docs/setup.md](docs/setup.md)

## Skripte

| Befehl | Beschreibung |
|--------|--------------|
| `npm run dev` | Vite Dev-Server |
| `npm run build` | Production Build |
| `npm run typecheck` | TypeScript |
| `npm run test` | Vitest |
| `npm run test:e2e` | Playwright Smoke |
| `npm run lint` | ESLint |
| `npm run db:reset` | Migrationen + Seed |

## Dokumentation

- [V3 Product Cleanup](docs/v3-product-cleanup.md)
- [V3 manuelle QA](docs/qa-checklist-v3.md)
- [Umsetzungsstatus](docs/implementation-status.md)
- [Architektur](docs/architecture.md)
- [Datenmodell](docs/data-model.md)
- [Sicherheit & RLS](docs/security-and-rls.md)
- [Offline-Sync](docs/offline-sync.md)
- [Push](docs/push-notifications.md)
- [Setup](docs/setup.md)
- [Deployment](docs/deployment.md)
- [Testing](docs/testing.md)

## Umgebungen

Local (Vite + lokale Supabase) · Vercel Preview · Vercel Production – jeweils mit eigenem Supabase-Projekt. Secrets nur serverseitig; Frontend erhält lediglich URL + Anon-Key + öffentlichen VAPID-Key.
