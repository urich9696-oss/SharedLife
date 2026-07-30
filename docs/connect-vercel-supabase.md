# Vercel + Supabase einbinden – Status

## Erledigt

| Schritt | Status |
|---------|--------|
| Vercel-Projekt `shared-life` am Repo | ✅ |
| Supabase-Projekt `uoqlusgimvinjmajtesz` | ✅ Keys vorhanden |
| Publishable Key funktioniert mit Client | ✅ |
| Auth-User Dennis (`urich9696@gmail.com`) | ✅ `ee77d528-db9b-4480-9501-81e044593038` |
| OTP-Versand getestet | ✅ |
| Bootstrap-SQL | ✅ `scripts/remote-bootstrap.sql` |
| Apply-Skript | ✅ `scripts/apply-supabase-remote.mjs` |

## Blocker: Datenbank-Passwort

Der `sb_secret_…`-Key ist **nicht** das Postgres-Passwort. Für Migrationen braucht das Skript:

**Supabase Dashboard → Project Settings → Database → Database password**  
(falls unbekannt: „Reset database password“)

Dann im Agent-Chat nur das Passwort schicken, oder lokal:

```bash
export SUPABASE_DB_PASSWORD='...'
export SUPABASE_SECRET_KEY='sb_secret_...'
export DENNIS_EMAIL='urich9696@gmail.com'
# optional:
export LEA_EMAIL='lea@example.com'
node scripts/apply-supabase-remote.mjs
```

### Alternative ohne Passwort (1 Klick)

1. Supabase → **SQL Editor** → New query  
2. Inhalt von `scripts/remote-bootstrap.sql` einfügen → Run  
3. Agent Bescheid geben → dann Memberships/Profile per Secret-Key fertigstellen

## Vercel Env Vars (manuell, 2 Minuten)

Vercel → `shared-life` → Settings → Environment Variables → Preview **und** Production:

| Name | Wert |
|------|------|
| `VITE_SUPABASE_URL` | `https://uoqlusgimvinjmajtesz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_mUE7s-De5ltBZKghydM77Q_EuT0PHI-` |
| `VITE_DEFAULT_TIMEZONE` | `Europe/Zurich` |
| `VITE_APP_NAME` | `SharedLife` |
| `VITE_DEMO_MODE` | `false` |

Danach Redeploy. **Niemals** `sb_secret_…` in Vercel Frontend-Env legen.

## Auth Redirects

Supabase → Authentication → URL Configuration:

- Site URL: Production-Domain von Vercel
- Additional Redirect URLs: Preview-URL + `http://localhost:5173/**`

## Sicherheit

Der Secret-Key wurde im Chat geteilt. Nach dem Setup unter **API Keys** rotieren/neu erzeugen und alten löschen.
