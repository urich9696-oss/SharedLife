# SharedLife V6 – Stabilität & gemeinsame Synchronisation

Stand: 2026-08-02  
Branch: `cursor/sharedlife-v6-sync-stability-6025`

## Ziel

V6 ist ein Stabilitäts- und Sync-Update (kein Redesign). Dennis und Lea sollen Dates, Wünsche, Date-Ideen und Finanzen zuverlässig gemeinsam sehen und bearbeiten.

## Ursachen (Kurz)

| Modul | Ursache |
|-------|---------|
| Dates / Wünsche | Entity-Zeilen synchronisierten, `*_details` fehlten im Client-Realtime; Date-Spalten `estimated_cost` / `reservation_reference` gingen im Edge-Push verloren; Ort nur in `date_details`, nicht in `metadata.place` |
| Date-Ideen | Metadata-basiert (sollte syncen); „Als Date planen“ speicherte sofort ohne Formular; Media-Links nur lokal |
| Finanzen | Expense über Entity-Metadata (ok); Monatsbudget ohne eager Flush |
| Allgemein | Keine sichtbare App-Version → veraltete iOS-PWA schwer erkennbar |

## Änderungen

1. **Version in Einstellungen** – `SharedLife V6 · 6.0.0`
2. **Realtime** für alle `*_details` + `entity_links`
3. **Edge `sync-mutations`** – vollständiges Date-Detail-Mapping
4. **Pull** – Metadata (occasion, reservation, parent) in Detail-Payloads mergen; Ort spiegeln
5. **Dates** – Zuordnung Reise *oder* Termin; `parent_entity_id` auch im Create-Sheet; Related Dates auf Event-Detail
6. **Date-Ideen** – „Als Date planen“ öffnet Formular mit Prefill; Media/Links mit Outbox
7. **Finanzen** – Budget create/update mit sofortigem Flush + Push
8. **Geräte** – `devices.app_version` wird gesetzt

## Manuelle Zwei-Nutzer-Prüfung

1. Beide auf aktuellen Build (Einstellungen → Version prüfen)
2. Dennis erstellt Date / Wunsch / Date-Idee / Finanz-Eintrag
3. Lea sieht ohne Hard-Reload
4. Lea bearbeitet → Dennis sieht Änderung
5. Soft Delete → Papierkorb → Wiederherstellen
6. App schließen/neu öffnen → Daten bleiben
7. Rezepte + Einkaufsliste unverändert testen

## Externe Konfiguration (unverändert nötig)

- VAPID / Push Cron (siehe `docs/push-notifications.md`)
- Edge Function `sync-mutations` muss nach Deploy aktualisiert werden
