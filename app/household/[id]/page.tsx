import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { computeBalances, computeSettlements } from "@/lib/balances";
import { addExpense, addMember, deleteExpense } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function HouseholdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const household = await prisma.household.findUnique({
    where: { id },
    include: {
      members: { orderBy: { createdAt: "asc" } },
      expenses: {
        orderBy: { createdAt: "desc" },
        include: { paidBy: true, splits: true },
      },
    },
  });

  if (!household) notFound();

  const paidByMember = new Map<string, number>();
  const owedByMember = new Map<string, number>();
  for (const member of household.members) {
    paidByMember.set(member.id, 0);
    owedByMember.set(member.id, 0);
  }
  for (const expense of household.expenses) {
    paidByMember.set(
      expense.paidById,
      (paidByMember.get(expense.paidById) ?? 0) + expense.amount,
    );
    for (const split of expense.splits) {
      owedByMember.set(
        split.memberId,
        (owedByMember.get(split.memberId) ?? 0) + split.amount,
      );
    }
  }

  const balances = computeBalances(
    household.members.map((m) => ({
      id: m.id,
      name: m.name,
      paidCents: paidByMember.get(m.id) ?? 0,
      owedCents: owedByMember.get(m.id) ?? 0,
    })),
  );
  const settlements = computeSettlements(balances);
  const totalSpent = household.expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/"
          className="text-xs text-black/50 dark:text-white/50 hover:text-indigo-600"
        >
          ← All households
        </Link>
        <div className="mt-2 flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            {household.name}
          </h1>
          <div className="text-right">
            <div className="text-sm font-semibold">{formatCents(totalSpent)}</div>
            <div className="text-xs text-black/40 dark:text-white/40">
              total spent
            </div>
          </div>
        </div>
      </div>

      {/* Balances + settle up */}
      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-5">
        <h2 className="text-sm font-medium mb-3">Balances</h2>
        {balances.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            Add members to see balances.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {balances.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between text-sm"
              >
                <span>{b.name}</span>
                <span
                  className={
                    b.netCents > 0
                      ? "font-medium text-emerald-600"
                      : b.netCents < 0
                        ? "font-medium text-rose-600"
                        : "text-black/50 dark:text-white/50"
                  }
                >
                  {b.netCents > 0
                    ? `gets back ${formatCents(b.netCents)}`
                    : b.netCents < 0
                      ? `owes ${formatCents(-b.netCents)}`
                      : "settled up"}
                </span>
              </li>
            ))}
          </ul>
        )}

        {settlements.length > 0 && (
          <div className="mt-4 border-t border-black/10 dark:border-white/10 pt-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-black/40 dark:text-white/40 mb-2">
              Suggested settle-up
            </h3>
            <ul className="flex flex-col gap-1.5">
              {settlements.map((s, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium text-rose-600">{s.fromName}</span>{" "}
                  pays{" "}
                  <span className="font-medium text-emerald-600">
                    {s.toName}
                  </span>{" "}
                  <span className="font-semibold">
                    {formatCents(s.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Members */}
      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-5">
        <h2 className="text-sm font-medium mb-3">Members</h2>
        {household.members.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-2">
            {household.members.map((m) => (
              <li
                key={m.id}
                className="rounded-full bg-black/5 dark:bg-white/10 px-3 py-1 text-sm"
              >
                {m.name}
              </li>
            ))}
          </ul>
        )}
        <form action={addMember} className="flex gap-2">
          <input type="hidden" name="householdId" value={household.id} />
          <input
            name="name"
            required
            placeholder="Add a member (e.g. Alex)"
            className="flex-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-black/80 dark:bg-white/90 dark:text-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Add
          </button>
        </form>
      </section>

      {/* Add expense */}
      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-5">
        <h2 className="text-sm font-medium mb-3">Add an expense</h2>
        {household.members.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            Add at least one member first.
          </p>
        ) : (
          <form action={addExpense} className="flex flex-col gap-3">
            <input type="hidden" name="householdId" value={household.id} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                name="description"
                required
                placeholder="What was it? (e.g. Groceries)"
                className="flex-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <input
                name="amount"
                required
                inputMode="decimal"
                placeholder="Amount (e.g. 42.50)"
                className="w-full sm:w-40 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <label className="text-xs text-black/50 dark:text-white/50">
              Paid by
              <select
                name="paidById"
                required
                className="mt-1 block w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-500"
              >
                {household.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend className="text-xs text-black/50 dark:text-white/50 mb-1.5">
                Split between (defaults to everyone)
              </legend>
              <div className="flex flex-wrap gap-3">
                {household.members.map((m) => (
                  <label
                    key={m.id}
                    className="inline-flex items-center gap-1.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="participants"
                      value={m.id}
                      defaultChecked
                      className="h-4 w-4 rounded border-black/30 accent-indigo-600"
                    />
                    {m.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              type="submit"
              className="self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Add expense
            </button>
          </form>
        )}
      </section>

      {/* Expense history */}
      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-5">
        <h2 className="text-sm font-medium mb-3">Expense history</h2>
        {household.expenses.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            No expenses logged yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
            {household.expenses.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <div className="text-sm font-medium">{e.description}</div>
                  <div className="text-xs text-black/50 dark:text-white/50">
                    {e.paidBy.name} paid · split {e.splits.length} way
                    {e.splits.length === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">
                    {formatCents(e.amount)}
                  </span>
                  <form action={deleteExpense}>
                    <input
                      type="hidden"
                      name="householdId"
                      value={household.id}
                    />
                    <input type="hidden" name="expenseId" value={e.id} />
                    <button
                      type="submit"
                      className="text-xs text-black/40 hover:text-rose-600"
                      aria-label={`Delete ${e.description}`}
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
