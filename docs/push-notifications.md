# Push-Benachrichtigungen

## Übersicht

SharedLife nutzt **Web Push** für Erinnerungen:

1. Nutzer aktiviert Push in **Einstellungen** (explizite Aktion → `Notification.requestPermission`)
2. Browser erstellt Push-Subscription mit `VITE_VAPID_PUBLIC_KEY`
3. Client ruft Edge Function `manage-push-subscription` auf (upsert/revoke)
4. Cron ruft `dispatch-reminders` mit `CRON_SECRET` auf
5. Service Worker (`public/sw-push.js`) zeigt Notification + Deep-Link bei Klick

## Keys erzeugen

```bash
npx web-push generate-vapid-keys
```

- **Public Key** → `VITE_VAPID_PUBLIC_KEY` (Vercel + `.env.local`)
- **Private Key** → Supabase Secret `VAPID_PRIVATE_KEY` (nur Server)
- **Subject** → `VAPID_SUBJECT=mailto:you@example.com`

## Edge Functions

### `manage-push-subscription`

- Auth: JWT (angemeldeter User)
- Actions: `upsert`, `revoke`
- Schreibt in `push_subscriptions` (kein Service Role im Frontend)

### `dispatch-reminders`

- Auth: Header `cron-secret: <CRON_SECRET>`
- Reserviert fällige Reminders (`next_trigger_at <= now()`)
- Erstellt eindeutige `reminder_deliveries` (Unique-Index)
- Sendet via `web-push` — **kein Fake-Success**
- Deaktiviert Subscriptions bei HTTP 404/410
- Aktualisiert `next_trigger_at` bei `recurrence_rule`

## Client

`src/features/reminders/push-subscription.ts`:

- `subscribeToPush(spaceId, userId)` — nur nach User-Aktion
- `unsubscribeFromPush(spaceId)`
- `isPushSupported()`, `isStandalonePwa()` für iOS-Hinweis

## iOS / PWA

Push auf iOS funktioniert nur in einer **installierten PWA** (Safari → Teilen → Zum Home-Bildschirm). Die Einstellungen zeigen einen entsprechenden Hinweis.

## Service Worker

Workbox lädt `sw-push.js` via `importScripts` (siehe `vite.config.ts`).

Events:

- `push` → `showNotification`
- `notificationclick` → Fenster fokussieren oder `openWindow(url)`

## Cron einrichten

Beispiel (täglich/minütlich je nach Bedarf):

```http
POST /functions/v1/dispatch-reminders
cron-secret: <CRON_SECRET>
```

## Fehlerbehandlung

- Fehlgeschlagene Zustellungen → `reminder_deliveries.status = failed`
- Ungültige Endpoints → Subscription `is_active = false`
- Keine Subscription → Reminder wird trotzdem für nächsten Zyklus vorbereitet/deaktiviert

## Lokales Testen

1. Supabase lokal + Functions serve
2. VAPID-Keys in Secrets
3. Reminder mit `notify_push = true` und `next_trigger_at` in der Vergangenheit
4. `curl -X POST http://127.0.0.1:54321/functions/v1/dispatch-reminders -H "cron-secret: ..." `

Ohne echte Keys schlägt der Versand fehl — das ist beabsichtigt.
