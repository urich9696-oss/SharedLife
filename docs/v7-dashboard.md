# SharedLife V7 – Dashboard, Momente & Interaktion

Stand: 2026-08-08  
Branch: `cursor/sharedlife-v7-dc3e`

## Ziel

V7 korrigiert die Home-Sektion „Letzte Momente“, vervollständigt die Wunschpriorität in der UI, macht Bottom Sheets per Drag schließbar und gestaltet das Dashboard emotionaler — ohne Schema-Migration und ohne Production-Deploy.

## Version

- `SharedLife V7 · 7.0.0`
- `package.json` / `APP_VERSION` / `APP_RELEASE_NAME`

## Änderungen

1. **Letzte Momente** – ausschließlich `entity_type === 'moment'` über `selectRecentMoments`
2. **Timeline bleibt breit** – `deriveTimelineItems` unverändert für Memories/Timeline; auf Home klar als „Unser gemeinsamer Weg“
3. **Wunschpriorität** – Labels inkl. „Herzenswunsch“, Chip-Auswahl, Anzeige in Liste und Detail; bestehendes `wish_details.priority`
4. **BottomSheet** – Drag-to-dismiss zentral für Plus- und Mehr-Menü
5. **Dashboard** – Warm Editorial + Photo First mit echten Daten (Heute, Vorfreude, Momente, Timeline-Vorschau, Highlight)
6. **Erinnerungen-Deck** – keine pauschale Typbezeichnung `moment` für nicht zuordenbare Galerie-Inhalte

## Migrationen

Keine. Bestehende Datensätze bleiben typisiert wie in V6.

## Deploy-Hinweis

Production wurde nicht ausgerollt. Vercel erstellt bei Push automatisch ein Branch-Preview-Deployment — „nichts deployt“ bezieht sich daher nur auf Production.

## Manuelle Prüfung

1. Version in Einstellungen: SharedLife V7 · 7.0.0
2. Home: Rezept/Wunsch/Date-Idee/Date erscheinen nicht unter „Letzte Momente“
3. Echter Moment erscheint dort
4. Wunsch „Herzenswunsch“ speichern → Liste + Detail
5. Plus- und Mehr-Sheet per Herunterziehen schließen
