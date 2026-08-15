/** Kanonische Wunsch-Prioritäten (wish_details.priority). */
export const WISH_PRIORITIES = ['low', 'normal', 'high', 'dream'] as const

export type WishPriority = (typeof WISH_PRIORITIES)[number]

export const WISH_PRIORITY_OPTIONS: Array<{ value: WishPriority; label: string }> = [
  { value: 'low', label: 'Niedrig' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Hoch' },
  { value: 'dream', label: 'Herzenswunsch' },
]

/** Legacy `medium` → `normal`; unbekannte Werte → `normal`. */
export function normalizeWishPriority(raw: unknown): WishPriority {
  if (raw === 'medium') return 'normal'
  if (raw === 'low' || raw === 'normal' || raw === 'high' || raw === 'dream') {
    return raw
  }
  return 'normal'
}

export function wishPriorityLabel(priority: unknown): string {
  const normalized = normalizeWishPriority(priority)
  return WISH_PRIORITY_OPTIONS.find((o) => o.value === normalized)?.label ?? 'Normal'
}

/** Zurückhaltende Badge-/Chip-Töne über bestehende Tokens. */
export function wishPriorityTone(priority: unknown): string {
  switch (normalizeWishPriority(priority)) {
    case 'low':
      return 'bg-surface-soft text-text-muted'
    case 'normal':
      return 'bg-primary/12 text-primary'
    case 'high':
      return 'bg-accent/14 text-accent'
    case 'dream':
      return 'bg-coral/18 text-coral'
    default:
      return 'bg-primary/12 text-primary'
  }
}
