# SharedLife V4 – Premium Product Evolution

Stand: 2026-08-01  
Branch: `cursor/sharedlife-v4-premium-b01d`  
Basis: `cursor/sharedlife-v3-product-cleanup-2035` (Draft-PR #4)

## Mission

Bestehende SharedLife-PWA weiterentwickeln — keine neue App, keine Feature-Entfernung.  
Ziel: ein Premium-Produkt „aus einem Guss“ für Alltag, Organisation, Erinnerungen und gemeinsame Zukunft.

## Designsystem

- Stil: Premium UI, minimalistisch, luftig, warm, emotional
- Farben: gebrochenes Weiß `#F5F4F2`, warme Grautöne, Pastelltöne, dezentes Sage (**unverändert**)
- Typografie: **Geist** exclusively (Bold Headlines, Regular Body, Medium Labels, SemiBold Zahlen)
- Karten: 28px Radius, mehrschichtige feine Schatten, viel Bildfläche
- Eingaben: Einstellungszeilen (keine klassischen Formularboxen)
- Motion: Fade/Scale/Slide · 140–240 ms · Detail-`PageEnter`
- Details: `docs/v4-design-system.md`

## Informationsarchitektur (unverändert)

Bottom-Nav: **Home · Planen · Plus · Momente · Mehr**

## Umgesetzte V4-Flächen

### Home
- Großer Hero (nächster Urlaub / Date / Ziel / Moment / emotionaler Fallback)
- Heute (max. 4)
- Schnellzugriffe 2×2 (Einkauf, Date, Ziel, Reise)
- Gemeinsamer Fortschritt (horizontale Progress Cards)
- Letzte Momente (große Bilder, horizontal)

### Momente
- Neuer Default-Tab **Erleben**: Tinder-ähnliches Swipe-Deck (Vollflächen-Hero)
- Timeline / Fotos / Alben / Favoriten bleiben erhalten
- Moment-Profil weiter über Browser/Detailseite

### Plus
Einträge: Moment, Termin, Aufgabe, Einkauf, Ausgabe, Rezept, Wunsch, Idee, Reise, Ziel (+ Date)

### Module
- **Rezepte**: Kochbuch-UI, Zutatenliste, „Zur Einkaufsliste“ ohne Duplikate
- **Finanzen**: Monatsübersicht, Kategoriebalken, Budgets, Sparziele, Timeline
- **Zuhause**: Raum-Presets (Wohnzimmer, Bad, Küche, …) als `household`-Entities
- **Ideen**: kategorisierte Leisure-Sammlung mit großen Bildkarten

### Aufgaben / Dates
- Zuständig: Dennis / Lea / Gemeinsam (in `metadata.assigneeRole`, sync-sicher)
- Date → **Als Moment speichern** (verknüpft, kopiert Medienlinks)

## Daten & Sync

- Keine destruktiven Schema-Änderungen
- Räume: `household` + `metadata.roomKey`
- Rezeptzutaten: Checklisten mit Titel „Zutaten“
- Pair-Assignee: lokal in Entity-Metadata; `task_details.assignee_id` nur bei echten UUIDs
- Additive Doku-Migration: `20260801000014_v4_metadata_conventions.sql`

## Bewusst nicht entfernt

Alle Entity-Typen, Widgets, Offline-Sync, Einkauf, Legacy-Deep-Links, Settings, Trash, Konflikte.

## QA

Siehe `docs/qa-checklist-v4.md`.
