import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function splitEvenly(totalCents: number, count: number): number[] {
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

async function main() {
  const existing = await prisma.household.findFirst({
    where: { name: "Maple Street Apartment" },
  });
  if (existing) {
    console.log("Demo household already exists, skipping seed.");
    return;
  }

  const household = await prisma.household.create({
    data: {
      name: "Maple Street Apartment",
      members: {
        create: [{ name: "Alex" }, { name: "Sam" }, { name: "Jordan" }],
      },
    },
    include: { members: true },
  });

  const [alex, sam, jordan] = household.members;

  const expenses = [
    { description: "Groceries", amount: 6000, paidBy: alex.id },
    { description: "Internet bill", amount: 4500, paidBy: sam.id },
    { description: "Cleaning supplies", amount: 1500, paidBy: jordan.id },
  ];

  for (const e of expenses) {
    const shares = splitEvenly(e.amount, household.members.length);
    await prisma.expense.create({
      data: {
        description: e.description,
        amount: e.amount,
        householdId: household.id,
        paidById: e.paidBy,
        splits: {
          create: household.members.map((m, i) => ({
            memberId: m.id,
            amount: shares[i],
          })),
        },
      },
    });
  }

  console.log(`Seeded household "${household.name}" with demo data.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
