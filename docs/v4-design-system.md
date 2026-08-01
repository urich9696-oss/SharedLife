# SharedLife V4 – Design System

Stand: 2026-08-01  
Branch: `cursor/sharedlife-v4-premium-b01d`

## Prinzip

Funktionalität bleibt. Designqualität auf Premium-Niveau — ruhig, proportioniert, bewusst.  
Nicht Apple kopieren, dieselbe Sorgfalt erreichen.

## Typografie

Ausschließlich **Geist Variable** (`@fontsource-variable/geist`).

| Rolle | Gewicht | Größe |
|-------|---------|--------|
| Headlines | Bold (700) | großzügig, enger Zeilenabstand, leicht negatives Tracking |
| Fließtext | Regular (400) | 17px |
| Labels | Medium (500) | 13px, dezentes Grau |
| Zahlen | SemiBold (600) | `.font-numeric` |

## Farben

Bestehende Palette unverändert (`tokens.css` `--color-*`).

## Spacing

Nur: **8 · 16 · 24 · 32 · 48** (in Tailwind: `2 · 4 · 6 · 8 · 12`).

## Karten

- Radius: 28px (`rounded-lg` → `--radius-lg`)
- Mehrschichtige, feine Schatten (`--shadow-xs` … `--shadow-md`)
- Weiß auf gebrochenem Weiß, dezente Border
- Orientierung: Apple Health (schweben, nicht schreien)

## Eingaben

Einstellungszeilen — Label oben, Wert darunter, Haarlinie unten.  
Keine schweren Formularboxen. Siehe `Input` / `Textarea` / `Select` / `FormSection`.

## Buttons

Klassisch, großer Radius, klare Primärfarbe, keine Glas-/Verlaufeffekte.

## Motion

Fade / Scale / Slide · **140–240 ms** · `--ease-out`.  
Detailseiten: `PageEnter` (Fade + Scale aus der Karte heraus).

## Icons

`lucide-react`, Strichstärke **1.75** — SF-Symbols-nahe Formsprache.

## Navigation

Klassische Bottom-Bar mit dezentem Material-Blur (`backdrop-blur-xl`).

## Leere Zustände

Illustration + kurze Beschreibung + Primärbutton (`EmptyState`).
