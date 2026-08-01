# Sicherheitsreview (August 2026)

## Ergebnis

Kein Critical für externe Angreifer ohne Account. High-/Medium-Lücken wurden behoben bzw. abgesichert.

## Behoben in diesem Stand

| Thema | Fix |
|-------|-----|
| Revoke ohne Wirkung | `invite-partner` revoke entfernt `space_members` + bannt Auth-User |
| Beliebig viele Mitglieder | Max. 2 Mitglieder pro Space |
| Demo in Production | `VITE_DEMO_MODE` in PROD-Builds ignoriert |
| clear_space_content | Nur Space-Owner; Storage-Objekte unter `{space_id}/` mitlöschen |
| `record_mutation_receipt` | Mitgliedschaftsprüfung wie bei `log_activity` |

## Weiter solide

- Kein öffentlicher Signup, OTP mit `shouldCreateUser: false`
- `space_members` für Clients nur SELECT
- Service Role nur in Edge Functions
- Signed Media nicht im SW gecacht

## Deploy

```bash
supabase db push
supabase functions deploy invite-partner
```
