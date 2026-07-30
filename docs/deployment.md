# Deployment

## Vercel (empfohlen)

SharedLife ist eine Vite-SPA. Client-Routing erfordert einen Rewrite auf `index.html` — konfiguriert in `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Schritte

1. Repository mit Vercel verbinden
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Environment Variables (Production + Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_VAPID_PUBLIC_KEY`

### Supabase

1. Migrationen auf Remote anwenden: `supabase db push`
2. Edge Functions deployen:
   ```bash
   supabase functions deploy sync-mutations
   supabase functions deploy manage-push-subscription
   supabase functions deploy dispatch-reminders
   supabase functions deploy export-data
   ```
3. Secrets setzen:
   ```bash
   supabase secrets set CRON_SECRET=...
   supabase secrets set VAPID_PUBLIC_KEY=...
   supabase secrets set VAPID_PRIVATE_KEY=...
   supabase secrets set VAPID_SUBJECT=mailto:you@example.com
   ```

### Cron (Erinnerungen)

Supabase Dashboard → Database → Extensions → `pg_cron` oder externer Scheduler:

```
POST https://<project>.supabase.co/functions/v1/dispatch-reminders
Header: cron-secret: <CRON_SECRET>
```

Empfohlen: alle 1–5 Minuten.

### Auth Redirect URLs

In Supabase Auth für jede Umgebung:

- `https://<domain>/`
- `http://localhost:5173/**` (lokal)

## CI

GitHub Actions (`.github/workflows/ci.yml`): lint, typecheck, test, build auf PR/Push.

## PWA

`vite-plugin-pwa` generiert Service Worker mit `sw-push.js` für Push-Events. Nach Deploy: Hard-Refresh oder PWA neu installieren.
