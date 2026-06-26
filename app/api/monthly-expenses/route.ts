import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { monthlyExpenses } from "@/lib/db/schema";
import { ensureHousehold } from "@/lib/finance/data";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  amount: z.number().min(0).max(100000000).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    const { householdId } = await ensureHousehold();

    const [lastMonthly] = await db
      .select({ sortOrder: monthlyExpenses.sortOrder })
      .from(monthlyExpenses)
      .where(eq(monthlyExpenses.householdId, householdId))
      .orderBy(desc(monthlyExpenses.sortOrder), desc(monthlyExpenses.id))
      .limit(1);

    const nextSortOrder = (lastMonthly?.sortOrder ?? 0) + 1;

    const [created] = await db
      .insert(monthlyExpenses)
      .values({
        householdId,
        name: parsed.name,
        amount: (parsed.amount ?? 0).toFixed(2),
        sortOrder: nextSortOrder,
      })
      .onConflictDoNothing({
        target: [monthlyExpenses.householdId, monthlyExpenses.name],
      })
      .returning({
        id: monthlyExpenses.id,
        name: monthlyExpenses.name,
        amount: monthlyExpenses.amount,
        sortOrder: monthlyExpenses.sortOrder,
      });

    if (!created) {
      const [existing] = await db
        .select({
          id: monthlyExpenses.id,
          name: monthlyExpenses.name,
          amount: monthlyExpenses.amount,
          sortOrder: monthlyExpenses.sortOrder,
        })
        .from(monthlyExpenses)
        .where(
          and(
            eq(monthlyExpenses.householdId, householdId),
            eq(monthlyExpenses.name, parsed.name),
          ),
        )
        .limit(1);

      if (!existing) {
        return NextResponse.json({ error: "Could not create expense" }, { status: 500 });
      }

      return NextResponse.json({
        expense: {
          id: existing.id,
          name: existing.name,
          amount: Number.parseFloat(existing.amount),
          sortOrder: existing.sortOrder,
        },
      });
    }

    return NextResponse.json({
      expense: {
        id: created.id,
        name: created.name,
        amount: Number.parseFloat(created.amount),
        sortOrder: created.sortOrder,
      },
    });
  } catch (error) {
    console.error("Failed to create monthly expense", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
