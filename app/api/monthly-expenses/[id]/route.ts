import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { monthlyExpenses } from "@/lib/db/schema";
import { ensureHousehold } from "@/lib/finance/data";

const TITHE_EXPENSE_NAME = "Tithe";
const SUBSCRIPTIONS_ANCHOR_NAME = "Subscriptions";

const schema = z.object({
  amount: z.number().min(0).max(100000000).optional(),
  name: z.string().trim().min(1).max(80).optional(),
}).refine((value) => value.amount !== undefined || value.name !== undefined, {
  message: "Provide at least one field to update",
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const parsedId = Number.parseInt(id, 10);

    if (Number.isNaN(parsedId)) {
      return NextResponse.json({ error: "Invalid expense id" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = schema.parse(body);
    const { householdId } = await ensureHousehold();

    const [expenseRow] = await db
      .select({ name: monthlyExpenses.name, sortOrder: monthlyExpenses.sortOrder })
      .from(monthlyExpenses)
      .where(
        and(
          eq(monthlyExpenses.id, parsedId),
          eq(monthlyExpenses.householdId, householdId),
        ),
      )
      .limit(1);

    if (!expenseRow) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    if (expenseRow.name === TITHE_EXPENSE_NAME) {
      return NextResponse.json(
        { error: "Tithe is automatically calculated from income" },
        { status: 400 },
      );
    }

    if (parsed.name !== undefined) {
      const [duplicate] = await db
        .select({ id: monthlyExpenses.id })
        .from(monthlyExpenses)
        .where(
          and(
            eq(monthlyExpenses.householdId, householdId),
            eq(monthlyExpenses.name, parsed.name),
            ne(monthlyExpenses.id, parsedId),
          ),
        )
        .limit(1);

      if (duplicate) {
        return NextResponse.json({ error: "Expense name already exists" }, { status: 409 });
      }
    }

    const updates: { amount?: string; name?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (parsed.amount !== undefined) {
      updates.amount = parsed.amount.toFixed(2);
    }

    if (parsed.name !== undefined) {
      updates.name = parsed.name;
    }

    await db
      .update(monthlyExpenses)
      .set(updates)
      .where(
        and(
          eq(monthlyExpenses.id, parsedId),
          eq(monthlyExpenses.householdId, householdId),
        ),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update monthly expense", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const parsedId = Number.parseInt(id, 10);

    if (Number.isNaN(parsedId)) {
      return NextResponse.json({ error: "Invalid expense id" }, { status: 400 });
    }

    const { householdId } = await ensureHousehold();

    const [expenseRow] = await db
      .select({ name: monthlyExpenses.name, sortOrder: monthlyExpenses.sortOrder })
      .from(monthlyExpenses)
      .where(
        and(
          eq(monthlyExpenses.id, parsedId),
          eq(monthlyExpenses.householdId, householdId),
        ),
      )
      .limit(1);

    if (!expenseRow) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const [subscriptionsAnchor] = await db
      .select({ sortOrder: monthlyExpenses.sortOrder })
      .from(monthlyExpenses)
      .where(
        and(
          eq(monthlyExpenses.householdId, householdId),
          eq(monthlyExpenses.name, SUBSCRIPTIONS_ANCHOR_NAME),
        ),
      )
      .limit(1);

    if (!subscriptionsAnchor) {
      return NextResponse.json(
        { error: "Subscriptions section not found" },
        { status: 400 },
      );
    }

    const isAnchor = expenseRow.name.trim().toLowerCase() === SUBSCRIPTIONS_ANCHOR_NAME.toLowerCase();
    const isInSubscriptionsSection = expenseRow.sortOrder >= subscriptionsAnchor.sortOrder;

    if (isAnchor || !isInSubscriptionsSection) {
      return NextResponse.json(
        { error: "Only added subscription lines can be deleted" },
        { status: 400 },
      );
    }

    await db
      .delete(monthlyExpenses)
      .where(
        and(
          eq(monthlyExpenses.id, parsedId),
          eq(monthlyExpenses.householdId, householdId),
        ),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete monthly expense", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
