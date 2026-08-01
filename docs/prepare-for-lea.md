# SharedLife: Lea einladen (nur PWA + Login)

## Für Dennis

1. App leeren / mit echten Daten füllen
2. **Einstellungen → Lea einladen**
3. Leas E-Mail eintragen → **Zugang freischalten**

Damit passiert serverseitig:

- Auth-User für Lea (falls noch nicht vorhanden)
- Space-Mitgliedschaft
- Einladung auf Status „freigeschaltet“

## Für Lea

1. https://shared-life-theta.vercel.app öffnen (oder „Zum Home-Bildschirm“ / PWA)
2. E-Mail eingeben → **Code senden**
3. 6-stelligen Code aus der Mail eingeben → fertig

Kein Passwort, kein Dashboard, kein manueller Membership-Schritt.

## Deploy-Voraussetzung

```bash
supabase db push   # inkl. Migration invitee_email
supabase functions deploy invite-partner
```

`SUPABASE_SERVICE_ROLE_KEY` muss für Edge Functions gesetzt sein (Standard bei Supabase).

## Login

Standard: **E-Mail + OTP-Code**. Optional weiterhin „Mit Passwort anmelden“ (z. B. für Dennis).
