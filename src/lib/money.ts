/** Normalisiert Eingaben wie 1'200.50 / 1200,5 → "1200.50". */
export function normalizeMoneyInput(raw: string): string | null {
  let s = raw.trim().replace(/\s/g, '')
  if (!s) return null

  s = s.replace(/'/g, '')

  if (s.includes(',') && s.includes('.')) {
    // 1.200,50 → 1200.50
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes(',')) {
    s = s.replace(',', '.')
  }

  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null

  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return n.toFixed(2)
}

/** Sicheres Parsen für Anzeige/Aggregation (inkl. CH-Formate und Zahlen). */
export function parseMoneyAmount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = normalizeMoneyInput(value)
    if (normalized !== null) return Number(normalized)
  }
  return 0
}
