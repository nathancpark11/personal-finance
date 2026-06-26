"use client";

import { useState } from "react";

import { asCurrencyRoundedUp, roundUpToDollar } from "@/lib/finance/format";

type HeaderSummaryProps = {
  income: number;
  necessityExpenses: number;
  dailyExpenses: number;
  remainingToSpend: number;
  lastUpdatedAt: Date;
  onSaveIncome: (amount: number) => Promise<void>;
};

export function HeaderSummary({
  income,
  necessityExpenses,
  dailyExpenses,
  remainingToSpend,
  lastUpdatedAt,
  onSaveIncome,
}: HeaderSummaryProps) {
  const [incomeDraft, setIncomeDraft] = useState(roundUpToDollar(income).toString());
  const [saving, setSaving] = useState(false);
  const [isEditingIncome, setIsEditingIncome] = useState(false);

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
      <div className="rounded-[1.75rem] border border-zinc-200/80 bg-white shadow-[0_14px_36px_-24px_rgba(15,23,42,0.36)]">
        <div className="px-5 pt-6 pb-5 text-center">
          <p className="text-[0.72rem] font-semibold tracking-[0.16em] text-zinc-500 uppercase">
            Remaining To Spend
          </p>
          <p className="mt-2 text-5xl font-semibold leading-none tracking-tight tabular-nums text-[var(--positive)]">
          {asCurrencyRoundedUp(remainingToSpend)}
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            Updated {lastUpdatedAt.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
          </p>
        </div>

        <div className="grid grid-cols-3 border-t border-zinc-200/80">
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
            <p className="text-[0.68rem] font-semibold tracking-wide text-zinc-500 uppercase">Total Income</p>
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
                className="mt-2 w-24 border-b border-zinc-300 bg-transparent px-1 text-center text-2xl leading-none font-semibold tabular-nums text-zinc-900 outline-none ring-[var(--accent)]/20 focus:ring-2"
                autoFocus
              />
            ) : (
              <p className="mt-2 text-2xl leading-none font-semibold tabular-nums text-zinc-900">
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
            <p className="text-[0.68rem] font-semibold tracking-wide text-zinc-500 uppercase">Monthly</p>
            <p className="mt-2 text-2xl leading-none font-semibold tabular-nums text-rose-700/90">{asCurrencyRoundedUp(necessityExpenses)}</p>
            </div>
          </div>

          <div className="border-l border-zinc-200/80 px-3 py-4">
            <div className="flex flex-col items-center justify-center text-center">
            <p className="text-[0.68rem] font-semibold tracking-wide text-zinc-500 uppercase">Daily</p>
            <p className="mt-2 text-2xl leading-none font-semibold tabular-nums text-rose-700/90">{asCurrencyRoundedUp(dailyExpenses)}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
