"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseAmountToCents, splitEvenly } from "@/lib/money";

export async function createHousehold(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Household name is required.");
  }
  const household = await prisma.household.create({ data: { name } });
  revalidatePath("/");
  redirect(`/household/${household.id}`);
}

export async function addMember(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!householdId) throw new Error("Missing household.");
  if (!name) throw new Error("Member name is required.");

  await prisma.member.create({ data: { name, householdId } });
  revalidatePath(`/household/${householdId}`);
}

export async function addExpense(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const paidById = String(formData.get("paidById") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const participantIds = formData.getAll("participants").map(String);

  if (!householdId) throw new Error("Missing household.");
  if (!description) throw new Error("Description is required.");
  if (!paidById) throw new Error("Select who paid.");

  const amountCents = parseAmountToCents(amountRaw);

  // Default: split among everyone in the household if no participants chosen.
  let splitMemberIds = participantIds;
  if (splitMemberIds.length === 0) {
    const members = await prisma.member.findMany({
      where: { householdId },
      select: { id: true },
    });
    splitMemberIds = members.map((m) => m.id);
  }
  if (splitMemberIds.length === 0) {
    throw new Error("Add at least one member before adding an expense.");
  }

  const shares = splitEvenly(amountCents, splitMemberIds.length);

  await prisma.expense.create({
    data: {
      description,
      amount: amountCents,
      householdId,
      paidById,
      splits: {
        create: splitMemberIds.map((memberId, index) => ({
          memberId,
          amount: shares[index],
        })),
      },
    },
  });

  revalidatePath(`/household/${householdId}`);
}

export async function deleteExpense(formData: FormData) {
  const householdId = String(formData.get("householdId") ?? "");
  const expenseId = String(formData.get("expenseId") ?? "");
  if (!expenseId) throw new Error("Missing expense.");
  await prisma.expense.delete({ where: { id: expenseId } });
  revalidatePath(`/household/${householdId}`);
}
