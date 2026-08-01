# SharedLife vorbereiten: leeren & Lea einladen

## 1. Testdaten entfernen

In der App unter **Einstellungen → Alle Einträge entfernen**.

Das löscht Inhalte (Reisen, Momente, Aufgaben, Finanzen, Medien, …). Erhalten bleiben:

- Space & Mitgliedschaften
- Paarprofil
- Geräte / Auth

Optional remote (mit Credentials):

```bash
node --env-file=.env.remote.local scripts/clear-space-data.mjs
```

Migration `20260801000015_clear_space_content.sql` stellt die RPC `clear_space_content` bereit.

## 2. Mit echten Daten füllen

App neu laden, eigene Einträge anlegen. Musterdaten-Button ist entfernt.

## 3. Lea einladen

1. **Paarprofil** prüfen (Partner B = Lea)
2. **Einstellungen → Lea einladen** → Entwurf anlegen → „Als bereit markieren“
3. In Supabase Auth den User für Lea anlegen (kein öffentlicher Signup)
4. `space_members`-Eintrag für Lea setzen (Service-Role / Dashboard — Client darf Memberships nicht selbst schreiben)

Details: `docs/setup.md`.
