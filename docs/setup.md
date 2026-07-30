# Setup – SharedLife

## Voraussetzungen

- Node.js 22+
- npm 10+
- Optional: [Supabase CLI](https://supabase.com/docs/guides/cli) + Docker für lokale DB

## Installation

```bash
git clone <repo-url> sharedlife
cd sharedlife
npm install
cp .env.example .env.local
```

| Variable | Beschreibung |
|----------|--------------|
| `VITE_SUPABASE_URL` | Supabase Projekt-URL (lokal: `http://127.0.0.1:54321`) |
| `VITE_SUPABASE_ANON_KEY` | Öffentlicher Anon-/Publishable-Key |
| `VITE_VAPID_PUBLIC_KEY` | Web-Push VAPID Public Key |
| `VITE_DEFAULT_TIMEZONE` | Standard `Europe/Zurich` |

**Nur serverseitig** (Edge Functions / Cron – niemals im Vite-Frontend):

- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (z. B. `mailto:dennis@example.com`)
- `CRON_SECRET` für `dispatch-reminders`

## Lokale Supabase

```bash
npx supabase start   # oder: npm run db:start
npm run db:reset     # Migrationen + Seed
npm run db:types     # optional: Typen aus lokaler DB generieren
```

Ports laut `supabase/config.toml`: API `54321`, DB `54322`, Studio `54323`.

## Auth-Benutzer Dennis und Lea anlegen

Öffentliche Registrierung ist deaktiviert. OTP verwendet `shouldCreateUser: false`.

### Option A – Supabase Dashboard

1. Authentication → Users → **Add user** / Invite
2. E-Mails von Dennis und Lea anlegen (kein Passwort nötig bei reinem OTP)
3. User-UUIDs notieren

### Option B – Admin API / CLI

Mit Service-Role (nur lokal/CI, niemals im Frontend):

```bash
# Beispiel: User per Management API anlegen, dann UUIDs in Seed nutzen
```

### Profile und Space-Mitgliedschaft

`supabase/seed.sql` legt den Space `SharedLife` an und verknüpft Memberships, sobald Auth-User mit den dokumentierten Test-UUIDs existieren:

| Rolle | Feste Test-UUID | Beispiel-E-Mail |
|-------|-----------------|-----------------|
| Space | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa` | — |
| Dennis | `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb` | `dennis@sharedlife.local` |
| Lea | `cccccccc-cccc-4ccc-8ccc-cccccccccccc` | `lea@sharedlife.local` |

Profile werden über den Auth-Signup-Trigger bzw. manuell in `profiles` angelegt (`display_name`, optionales `avatar_url`).

Memberships dürfen **nicht** über normale Client-Calls verändert werden (keine IUD-Policies für `space_members`).

## E-Mail-Vorlage (6-stelliger Code)

In Supabase Auth → Email Templates → Magic Link / OTP:

- Betreff z. B. `Dein SharedLife-Code`
- Body mit `{{ .Token }}` (sechsstelliger Code), ohne Magic-Link-Zwang
- Absender und SMTP nach Bedarf konfigurieren

## Redirect-URLs

Auth → URL Configuration:

| Umgebung | Site URL / Redirect |
|----------|---------------------|
| Local | `http://127.0.0.1:5173`, `http://localhost:5173` |
| Preview | `https://*.vercel.app` (konkrete Preview-Domain ergänzen) |
| Production | Produktionsdomain der Vercel-App |

## Entwicklung starten

```bash
npm run dev
```

App: http://127.0.0.1:5173 → Login mit freigeschalteter E-Mail + OTP.

Edge Functions lokal:

```bash
supabase functions serve
```

## Icons

```bash
npm run prepare:icons
```

## Sicherheitshinweis

Eine unbekannte E-Mail erzeugt keinen Account und liest keine Daten. Maßgeblich sind Auth, `space_members` und RLS – nicht eine Frontend-E-Mail-Liste.
