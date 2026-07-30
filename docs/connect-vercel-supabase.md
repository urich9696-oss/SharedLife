# Vercel + Supabase einbinden – Status

## Bereits erledigt (automatisch erkannt)

| Schritt | Status |
|---------|--------|
| GitHub-Repo `urich9696-oss/SharedLife` | ✅ |
| Vercel-Projekt verknüpft | ✅ `shared-life` (`prj_DF7ASObHbMeRDOswJ0uiUvFTGyT1`) |
| Vercel Preview-Deployments | ✅ laufen über GitHub |
| Vercel Preview-URL (PR) | https://shared-life-git-cursor-sharedli-e1a1ae-urich9696-1938s-projects.vercel.app |
| Code + Migrationen + Edge Functions im Repo | ✅ |
| Bootstrap-Skript | ✅ `scripts/bootstrap-remote.sh` |

## Blockiert für den Cloud-Agenten (braucht deine Secrets)

Ohne Tokens kann der Agent **weder** Supabase-Migrationen pushen **noch** Vercel-Env-Vars setzen:

1. **Supabase Access Token** – https://supabase.com/dashboard/account/tokens  
2. **Supabase Project Ref** – aus der Projekt-URL `https://supabase.com/dashboard/project/<REF>`  
3. **Supabase URL + anon key** – Project Settings → API  
4. Optional: **Vercel Token** – https://vercel.com/account/tokens (für Env-Vars per CLI)

Vercel-MCP-Auth ist in dieser Cloud-Umgebung nicht interaktiv verfügbar.

## Was du jetzt kurz schicken kannst (Chat)

Bitte diese Werte hier posten (oder als Cursor-Secrets hinterlegen), dann kann der Agent den Rest ausführen:

```
SUPABASE_PROJECT_REF=...
SUPABASE_ACCESS_TOKEN=...
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
VERCEL_TOKEN=...   # optional, sonst Env manuell in Vercel setzen
```

## Manuell in 5 Minuten (falls ohne Tokens)

### A) Vercel Env Vars
Vercel → Project `shared-life` → Settings → Environment Variables  
Für Preview **und** Production:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_DEFAULT_TIMEZONE` = `Europe/Zurich`
- `VITE_APP_NAME` = `SharedLife`
- `VITE_DEMO_MODE` = `false` (oder weglassen)
- optional `VITE_VAPID_PUBLIC_KEY`

Danach Redeploy.

### B) Supabase
```bash
npx supabase login
npx supabase link --project-ref <REF>
npx supabase db push
npx supabase functions deploy sync-mutations
npx supabase functions deploy manage-push-subscription
npx supabase functions deploy dispatch-reminders
npx supabase functions deploy export-data
```

Dann Auth-User Dennis/Lea + Space laut `docs/setup.md`.

### C) Auth Redirects
Supabase Auth → URL Configuration:

- Site URL: Production-Domain von Vercel
- Redirect: Preview-Domain + `http://localhost:5173/**`
