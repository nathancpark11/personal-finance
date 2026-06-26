import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { dailyExpenses, users } from "@/lib/db/schema";
import { ensureHousehold } from "@/lib/finance/data";
import { and, eq } from "drizzle-orm";

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

const schema = z.object({
  amount: z.number().min(0.01).max(100000000),
  category: z.string().trim().min(1).max(80),
  note: z.string().trim().max(300).optional(),
  createdBy: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    const dateAdded = todayDateString();
    const { householdId } = await ensureHousehold();

    const creator = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.id, parsed.createdBy), eq(users.householdId, householdId)))
      .limit(1);

    if (!creator[0]) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const [created] = await db
      .insert(dailyExpenses)
      .values({
        householdId,
        amount: parsed.amount.toFixed(2),
        category: parsed.category,
        note: parsed.note || null,
        dateAdded,
        createdBy: parsed.createdBy,
      })
      .returning({
        id: dailyExpenses.id,
        amount: dailyExpenses.amount,
        category: dailyExpenses.category,
        note: dailyExpenses.note,
        dateAdded: dailyExpenses.dateAdded,
        createdBy: dailyExpenses.createdBy,
      });

    return NextResponse.json({
      expense: {
        id: created.id,
        amount: Number.parseFloat(created.amount),
        category: created.category,
        note: created.note,
        dateAdded: created.dateAdded,
        createdBy: created.createdBy,
        createdByName: creator[0].name,
      },
    });
  } catch (error) {
    console.error("Failed to create daily expense", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
