import { and, eq, lt } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db/client";
import { dailyExpenses } from "@/lib/db/schema";
import { ensureHousehold, getCurrentBudgetCycleKey } from "@/lib/finance/data";

const BUDGET_ROLLOVER_DAY = 23;

function getBudgetCycleKey(dateStr: string): string {
  const parts = dateStr.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (day >= BUDGET_ROLLOVER_DAY) {
    return `${year}-${String(month).padStart(2, "0")}`;
  }

  const prevDate = new Date(year, month - 2, 1);
  const py = prevDate.getFullYear();
  const pm = prevDate.getMonth() + 1;
  return `${py}-${String(pm).padStart(2, "0")}`;
}

export type HistoryMonth = {
  cycleKey: string;
  label: string;
  total: number;
  categories: { name: string; amount: number }[];
};

export async function GET() {
  const { householdId } = await ensureHousehold();
  const currentCycle = getCurrentBudgetCycleKey();
  const [yearStr, monthStr] = currentCycle.split("-");
  const cycleStartDate = `${yearStr}-${monthStr}-${String(BUDGET_ROLLOVER_DAY).padStart(2, "0")}`;

  const rows = await db
    .select({
      amount: dailyExpenses.amount,
      category: dailyExpenses.category,
      dateAdded: dailyExpenses.dateAdded,
    })
    .from(dailyExpenses)
    .where(
      and(
        eq(dailyExpenses.householdId, householdId),
        lt(dailyExpenses.dateAdded, cycleStartDate),
      ),
    );

  const cycleMap = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const cycleKey = getBudgetCycleKey(row.dateAdded);
    if (!cycleMap.has(cycleKey)) {
      cycleMap.set(cycleKey, new Map());
    }
    const catMap = cycleMap.get(cycleKey)!;
    const amount = Number.parseFloat(String(row.amount));
    catMap.set(row.category, (catMap.get(row.category) ?? 0) + amount);
  }

  const months: HistoryMonth[] = Array.from(cycleMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cycleKey, catMap]) => {
      const [y, m] = cycleKey.split("-");
      const date = new Date(Number(y), Number(m) - 1, 1);
      const label = date.toLocaleString("en-US", { month: "short", year: "2-digit" });
      const categories = Array.from(catMap.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);
      const total = categories.reduce((s, c) => s + c.amount, 0);
      return { cycleKey, label, total, categories };
    });

  return NextResponse.json({ months });
}
