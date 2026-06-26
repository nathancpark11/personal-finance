import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    householdId: integer("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    householdIdx: index("users_household_id_idx").on(table.householdId),
    householdEmailUnique: uniqueIndex("users_household_email_uq").on(
      table.householdId,
      table.email,
    ),
  }),
);

export const income = pgTable(
  "income",
  {
    id: serial("id").primaryKey(),
    householdId: integer("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
    month: text("month").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    householdIdx: index("income_household_id_idx").on(table.householdId),
    householdMonthUnique: uniqueIndex("income_household_month_uq").on(
      table.householdId,
      table.month,
    ),
  }),
);

export const monthlyExpenses = pgTable(
  "monthly_expenses",
  {
    id: serial("id").primaryKey(),
    householdId: integer("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    householdIdx: index("monthly_expenses_household_id_idx").on(table.householdId),
    householdNameUnique: uniqueIndex("monthly_expenses_household_name_uq").on(
      table.householdId,
      table.name,
    ),
  }),
);

export const dailyExpenses = pgTable(
  "daily_expenses",
  {
    id: serial("id").primaryKey(),
    householdId: integer("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    category: text("category").notNull(),
    note: text("note"),
    dateAdded: date("date_added").notNull(),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    householdDateIdx: index("daily_expenses_household_date_idx").on(
      table.householdId,
      table.dateAdded,
    ),
    householdIdx: index("daily_expenses_household_id_idx").on(table.householdId),
  }),
);
