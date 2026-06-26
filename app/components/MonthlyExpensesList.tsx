"use client";

import { useState } from "react";

import { roundUpToDollar } from "@/lib/finance/format";
import type { MonthlyExpenseItem } from "@/lib/finance/types";

type MonthlyExpensesListProps = {
  items: MonthlyExpenseItem[];
  onSave: (expenseId: number, amount: number) => Promise<void>;
};

const TITHE_EXPENSE_NAME = "Tithe";

export function MonthlyExpensesList({ items, onSave }: MonthlyExpensesListProps) {
  const [drafts, setDrafts] = useState<Record<number, string>>(() =>
    Object.fromEntries(items.map((item) => [item.id, roundUpToDollar(item.amount).toString()])),
  );

  async function save(expenseId: number) {
    const parsed = roundUpToDollar(Number(drafts[expenseId]));

    if (Number.isNaN(parsed) || parsed < 0) {
      setDrafts((previous) => ({
        ...previous,
        [expenseId]:
          roundUpToDollar(items.find((item) => item.id === expenseId)?.amount ?? 0).toString(),
      }));
      return;
    }

    setDrafts((previous) => ({
      ...previous,
      [expenseId]: parsed.toString(),
    }));

    await onSave(expenseId, parsed);
  }

  return (
    <section>
      <div className="mb-3 px-2">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">Monthly</h2>
      </div>

      <div className="overflow-hidden rounded-[1.35rem] border border-zinc-200/80 bg-white shadow-[0_14px_34px_-24px_rgba(15,23,42,0.36)]">
        {items.map((item, index) => {
          const isAutoCalculatedTithe = item.name === TITHE_EXPENSE_NAME;

          return (
          <div
            key={item.id}
            className={[
              "flex items-center justify-between gap-3 px-3 py-2.5",
              index !== items.length - 1 ? "border-b border-zinc-200/80" : "",
            ].join(" ")}
          >
            <div>
              <p className="text-2xl leading-none font-semibold text-zinc-900">{item.name}</p>
              {isAutoCalculatedTithe ? (
                <p className="mt-1 text-xs font-medium text-zinc-500">Auto (10% of income)</p>
              ) : null}
            </div>

            <div className="w-32 shrink-0">
              <input
                type="number"
                min="0"
                step="1"
                readOnly={isAutoCalculatedTithe}
                value={
                  isAutoCalculatedTithe
                    ? roundUpToDollar(item.amount).toString()
                    : (drafts[item.id] ?? "")
                }
                onChange={(event) =>
                  setDrafts((previous) => ({ ...previous, [item.id]: event.target.value }))
                }
                onBlur={() => {
                  if (!isAutoCalculatedTithe) {
                    void save(item.id);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                className={[
                  "h-11 w-full rounded-xl border px-3 text-right text-2xl font-semibold tabular-nums outline-none",
                  isAutoCalculatedTithe
                    ? "border-zinc-200 bg-zinc-50 text-zinc-500"
                    : "border-zinc-300 bg-white text-zinc-900 ring-[var(--accent)]/20 focus:ring-4",
                ].join(" ")}
              />
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}
