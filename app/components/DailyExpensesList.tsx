"use client";

import Image from "next/image";

import type { DailyExpenseItem } from "@/lib/finance/types";
import { asCurrencyRoundedUp } from "@/lib/finance/format";

type DailyExpensesListProps = {
  items: DailyExpenseItem[];
  onDelete: (expenseId: number) => Promise<void>;
};

function normalizeCategoryLabel(category: string): string {
  return category.replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

function formatDateWithoutYear(dateValue: string): string {
  const [year, month, day] = dateValue.split("-").map((value) => Number(value));
  if (!year || !month || !day) {
    return dateValue;
  }

  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function categoryBadge(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes("grocer") || lower.includes("food")) return "bg-emerald-100 text-emerald-700";
  if (lower.includes("dining") || lower.includes("restaurant") || lower.includes("takeout")) {
    return "bg-orange-100 text-orange-700";
  }
  if (lower.includes("gas") || lower.includes("fuel")) return "bg-violet-100 text-violet-700";
  if (lower.includes("shop") || lower.includes("amazon") || lower.includes("target")) {
    return "bg-blue-100 text-blue-700";
  }
  if (lower.includes("entertain") || lower.includes("fun") || lower.includes("movie")) {
    return "bg-pink-100 text-pink-700";
  }
  if (lower.includes("health") || lower.includes("fitness") || lower.includes("gym")) {
    return "bg-teal-100 text-teal-700";
  }
  if (lower.includes("home")) return "bg-amber-100 text-amber-700";
  if (lower.includes("transport") || lower.includes("uber") || lower.includes("parking")) {
    return "bg-indigo-100 text-indigo-700";
  }
  if (lower.includes("gift") || lower.includes("donation")) return "bg-purple-100 text-purple-700";
  if (lower.includes("coffee") || lower.includes("drink")) return "bg-amber-100 text-amber-700";
  return "bg-sky-100 text-sky-700";
}

function categoryIconPath(category: string): string {
  const lower = category.toLowerCase();

  if (lower.includes("grocer") || lower.includes("food")) return "/Groceries.png";
  if (lower.includes("dining") || lower.includes("restaurant") || lower.includes("takeout")) {
    return "/Dining.png";
  }
  if (lower.includes("gas") || lower.includes("fuel")) return "/Gas.png";
  if (lower.includes("shop") || lower.includes("amazon") || lower.includes("target")) {
    return "/Shopping.png";
  }
  if (lower.includes("entertain") || lower.includes("fun") || lower.includes("movie")) {
    return "/Fun.png";
  }
  if (lower.includes("health") || lower.includes("fitness") || lower.includes("gym")) {
    return "/Health.png";
  }
  if (lower.includes("home")) return "/Home.png";
  if (lower.includes("transport") || lower.includes("uber") || lower.includes("parking")) {
    return "/Transportation.png";
  }
  if (lower.includes("gift") || lower.includes("donation")) return "/Gift.png";
  if (lower.includes("other")) return "/Other.png";

  return "/Other.png";
}

export function DailyExpensesList({ items, onDelete }: DailyExpensesListProps) {
  return (
    <section>
      <div className="mb-3 px-2">
        <h2 className="text-4xl font-semibold tracking-tight text-zinc-900">Daily</h2>
      </div>

      <div className="overflow-hidden rounded-[1.65rem] border border-zinc-200/80 bg-white shadow-[0_14px_34px_-24px_rgba(15,23,42,0.36)]">
        {items.length === 0 ? (
          <div className="m-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
            No daily expenses yet. Tap Add Expense to get started.
          </div>
        ) : (
          items.map((item, index) => {
            const categoryLabel = normalizeCategoryLabel(item.category);

            return (
              <article
                key={item.id}
                className={[
                  "px-4 py-3",
                  index !== items.length - 1 ? "border-b border-zinc-200/80" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={[
                        "flex h-12 w-12 items-center justify-center rounded-full",
                        categoryBadge(categoryLabel),
                      ].join(" ")}
                    >
                      <Image
                        src={categoryIconPath(categoryLabel)}
                        alt=""
                        aria-hidden="true"
                        width={30}
                        height={30}
                        className="h-[30px] w-[30px] object-contain mix-blend-multiply"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xl font-semibold text-zinc-900">{categoryLabel}</p>
                      <p className="truncate text-base text-zinc-500">
                        {item.createdByName} - {formatDateWithoutYear(item.dateAdded)}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <div className="flex items-center justify-end gap-2">
                      <p className="text-2xl leading-none font-semibold tabular-nums text-zinc-900">
                        {asCurrencyRoundedUp(item.amount)}
                      </p>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="h-6 w-6 rounded-md border border-rose-200 text-xs leading-none font-semibold text-rose-600"
                      aria-label={`Delete ${categoryLabel} expense`}
                    >
                      x
                    </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}

      </div>
    </section>
  );
}
