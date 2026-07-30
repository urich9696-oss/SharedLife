# Vercel + Supabase – Status

## Erledigt ✅

| Schritt | Status |
|---------|--------|
| Supabase-Schema (alle Migrationen) | ✅ live auf `uoqlusgimvinjmajtesz` |
| Space `SharedLife` | ✅ |
| Auth-User Dennis `urich9696@gmail.com` | ✅ `ee77d528-db9b-4480-9501-81e044593038` |
| Profile + Space-Mitgliedschaft (owner) | ✅ |
| Storage-Bucket `media` + RLS | ✅ |
| Publishable Key im Client nutzbar | ✅ |

## Noch von dir (kurz)

### 1) Vercel Environment Variables

https://vercel.com/urich9696-1938s-projects/shared-life/settings/environment-variables  

Für **Production** und **Preview**:

| Name | Wert |
|------|------|
| `VITE_SUPABASE_URL` | `https://uoqlusgimvinjmajtesz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_mUE7s-De5ltBZKghydM77Q_EuT0PHI-` |
| `VITE_DEFAULT_TIMEZONE` | `Europe/Zurich` |
| `VITE_APP_NAME` | `SharedLife` |
| `VITE_DEMO_MODE` | `false` |

Danach **Redeploy**. Niemals `sb_secret_…` in Vercel-Frontend-Vars.

### 2) Auth Redirect URLs

https://supabase.com/dashboard/project/uoqlusgimvinjmajtesz/auth/url-configuration  

- Site URL: deine Vercel Production-URL  
- Redirects: Preview-URL + `http://localhost:5173/**`

### 3) Optional: Edge Functions + Lea

Für Sync/Push/Export braucht der Agent noch einen **Supabase Access Token**:  
https://supabase.com/dashboard/account/tokens  

Lea-Account: E-Mail schicken, dann wird sie als Space-Mitglied angelegt.

## Sicherheit

DB-Passwort und Secret-Key wurden im Chat geteilt → nach dem Go-Live unter API Keys / Database password rotieren.
