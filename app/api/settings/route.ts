import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { ensureHousehold } from "@/lib/finance/data";

const patchSchema = z.object({
  users: z
    .array(
      z.object({
        id: z.number().int().positive(),
        name: z.string().trim().min(1).max(80),
      }),
    )
    .min(1)
    .max(10),
});

export async function GET() {
  const { householdId } = await ensureHousehold();
  const result = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.householdId, householdId));
  return NextResponse.json({ users: result });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const parsed = patchSchema.parse(body);
    const { householdId } = await ensureHousehold();

    await Promise.all(
      parsed.users.map((u) =>
        db
          .update(users)
          .set({ name: u.name })
          .where(and(eq(users.id, u.id), eq(users.householdId, householdId))),
      ),
    );

    const updated = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.householdId, householdId));

    return NextResponse.json({ users: updated });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
