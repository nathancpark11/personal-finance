import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { income, monthlyExpenses } from "@/lib/db/schema";
import { ensureHousehold } from "@/lib/finance/data";

const TITHE_EXPENSE_NAME = "Tithe";

function calculateTithe(totalIncome: number): number {
  return Number((totalIncome * 0.1).toFixed(2));
}

const schema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().min(0).max(100000000),
});

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    const { householdId } = await ensureHousehold();

    const existing = await db
      .select({ id: income.id })
      .from(income)
      .where(and(eq(income.householdId, householdId), eq(income.month, parsed.month)))
      .limit(1);

    if (existing[0]) {
      await db
        .update(income)
        .set({ amount: parsed.amount.toFixed(2), updatedAt: new Date() })
        .where(eq(income.id, existing[0].id));
    } else {
      await db.insert(income).values({
        householdId,
        month: parsed.month,
        amount: parsed.amount.toFixed(2),
      });
    }

    await db
      .update(monthlyExpenses)
      .set({ amount: calculateTithe(parsed.amount).toFixed(2), updatedAt: new Date() })
      .where(
        and(
          eq(monthlyExpenses.householdId, householdId),
          eq(monthlyExpenses.name, TITHE_EXPENSE_NAME),
        ),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update income", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
