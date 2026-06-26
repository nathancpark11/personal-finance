"use client";

import { useEffect, useState } from "react";

import { asCurrencyRoundedUp, roundUpToDollar } from "@/lib/finance/format";
import type { MonthlyExpenseItem } from "@/lib/finance/types";

type SubscriptionsCardProps = {
  items: MonthlyExpenseItem[];
  onSave: (expenseId: number, amount: number) => Promise<void>;
  onRename: (expenseId: number, name: string) => Promise<void>;
  onDelete: (expenseId: number) => Promise<void>;
  onAdd: () => Promise<void>;
  adding: boolean;
};

export function SubscriptionsCard({
  items,
  onSave,
  onRename,
  onDelete,
  onAdd,
  adding,
}: SubscriptionsCardProps) {
  const visibleItems = items.filter(
    (item) => item.name.trim().toLowerCase() !== "subscriptions",
  );

  const [drafts, setDrafts] = useState<Record<number, string>>(() =>
    Object.fromEntries(items.map((item) => [item.id, roundUpToDollar(item.amount).toString()])),
  );
  const [nameDrafts, setNameDrafts] = useState<Record<number, string>>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.name])),
  );

  const headerTotal = visibleItems.reduce((sum, item) => {
    const parsedDraft = roundUpToDollar(Number(drafts[item.id] ?? item.amount));
    if (Number.isNaN(parsedDraft) || parsedDraft < 0) {
      return sum + item.amount;
    }

    return sum + parsedDraft;
  }, 0);

  useEffect(() => {
    setDrafts(
      Object.fromEntries(items.map((item) => [item.id, roundUpToDollar(item.amount).toString()])),
    );
    setNameDrafts(Object.fromEntries(items.map((item) => [item.id, item.name])));
  }, [items]);

  async function save(expenseId: number) {
    const item = visibleItems.find((subscription) => subscription.id === expenseId);
    if (!item) return;

    const parsed = roundUpToDollar(Number(drafts[expenseId]));

    if (Number.isNaN(parsed) || parsed < 0) {
      setDrafts((previous) => ({
        ...previous,
        [expenseId]: roundUpToDollar(item.amount).toString(),
      }));
      return;
    }

    setDrafts((previous) => ({ ...previous, [expenseId]: parsed.toString() }));
    await onSave(expenseId, parsed);
  }

  async function saveName(expenseId: number) {
    const item = visibleItems.find((subscription) => subscription.id === expenseId);
    if (!item) return;

    const nextName = (nameDrafts[expenseId] ?? item.name).trim();
    if (!nextName) {
      setNameDrafts((previous) => ({ ...previous, [expenseId]: item.name }));
      return;
    }

    setNameDrafts((previous) => ({ ...previous, [expenseId]: nextName }));

    if (nextName === item.name) {
      return;
    }

    await onRename(expenseId, nextName);
  }
  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-2">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">Subscriptions</h2>
        <p className="text-sm font-semibold text-zinc-700">{asCurrencyRoundedUp(headerTotal)}</p>
      </div>

      <div className="overflow-hidden rounded-[1.35rem] border border-zinc-200/80 bg-white shadow-[0_14px_34px_-24px_rgba(15,23,42,0.36)]">
        {visibleItems.length > 0 ? (
          visibleItems.map((item, index) => (
            <div
              key={item.id}
              className={[
                "flex items-center justify-between gap-3 px-3 py-2.5",
                index !== visibleItems.length - 1 ? "border-b border-zinc-200/80" : "",
              ].join(" ")}
            >
              <input
                type="text"
                value={nameDrafts[item.id] ?? item.name}
                onChange={(event) =>
                  setNameDrafts((previous) => ({
                    ...previous,
                    [item.id]: event.target.value,
                  }))
                }
                onBlur={() => {
                  void saveName(item.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 text-xl leading-none font-semibold text-zinc-900 outline-none focus:border-zinc-300 focus:bg-white"
                maxLength={80}
              />

              <div className="flex shrink-0 items-center gap-2">
                <div className="w-32 shrink-0">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={drafts[item.id] ?? ""}
                  onChange={(event) =>
                    setDrafts((previous) => ({
                      ...previous,
                      [item.id]: event.target.value,
                    }))
                  }
                  onBlur={() => {
                    void save(item.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                  className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-right text-2xl font-semibold tabular-nums text-zinc-900 outline-none ring-[var(--accent)]/20 focus:ring-4"
                />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void onDelete(item.id);
                  }}
                  className="h-6 w-6 rounded-md border border-rose-200 text-xs leading-none font-semibold text-rose-600"
                  aria-label={`Delete ${nameDrafts[item.id] ?? item.name}`}
                >
                  x
                </button>
              </div>
            </div>
          ))
        ) : null}

        <div
          className={[
            "px-3 py-2.5",
            visibleItems.length > 0 ? "border-t border-zinc-200/80" : "",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={() => {
              void onAdd();
            }}
            disabled={adding}
            className="h-9 w-full rounded-lg border border-zinc-300 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {adding ? "Adding..." : "+ Add Subscription"}
          </button>
        </div>
      </div>
    </section>
  );
}
