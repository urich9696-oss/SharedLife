import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createHousehold } from "./actions";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function Home() {
  const households = await prisma.household.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      members: true,
      expenses: { select: { amount: true } },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Your households</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Create a household, add the people you share costs with, and log
          expenses. SharedLife works out who owes whom.
        </p>
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-5">
        <h2 className="text-sm font-medium mb-3">Create a new household</h2>
        <form action={createHousehold} className="flex gap-2">
          <input
            name="name"
            required
            placeholder="e.g. Maple Street Apartment"
            className="flex-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Create
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        {households.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            No households yet. Create your first one above.
          </p>
        ) : (
          households.map((h) => {
            const total = h.expenses.reduce((sum, e) => sum + e.amount, 0);
            return (
              <Link
                key={h.id}
                href={`/household/${h.id}`}
                className="group rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-5 hover:border-indigo-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium group-hover:text-indigo-600">
                      {h.name}
                    </div>
                    <div className="text-xs text-black/50 dark:text-white/50 mt-0.5">
                      {h.members.length} member
                      {h.members.length === 1 ? "" : "s"} ·{" "}
                      {h.expenses.length} expense
                      {h.expenses.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {formatCents(total)}
                    </div>
                    <div className="text-xs text-black/40 dark:text-white/40">
                      total spent
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </section>
    </div>
  );
}
