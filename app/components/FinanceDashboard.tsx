"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AddExpenseModal } from "@/app/components/AddExpenseModal";
import { DailyExpensesList } from "@/app/components/DailyExpensesList";
import { HeaderSummary } from "@/app/components/HeaderSummary";
import { MonthlyExpensesList } from "@/app/components/MonthlyExpensesList";
import { SettingsPanel } from "@/app/components/SettingsPanel";
import { SubscriptionsCard } from "@/app/components/SubscriptionsCard";
import type { DashboardData, DailyExpenseItem } from "@/lib/finance/types";

type FinanceDashboardProps = {
  initialData: DashboardData;
};

const TITHE_EXPENSE_NAME = "Tithe";
const SUBSCRIPTIONS_ANCHOR_NAME = "Subscriptions";

function nextSubscriptionName(items: { name: string }[]): string {
  let maxNumber = 0;

  for (const item of items) {
    const match = item.name.trim().match(/^subscription\s+(\d+)$/i);
    if (!match) continue;

    const parsed = Number(match[1]);
    if (!Number.isNaN(parsed)) {
      maxNumber = Math.max(maxNumber, parsed);
    }
  }

  return `Subscription ${maxNumber + 1}`;
}

function calculateTithe(totalIncome: number): number {
  return Number((totalIncome * 0.1).toFixed(2));
}

function recalculate(data: DashboardData): DashboardData {
  const titheAmount = calculateTithe(data.income);
  const monthlyExpenses = data.monthlyExpenses.map((item) =>
    item.name === TITHE_EXPENSE_NAME ? { ...item, amount: titheAmount } : item,
  );
  const necessityExpenses = monthlyExpenses.reduce((sum, item) => sum + item.amount, 0);
  const totalDaily = data.dailyExpenses.reduce((sum, item) => sum + item.amount, 0);

  return {
    ...data,
    monthlyExpenses,
    totals: {
      necessityExpenses,
      dailyExpenses: totalDaily,
      remainingToSpend: data.income - necessityExpenses - totalDaily,
    },
  };
}

