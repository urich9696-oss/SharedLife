# SharedLife: Lea einladen

## Für Dennis (in der App)

1. **Einstellungen → Lea einladen**
2. E-Mail eintragen, z. B. `mariolas.lea@gmail.com`
3. Optional **Passwort** setzen (mind. 8 Zeichen), z. B. `SharedLife-2026!`
4. **Zugang freischalten**

Damit passiert serverseitig:

- Auth-User für Lea (falls noch nicht vorhanden)
- Passwort (wenn angegeben)
- Space-Mitgliedschaft
- Einladung auf Status „freigeschaltet“

### Edge Function deployen (wenn Passwort-Feld neu ist)

```bash
supabase functions deploy invite-partner
```

## Für Lea

1. https://shared-life-theta.vercel.app öffnen (oder PWA installieren)
2. **Mit Passwort anmelden** tippen
3. E-Mail + Passwort eingeben → fertig

Alternativ weiterhin: E-Mail → Code aus der Mail.

## Manuell Passwort setzen (falls App noch kein Passwort-Feld hat)

1. Dennis: Lea wie oben **ohne** Passwort freischalten
2. Supabase Dashboard → **Authentication → Users** → User mit Leas E-Mail öffnen
3. **Send password recovery** oder Passwort direkt setzen
4. Lea meldet sich mit „Mit Passwort anmelden“ an
