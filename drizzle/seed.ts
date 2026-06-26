import { config as loadEnv } from "dotenv";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import { households, income, monthlyExpenses, users } from "../lib/db/schema";

loadEnv({ path: ".env.local" });
loadEnv();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

const db = drizzle(neon(databaseUrl));

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

async function syncDefaultMonthlyExpenses(householdId: number) {
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

function getCurrentMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

async function ensureHousehold() {
  const existing = await db.select().from(households).limit(1);

  if (existing[0]) {
    await syncDefaultMonthlyExpenses(existing[0].id);
    return existing[0].id;
  }

  const [created] = await db
    .insert(households)
    .values({ name: "Our Household" })
    .returning({ id: households.id });

  await db.insert(users).values(
    DEFAULT_USERS.map((item) => ({
      householdId: created.id,
      name: item.name,
      email: item.email,
    })),
  );

  await db.insert(monthlyExpenses).values(
    DEFAULT_MONTHLY_EXPENSES.map((item) => ({
      householdId: created.id,
      name: item.name,
      amount: "0",
      sortOrder: item.sortOrder,
    })),
  );

  await syncDefaultMonthlyExpenses(created.id);

  return created.id;
}

async function seed() {
  const householdId = await ensureHousehold();
  const month = getCurrentMonthKey();

  const existingIncome = await db
    .select({ id: income.id })
    .from(income)
    .where(and(eq(income.householdId, householdId), eq(income.month, month)))
    .limit(1);

  if (!existingIncome[0]) {
    await db.insert(income).values({ householdId, month, amount: "0" });
  }

  console.log("Seed complete.");
}

seed().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
