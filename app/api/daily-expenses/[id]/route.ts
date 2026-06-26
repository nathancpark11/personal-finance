import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db/client";
import { dailyExpenses } from "@/lib/db/schema";
import { ensureHousehold } from "@/lib/finance/data";

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

    await db
      .delete(dailyExpenses)
      .where(
        and(
          eq(dailyExpenses.id, parsedId),
          eq(dailyExpenses.householdId, householdId),
        ),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete daily expense", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 400 });
  }
}
