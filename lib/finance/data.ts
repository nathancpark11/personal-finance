import { and, asc, desc, eq, gte, lt, ne } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  dailyExpenses,
  households,
  income,
  monthlyExpenses,
  users,
} from "@/lib/db/schema";
import type { DashboardData } from "@/lib/finance/types";

const DEFAULT_HOUSEHOLD_NAME = "Our Household";

const DEFAULT_USERS = [
  { name: "Nathan", email: "partner1@example.com" },
  { name: "Tatyana", email: "partner2@example.com" },
];

const DEFAULT_MONTHLY_EXPENSES = [
  { name: "Rent", sortOrder: 1 },
  { name: "Tithe", sortOrder: 2 },
  { name: "Savings", sortOrder: 3 },
  { name: "Car Insurance", sortOrder: 4 },
  { name: "Electricity", sortOrder: 5 },
  { name: "Water", sortOrder: 6 },
  { name: "Internet", sortOrder: 7 },
  { name: "Cell Phone", sortOrder: 8 },
  { name: "Subscriptions", sortOrder: 9 },
] as const;

const TITHE_EXPENSE_NAME = "Tithe";

function calculateTithe(totalIncome: number): number {
  return Number((totalIncome * 0.1).toFixed(2));
}

export function getCurrentMonthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function monthRange(monthKey: string): { start: string; end: string } {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function parseAmount(value: string | number): number {
  return typeof value === "number" ? value : Number.parseFloat(value);
}

async function syncDefaultUserNames(householdId: number): Promise<void> {
  await Promise.all(
    DEFAULT_USERS.map((user) =>
      db
        .update(users)
        .set({ name: user.name })
        .where(
          and(
            eq(users.householdId, householdId),
            eq(users.email, user.email),
            ne(users.name, user.name),
          ),
        ),
    ),
  );
}

async function syncDefaultMonthlyExpenses(householdId: number): Promise<void> {
  const existingMonthly = await db
    .select({ name: monthlyExpenses.name })
    .from(monthlyExpenses)
    .where(eq(monthlyExpenses.householdId, householdId));

  const existingNames = new Set(existingMonthly.map((item) => item.name));
  const missingDefaults = DEFAULT_MONTHLY_EXPENSES.filter(
    (item) => !existingNames.has(item.name),
  );

  if (missingDefaults.length === 0) {
    return;
  }

  await db
    .insert(monthlyExpenses)
    .values(
      missingDefaults.map((item) => ({
        householdId,
        name: item.name,
        amount: "0",
        sortOrder: item.sortOrder,
      })),
    )
    .onConflictDoNothing({
      target: [monthlyExpenses.householdId, monthlyExpenses.name],
    });
}

export async function ensureHousehold(): Promise<{ householdId: number }> {
  const existing = await db.select().from(households).limit(1);

  if (existing[0]) {
    await syncDefaultUserNames(existing[0].id);
    await syncDefaultMonthlyExpenses(existing[0].id);
    return { householdId: existing[0].id };
  }

  const [createdHousehold] = await db
    .insert(households)
    .values({ name: DEFAULT_HOUSEHOLD_NAME })
    .returning({ id: households.id });

  await db.insert(users).values(
    DEFAULT_USERS.map((user) => ({
      householdId: createdHousehold.id,
      name: user.name,
      email: user.email,
    })),
  );

  await syncDefaultUserNames(createdHousehold.id);

  await db.insert(monthlyExpenses).values(
    DEFAULT_MONTHLY_EXPENSES.map((expense) => ({
      householdId: createdHousehold.id,
      name: expense.name,
      amount: "0",
      sortOrder: expense.sortOrder,
    })),
  );

  await syncDefaultMonthlyExpenses(createdHousehold.id);

  return { householdId: createdHousehold.id };
}

export async function getDashboardData(month = getCurrentMonthKey()): Promise<DashboardData> {
  const { householdId } = await ensureHousehold();
  const { start, end } = monthRange(month);

  const householdUsers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.householdId, householdId))
    .orderBy(asc(users.id));

  const monthlyRows = await db
    .select({
      id: monthlyExpenses.id,
      name: monthlyExpenses.name,
      amount: monthlyExpenses.amount,
      sortOrder: monthlyExpenses.sortOrder,
    })
    .from(monthlyExpenses)
    .where(eq(monthlyExpenses.householdId, householdId))
    .orderBy(asc(monthlyExpenses.sortOrder), asc(monthlyExpenses.id));

  const [incomeRow] = await db
    .select({ id: income.id, amount: income.amount })
    .from(income)
    .where(and(eq(income.householdId, householdId), eq(income.month, month)))
    .limit(1);

  const dailyRows = await db
    .select({
      id: dailyExpenses.id,
      amount: dailyExpenses.amount,
      category: dailyExpenses.category,
      note: dailyExpenses.note,
      dateAdded: dailyExpenses.dateAdded,
      createdBy: dailyExpenses.createdBy,
      createdByName: users.name,
    })
    .from(dailyExpenses)
    .innerJoin(users, eq(users.id, dailyExpenses.createdBy))
    .where(
      and(
        eq(dailyExpenses.householdId, householdId),
        gte(dailyExpenses.dateAdded, start),
        lt(dailyExpenses.dateAdded, end),
      ),
    )
    .orderBy(desc(dailyExpenses.dateAdded), desc(dailyExpenses.id));

  const totalIncome = incomeRow ? parseAmount(incomeRow.amount) : 0;
  const titheAmount = calculateTithe(totalIncome);

  const monthlyItems = monthlyRows.map((row) => ({
    id: row.id,
    name: row.name,
    amount:
      row.name === TITHE_EXPENSE_NAME ? titheAmount : parseAmount(row.amount),
    sortOrder: row.sortOrder,
  }));

  const dailyItems = dailyRows.map((row) => ({
    id: row.id,
    amount: parseAmount(row.amount),
    category: row.category,
    note: row.note,
    dateAdded: row.dateAdded,
    createdBy: row.createdBy,
    createdByName: row.createdByName,
  }));

  const necessityExpenses = monthlyItems.reduce((sum, item) => sum + item.amount, 0);
  const totalDailyExpenses = dailyItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    householdId,
    month,
    users: householdUsers,
    income: totalIncome,
    monthlyExpenses: monthlyItems,
    dailyExpenses: dailyItems,
    totals: {
      necessityExpenses,
      dailyExpenses: totalDailyExpenses,
      remainingToSpend: totalIncome - necessityExpenses - totalDailyExpenses,
    },
  };
}
