// Balance and settle-up computation for a household.

export type MemberBalanceInput = {
  id: string;
  name: string;
  paidCents: number;
  owedCents: number;
};

export type MemberBalance = {
  id: string;
  name: string;
  paidCents: number;
  owedCents: number;
  // Positive means the household owes this member (they are up).
  // Negative means this member owes the household.
  netCents: number;
};

export type Settlement = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amountCents: number;
};

export function computeBalances(members: MemberBalanceInput[]): MemberBalance[] {
  return members.map((m) => ({
    id: m.id,
    name: m.name,
    paidCents: m.paidCents,
    owedCents: m.owedCents,
    netCents: m.paidCents - m.owedCents,
  }));
}

/**
 * Greedy settle-up: repeatedly match the biggest debtor with the biggest
 * creditor. Produces a minimal-ish set of transactions to zero out balances.
 */
export function computeSettlements(balances: MemberBalance[]): Settlement[] {
  const debtors = balances
    .filter((b) => b.netCents < 0)
    .map((b) => ({ ...b, remaining: -b.netCents }))
    .sort((a, b) => b.remaining - a.remaining);
  const creditors = balances
    .filter((b) => b.netCents > 0)
    .map((b) => ({ ...b, remaining: b.netCents }))
    .sort((a, b) => b.remaining - a.remaining);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.remaining, creditor.remaining);
    if (amount > 0) {
      settlements.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amountCents: amount,
      });
      debtor.remaining -= amount;
      creditor.remaining -= amount;
    }
    if (debtor.remaining === 0) i++;
    if (creditor.remaining === 0) j++;
  }
  return settlements;
}
