// Helpers for working with money stored as integer cents.

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

export function parseAmountToCents(input: string): number {
  const normalized = input.trim().replace(/[$,\s]/g, "");
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Amount must be a positive number.");
  }
  return Math.round(value * 100);
}

/**
 * Split a total (in cents) as evenly as possible across `count` members.
 * Any leftover cents from rounding are distributed one-per-member so the
 * shares always sum exactly back to the total.
 */
export function splitEvenly(totalCents: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(totalCents / count);
  let remainder = totalCents - base * count;
  const shares: number[] = [];
  for (let i = 0; i < count; i++) {
    let share = base;
    if (remainder > 0) {
      share += 1;
      remainder -= 1;
    }
    shares.push(share);
  }
  return shares;
}
