# SharedLife V5 – Detailseiten & Zuordnungslogik

Stand: 2026-08-01  
Branch: `cursor/sharedlife-v5-detail-pages-b01d`

## Ziel

Detailseiten sind feste, modulspezifische Templates — kein sichtbarer Modulbaukasten mehr.

## Entfernt aus der UI

- Abschnitt hinzufügen / Größe / Sortierpfeile (`WidgetBoard` nicht mehr gemountet)
- Dauerhafte Bearbeiten-/Löschen-Buttons → `•••`-Menü
- Allgemeiner Bereich „Verknüpfungen“
- Gestrichelte Foto-Uploadbox

## Neu

- `DetailChrome` (Zurück + Menü)
- `HeroMedia` (Tap → Bottom Sheet: Kamera / Mediathek / Entfernen)
- `EntityGallery` (weitere Bilder, Mehrfachauswahl)
- Kontext-Zuordnungen über `belongsToEntityId` / `taskAssignmentEntityId` + `parent_entity_id`
- Reise: Aufgaben, Packliste, Orte, Dates, Momente dieser Reise
- Date-Idee → „Als Date planen“
- Date → „Als Moment speichern“
- Rezept → Zutaten zur Einkaufsliste

## Daten

Bestehende Tabellen weiterverwendet (`entity_media`, `entities.metadata`, `parent_entity_id`).  
Keine destruktive Migration. `widget_instances` bleiben in der DB, erscheinen nicht mehr auf Detailseiten.

## Obergruppen (automatisch)

| Gruppe | Typen |
|--------|--------|
| Planen | Termin, Aufgabe, Date, Reise |
| Momente | Moment |
| Gemeinsam | Ziel, Wunsch, Date-Idee |
| Alltag | Einkauf, Rezept |
| Finanzen | Ausgabe/Einnahme |
