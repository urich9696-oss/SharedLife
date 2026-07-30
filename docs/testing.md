# Testing

## Unit & Integration (Vitest)

```bash
npm run test          # einmalig
npm run test:watch    # Watch-Modus
npm run test:coverage
```

Relevante Suites:

- `src/features/media/image-processing.test.ts` — Bildvalidierung
- `src/lib/dates/*.test.ts` — Datums-/Budget-/Recurrence-Logik
- `src/features/sync/outbox.test.ts` — Outbox-Backoff

Environment: `happy-dom` (siehe `vite.config.ts`).

## Typecheck & Lint

```bash
npm run typecheck
npm run lint
```

## E2E (Playwright)

```bash
npm run test:e2e
```

Smoke-Tests in `tests/e2e/`:

- Login-Seite rendert (nur mit gültigen Env-Vars, Tag `@requires-env`)
- Nav-Shell auf Home
- Basis-Ladetest ohne Supabase-Credentials

Ohne `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` werden `@requires-env`-Tests übersprungen.

Preview-Server startet automatisch via `playwright.config.ts` auf Port 4173.

## Datenbank (RLS)

```bash
npm run test:db
```

Voraussetzung: laufende lokale Supabase-Instanz.

## Manuelle Checkliste vor Release

- [ ] OTP-Login
- [ ] Offline create → Online sync
- [ ] Widget hinzufügen/entfernen auf Entity-Detail
- [ ] Foto-Upload + Queue
- [ ] Push aktivieren (echte VAPID-Keys)
- [ ] JSON-Export
- [ ] Papierkorb → Wiederherstellen
