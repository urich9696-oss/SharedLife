# SharedLife V4 – Product Cleanup

Stand: 2026-08-01  
Branch: `cursor/sharedlife-v4-premium-b01d`

## Ziel

Bestehende V4-PWA überarbeiten: typgenaue Eingabemasken, vereinfachte Module, Home neu — ohne Feature-Entfernung (außer explizit **Zuhause**).

## Entfernt

- Modul **Zuhause** (`/module/zuhause` → Redirect `/einkauf`)
- Household nicht mehr creatable; bestehende Datensätze bleiben lesbar

## Umbenannt

- Ideen → **Date Ideen**

## Eingabemasken (typspezifisch)

EntityForm zeigt nur noch Titel + typische Felder (keine generische Titel/Datum/Notiz-Maske mehr).

| Objekt | Wesentliche Felder |
|--------|--------------------|
| Termin | Datum, Zeit, Ganztägig, Ort, Zuordnung, Zuständigkeit, Wiederholung |
| Date | Datum, Zeit, Ort, Budget, Reservierung, Zuständigkeit, Notiz (+ Als Moment) |
| Aufgabe | Fälligkeit, Zuständigkeit, Priorität, Unteraufgaben, Wiederholung, Zuordnung, Status, Notiz |
| Moment | Datum, Ort, Beschreibung, Kategorie, Favorit, Zugehörigkeit |
| Reise | Ziel, Start/Ende, Budget, Unterkunft, Notiz, Packliste, Orte |
| Ziel | Beschreibung, Ziel-/Aktualbetrag, Daten, Fortschritt, Status |
| Einkauf | Nur Artikel + Enter; Rezept-Zutaten mit 🍽️ |
| Rezept | Hero, Titel, Zutaten-Enter, Button → Einkauf, Notiz |
| Finanzen | Monatsbudget, Einnahmen/Ausgaben monatlich/einmalig, Kuchendiagramm |
| Wunsch | Preis, Link, Anlass, Priorität, Status, Notiz |
| Date Idee | Datums-Vorschlag, Ort, Link, Notiz |

## Home

1 Hero · 2 Heute · 3 Schnellzugriffe · 4 Aktive Ziele · 5 Aktuelle Reisen · 6 Letzte Momente  
Leere Sektionen werden ausgeblendet.

## Momente

Swipe-Deck: **jedes Bild = eigene Card**, Tap öffnet dieselbe Moment-Detailseite.
