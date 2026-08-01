# Manuelle QA-Checkliste – SharedLife V3

Diese Punkte sind **nicht** als automatisiert bestanden zu werten.

## iPhone / PWA

- [ ] App als Standalone-PWA installieren
- [ ] Safe Areas: Bottom-Nav und FAB nicht verdeckt
- [ ] Eingabefelder ≥ 16px: kein ungewollter Zoom beim Tippen
- [ ] Einkauf: Tastatur öffnen, Sheet/Seite scrollbar, Hinzufügen erreichbar
- [ ] Touch-Ziele ca. 44×44 px (Nav, Plus, Abhaken)
- [ ] Statusbar/Viewport in Standalone korrekt
- [ ] Auto-Update / Chunk-Recovery: nach Deploy App öffnen ohne Application Error
- [ ] `prefers-reduced-motion`: Timeline-Browser ohne starke Animation nutzbar

## Zwei Geräte / Realtime

- [ ] Gerät A und B mit demselben Space anmelden
- [ ] Einkaufsartikel auf A hinzufügen → erscheint auf B
- [ ] Artikel auf A abhaken → verschwindet auf B, Undo 5s auf A
- [ ] Schnelles mehrfaches Abhaken erzeugt keine Duplikate
- [ ] Offline auf A Artikel hinzufügen → nach Online erscheint einmalig auf B
- [ ] Moment mit Foto auf A → nach Reload und auf B sichtbar
- [ ] Geplante Reise mit Bild vor Abreise speichern → Bild bleibt nach Reload

## Home / Navigation

- [ ] Bottom-Nav hat genau 5 Hauptpunkte
- [ ] Planen zeigt Kalender / Vorhaben / Aufgaben
- [ ] Mehr zeigt Paarprofil-Karte und 4 Gruppen
- [ ] Hero ist stabil (kein Zufallswechsel beim Re-Render)
- [ ] Hero-Inhalt erscheint nicht direkt darunter erneut
- [ ] Leere Home-Sektionen sind ausgeblendet

## Deep Links

- [ ] `/calendar` → Planen/Kalender
- [ ] `/module/reisen` → Vorhaben (Reisen)
- [ ] `/module/ziele` → Vorhaben (Ziele)
- [ ] `/module/beziehung` → Momente
- [ ] `/momente` → `/erinnerungen`
- [ ] `/entities/:type/:id` öffnet bestehenden Datensatz

## Medien

- [ ] Lokale Vorschau während Upload
- [ ] Nach Reload Remote-Bild sichtbar
- [ ] Nach Logout/Login Bild erneut ladbar
- [ ] Fehlgeschlagener Upload verständlich wiederholbar
