"use client";

import { useMemo, useState } from "react";

import { roundUpToDollar } from "@/lib/finance/format";
import type { DashboardUser, DailyExpenseItem } from "@/lib/finance/types";

const CATEGORY_OPTIONS = [
  "Groceries",
  "Dining",
  "Gas",
  "Shopping",
  "Entertainment",
  "Health & Fitness",
  "Home",
  "Transportation",
  "Gifts",
  "Other",
] as const;

type AddExpenseModalProps = {
  isOpen: boolean;
  users: DashboardUser[];
  onClose: () => void;
  onCreate: (payload: {
    amount: number;
    category: string;
    note?: string;
    createdBy: number;
  }) => Promise<DailyExpenseItem | null>;
};

export function AddExpenseModal({ isOpen, users, onClose, onCreate }: AddExpenseModalProps) {
  const defaultUser = useMemo(() => users[0]?.id ?? 0, [users]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [createdBy, setCreatedBy] = useState(defaultUser);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const parsedAmount = roundUpToDollar(Number(amount));
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    if (!category.trim()) {
      setError("Category is required.");
      return;
    }

    setSaving(true);
    const result = await onCreate({
      amount: parsedAmount,
      category: category.trim(),
      note: note.trim() || undefined,
      createdBy: createdBy || defaultUser,
    });
    setSaving(false);

    if (!result) {
      setError("Could not save expense.");
      return;
    }

    setAmount("");
    setCategory("");
    setNote("");
    onClose();
  }

  return (
    <>
      <div
        onClick={onClose}
        className={[
          "fixed inset-0 z-40 bg-black/35 transition-opacity",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        aria-hidden="true"
      />
      <section
        className={[
          "fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] rounded-t-3xl border border-zinc-200 bg-white px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl transition-transform duration-300 dark:border-zinc-700 dark:bg-zinc-900",
          isOpen ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Add expense"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Add Expense</h2>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Amount</span>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              onBlur={() => {
                const parsedAmount = Number(amount);
                if (!Number.isNaN(parsedAmount) && parsedAmount > 0) {
                  setAmount(roundUpToDollar(parsedAmount).toString());
                }
              }}
              className="mt-1 h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 outline-none ring-[var(--accent)]/20 focus:ring-4 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
              placeholder="0"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-1 h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none ring-[var(--accent)]/20 focus:ring-4 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
              required
            >
              <option value="" disabled>
                Select a category
              </option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Note</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="mt-1 min-h-24 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 outline-none ring-[var(--accent)]/20 focus:ring-4 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
              placeholder="Optional"
              maxLength={300}
            />
          </label>

          <div className="grid grid-cols-1 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Added by</span>
              <select
                value={createdBy || defaultUser}
                onChange={(event) => setCreatedBy(Number(event.target.value))}
                className="mt-1 h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none ring-[var(--accent)]/20 focus:ring-4 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="h-12 w-full rounded-xl bg-[var(--accent)] text-base font-semibold text-white shadow-lg shadow-sky-200 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save Expense"}
          </button>
        </form>
      </section>
    </>
  );
}
