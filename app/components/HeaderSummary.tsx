"use client";

import { useMemo, useState } from "react";

import { asCurrencyRoundedUp, roundUpToDollar } from "@/lib/finance/format";

type HeaderSummaryProps = {
  month: string;
  income: number;
  necessityExpenses: number;
  dailyExpenses: number;
  remainingToSpend: number;
  onSaveIncome: (amount: number) => Promise<void>;
};

function getDaysRemainingInPeriod(month: string): number {
  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  const periodEndDay = 23;

  if (Number.isNaN(year) || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return 1;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const periodStart = new Date(year, monthIndex, 1);
  const periodEnd = new Date(year, monthIndex, periodEndDay);

  if (today < periodStart) {
    return periodEndDay;
  }

  if (today > periodEnd) {
    return 1;
  }

  const millisecondsInDay = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.floor((periodEnd.getTime() - today.getTime()) / millisecondsInDay) + 1);
}

export function HeaderSummary({
  month,
  income,
  necessityExpenses,
  dailyExpenses,
  remainingToSpend,
  onSaveIncome,
}: HeaderSummaryProps) {
  const [incomeDraft, setIncomeDraft] = useState(roundUpToDollar(income).toString());
  const [saving, setSaving] = useState(false);
  const [isEditingIncome, setIsEditingIncome] = useState(false);

  const daysRemainingInPeriod = useMemo(() => getDaysRemainingInPeriod(month), [month]);
  const spendPerDay = useMemo(
    () => remainingToSpend / Math.max(1, daysRemainingInPeriod),
    [remainingToSpend, daysRemainingInPeriod],
  );

  function beginIncomeEdit() {
    if (isEditingIncome || saving) {
      return;
    }

    setIncomeDraft(roundUpToDollar(income).toString());
    setIsEditingIncome(true);
  }

  async function saveIncome(nextValue: string) {
    const amount = roundUpToDollar(Number(nextValue));

    if (Number.isNaN(amount) || amount < 0) {
      setIncomeDraft(roundUpToDollar(income).toString());
      return;
    }

    setSaving(true);
    await onSaveIncome(amount);
    setSaving(false);
    setIsEditingIncome(false);
  }

  return (
    <section className="sticky top-0 z-20 bg-[var(--app-bg)]/94 px-4 pt-4 pb-2 backdrop-blur-md">
      <div className="rounded-[1.75rem] border border-zinc-200/80 bg-white shadow-[0_14px_36px_-24px_rgba(15,23,42,0.36)] dark:border-zinc-700/80 dark:bg-zinc-900 dark:shadow-[0_14px_36px_-24px_rgba(0,0,0,0.6)]">
        <div className="px-5 pt-6 pb-5 text-center">
          <p className="text-[0.72rem] font-semibold tracking-[0.16em] text-zinc-500 uppercase dark:text-zinc-400">
            Remaining To Spend
          </p>
          <p className="mt-2 text-5xl font-semibold leading-none tracking-tight tabular-nums text-[var(--positive)]">
          {asCurrencyRoundedUp(remainingToSpend)}
          </p>
          <p className="mt-2 text-xs font-medium italic text-zinc-500 dark:text-zinc-400">
            {asCurrencyRoundedUp(spendPerDay)} per day ({daysRemainingInPeriod} day{daysRemainingInPeriod === 1 ? "" : "s"} left)
          </p>
        </div>

        <div className="grid grid-cols-3 border-t border-zinc-200/80 dark:border-zinc-700/80">
          <div
            className={[
              "flex flex-col items-center justify-center px-3 py-4 text-center",
              !isEditingIncome && !saving ? "cursor-pointer" : "",
            ].join(" ")}
            role="button"
            tabIndex={0}
            aria-label="Edit total income"
            onClick={beginIncomeEdit}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                beginIncomeEdit();
              }
            }}
          >
            <p className="text-[0.68rem] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Total Income</p>
            {isEditingIncome ? (
              <input
                id="income"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={incomeDraft}
                onChange={(event) => setIncomeDraft(event.target.value)}
                onBlur={() => void saveIncome(incomeDraft)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                  if (event.key === "Escape") {
                    setIncomeDraft(roundUpToDollar(income).toString());
                    setIsEditingIncome(false);
                  }
                }}
                className="mt-2 w-24 border-b border-zinc-300 bg-transparent px-1 text-center text-2xl leading-none font-semibold tabular-nums text-zinc-900 outline-none ring-[var(--accent)]/20 focus:ring-2 dark:border-zinc-600 dark:text-zinc-50"
                autoFocus
              />
            ) : (
              <p className="mt-2 text-2xl leading-none font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {asCurrencyRoundedUp(income)}
              </p>
            )}
            {saving || isEditingIncome ? (
              <p className="mt-1 text-xs font-semibold text-[var(--positive)]">
                {saving ? "Saving..." : "Editing..."}
              </p>
            ) : null}
          </div>

          <div className="border-l border-zinc-200/80 px-3 py-4">
            <div className="flex flex-col items-center justify-center text-center">
            <p className="text-[0.68rem] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Monthly</p>
            <p className="mt-2 text-2xl leading-none font-semibold tabular-nums text-rose-700/90">{asCurrencyRoundedUp(necessityExpenses)}</p>
            </div>
          </div>

          <div className="border-l border-zinc-200/80 px-3 py-4">
            <div className="flex flex-col items-center justify-center text-center">
            <p className="text-[0.68rem] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Daily</p>
            <p className="mt-2 text-2xl leading-none font-semibold tabular-nums text-rose-700/90">{asCurrencyRoundedUp(dailyExpenses)}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