export function FinanceDashboard({ initialData }: FinanceDashboardProps) {
  const router = useRouter();
  const [isAddSheetOpen, setAddSheetOpen] = useState(false);
  const [data, setData] = useState(initialData);
  const [addingSubscription, setAddingSubscription] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date());

  useEffect(() => {
    setData(initialData);
    setLastUpdatedAt(new Date());
  }, [initialData]);

  const monthLabel = useMemo(() => {
    const [year, month] = data.month.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString("en-US", { month: "long", year: "numeric" });
  }, [data.month]);

  const subscriptionsExpenses = useMemo(
    () => {
      const anchor = data.monthlyExpenses.find(
        (item) => item.name.trim().toLowerCase() === SUBSCRIPTIONS_ANCHOR_NAME.toLowerCase(),
      );

      if (!anchor) {
        return [];
      }

      return data.monthlyExpenses.filter((item) => item.sortOrder >= anchor.sortOrder);
    },
    [data.monthlyExpenses],
  );

  const monthlyExpensesWithoutSubscriptions = useMemo(
    () => {
      const anchor = data.monthlyExpenses.find(
        (item) => item.name.trim().toLowerCase() === SUBSCRIPTIONS_ANCHOR_NAME.toLowerCase(),
      );

      if (!anchor) {
        return data.monthlyExpenses;
      }

      return data.monthlyExpenses.filter((item) => item.sortOrder < anchor.sortOrder);
    },
    [data.monthlyExpenses],
  );

  async function saveIncome(amount: number) {
    setData((previous) => recalculate({ ...previous, income: amount }));

    const response = await fetch("/api/income", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, month: data.month }),
    });

    if (response.ok) {
      setLastUpdatedAt(new Date());
    }

    router.refresh();
  }

  async function saveMonthlyExpense(expenseId: number, amount: number) {
    setData((previous) =>
      recalculate({
        ...previous,
        monthlyExpenses: previous.monthlyExpenses.map((item) =>
          item.id === expenseId ? { ...item, amount } : item,
        ),
      }),
    );

    const response = await fetch(`/api/monthly-expenses/${expenseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });

    if (response.ok) {
      setLastUpdatedAt(new Date());
    }

    router.refresh();
  }

  async function renameMonthlyExpense(expenseId: number, name: string) {
    setData((previous) =>
      recalculate({
        ...previous,
        monthlyExpenses: previous.monthlyExpenses.map((item) =>
          item.id === expenseId ? { ...item, name } : item,
        ),
      }),
    );

    const response = await fetch(`/api/monthly-expenses/${expenseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (response.ok) {
      setLastUpdatedAt(new Date());
    }

    router.refresh();
  }

  async function deleteMonthlyExpense(expenseId: number) {
    setData((previous) =>
      recalculate({
        ...previous,
        monthlyExpenses: previous.monthlyExpenses.filter((item) => item.id !== expenseId),
      }),
    );

    const response = await fetch(`/api/monthly-expenses/${expenseId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setLastUpdatedAt(new Date());
    }

    router.refresh();
  }

  async function addSubscriptionLine() {
    setAddingSubscription(true);

    const name = nextSubscriptionName(data.monthlyExpenses);

    const response = await fetch("/api/monthly-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, amount: 0 }),
    });

    setAddingSubscription(false);

    if (!response.ok) {
      return;
    }

    const body = (await response.json()) as {
      expense: { id: number; name: string; amount: number; sortOrder: number };
    };

    setData((previous) =>
      recalculate({
        ...previous,
        monthlyExpenses: [...previous.monthlyExpenses, body.expense].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.id - b.id,
        ),
      }),
    );
    setLastUpdatedAt(new Date());
    router.refresh();
  }

  async function createDailyExpense(payload: {
    amount: number;
    category: string;
    note?: string;
    createdBy: number;
  }): Promise<DailyExpenseItem | null> {
    const response = await fetch("/api/daily-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as { expense: DailyExpenseItem };

    setData((previous) =>
      recalculate({
        ...previous,
        dailyExpenses: [body.expense, ...previous.dailyExpenses],
      }),
    );
    setLastUpdatedAt(new Date());

    router.refresh();
    return body.expense;
  }

  async function deleteDailyExpense(expenseId: number) {
    setData((previous) =>
      recalculate({
        ...previous,
        dailyExpenses: previous.dailyExpenses.filter((item) => item.id !== expenseId),
      }),
    );

    const response = await fetch(`/api/daily-expenses/${expenseId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setLastUpdatedAt(new Date());
    }

    router.refresh();
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] pb-[calc(env(safe-area-inset-bottom)+6rem)] md:max-w-6xl">
      <header className="relative flex items-center justify-between px-6 pt-5 pb-2 md:px-4">
        <p className="absolute top-2 right-6 text-xs text-zinc-500 dark:text-zinc-400 md:right-4">
          Updated {lastUpdatedAt.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
        </p>
        <div className="w-10" />
        <div className="text-center">
          <p className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Our Finances</p>
          <p className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">Tracking Period: {monthLabel}</p>
        </div>
        <SettingsPanel users={data.users} onSettingsSaved={() => router.refresh()} />
      </header>

      <HeaderSummary
        month={data.month}
        income={data.income}
        necessityExpenses={data.totals.necessityExpenses}
        dailyExpenses={data.totals.dailyExpenses}
        remainingToSpend={data.totals.remainingToSpend}
        onSaveIncome={saveIncome}
      />

      <main className="mt-4 grid grid-cols-1 gap-5 px-4 md:grid-cols-2 md:items-start">
        <DailyExpensesList items={data.dailyExpenses} onDelete={deleteDailyExpense} />
        <MonthlyExpensesList items={monthlyExpensesWithoutSubscriptions} onSave={saveMonthlyExpense} />
        <SubscriptionsCard
          items={subscriptionsExpenses}
          onSave={saveMonthlyExpense}
          onRename={renameMonthlyExpense}
          onDelete={deleteMonthlyExpense}
          onAdd={addSubscriptionLine}
          adding={addingSubscription}
        />
      </main>

      <button
        type="button"
        onClick={() => setAddSheetOpen(true)}
        className="fixed inset-x-0 bottom-[env(safe-area-inset-bottom)] z-30 mx-auto h-16 w-[calc(100%-2.6rem)] max-w-[390px] rounded-full bg-[linear-gradient(90deg,#1d4ed8_0%,#1775ff_100%)] text-3xl font-semibold text-white shadow-[0_22px_40px_-24px_rgba(29,78,216,0.9)] md:bottom-6"
      >
        + Add Expense
      </button>

      <AddExpenseModal
        isOpen={isAddSheetOpen}
        users={data.users}
        onClose={() => setAddSheetOpen(false)}
        onCreate={createDailyExpense}
      />
    </div>
  );
}
