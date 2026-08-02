# SharedLife: Lea einladen

## Fehler „Could not find the table public.space_invites“

Die Tabelle fehlt noch in der Remote-Datenbank. Einmal im Supabase SQL Editor ausführen:

1. Öffne https://supabase.com/dashboard/project/uoqlusgimvinjmajtesz/sql/new  
2. Inhalt von `scripts/ensure-space-invites.sql` einfügen → **Run**  
3. App neu laden

## Lea freischalten (neueste Version)

1. Deploy/Merge inkl. Passwort-Einladung + Edge Function:
   ```bash
   supabase functions deploy invite-partner
   ```
2. In der App: **Einstellungen → Lea einladen**
3. E-Mail: `mariolas.lea@gmail.com`
4. Passwort: `SharedLife-2026!`
5. **Zugang freischalten**

## Für Lea

1. https://shared-life-theta.vercel.app  
2. **Mit Passwort anmelden**  
3. E-Mail `mariolas.lea@gmail.com` + Passwort `SharedLife-2026!`

## Fallback ohne Passwort-Feld (alte App)

1. SQL wie oben ausführen  
2. Zugang mit E-Mail freischalten  
3. Supabase → Authentication → Users → Passwort setzen  
