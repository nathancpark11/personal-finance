"use client";

import { useEffect, useState } from "react";

import type { DashboardUser } from "@/lib/finance/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type HistoryCategory = { name: string; amount: number };

type HistoryMonth = {
  cycleKey: string;
  label: string;
  total: number;
  categories: HistoryCategory[];
};

// ── Color palette ──────────────────────────────────────────────────────────────

const PALETTE = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#84cc16",
  "#14b8a6",
  "#a78bfa",
  "#fb923c",
  "#34d399",
  "#60a5fa",
];

// ── Chart helpers ──────────────────────────────────────────────────────────────

function fmtChartAmount(v: number): string {
  if (v === 0) return "$0";
  if (v >= 1000) {
    const k = v / 1000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `$${Math.round(v)}`;
}

const BAR_W = 42;
const BAR_GAP = 14;
const MARGIN = { top: 28, right: 16, bottom: 48, left: 52 };
const CHART_H = 180;
const SVG_H = CHART_H + MARGIN.top + MARGIN.bottom;

// ── HistoryChart ───────────────────────────────────────────────────────────────

function HistoryChart({ months }: { months: HistoryMonth[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (months.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
        No archived periods yet.
      </div>
    );
  }

  // Collect all unique categories ranked by total spend across all months
  const categoryTotals = new Map<string, number>();
  for (const month of months) {
    for (const cat of month.categories) {
      categoryTotals.set(cat.name, (categoryTotals.get(cat.name) ?? 0) + cat.amount);
    }
  }
  const allCategories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  function colorOf(name: string): string {
    const idx = allCategories.indexOf(name);
    return PALETTE[(idx >= 0 ? idx : Math.abs(name.charCodeAt(0))) % PALETTE.length];
  }

  const maxTotal = Math.max(...months.map((m) => m.total), 1);

  // Y-axis: 4 evenly spaced ticks
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount }, (_, i) => (maxTotal * i) / (tickCount - 1));

  const svgWidth = MARGIN.left + months.length * (BAR_W + BAR_GAP) - BAR_GAP + MARGIN.right;

  return (
    <div className="space-y-4">
      {/* Scrollable chart */}
      <div className="overflow-x-auto pb-1">
        <svg
          width={svgWidth}
          height={SVG_H}
          style={{ minWidth: svgWidth, display: "block" }}
          role="img"
          aria-label="Monthly spending history chart"
        >
          {/* Y-axis gridlines + labels */}
          {ticks.map((tick, i) => {
            const y = MARGIN.top + CHART_H - CHART_H * (tick / maxTotal);
            return (
              <g key={i}>
                <line
                  x1={MARGIN.left}
                  x2={svgWidth - MARGIN.right}
                  y1={y}
                  y2={y}
                  className="stroke-zinc-200 dark:stroke-zinc-700"
                  strokeWidth={1}
                />
                <text x={MARGIN.left - 6} y={y + 4} textAnchor="end" fontSize={10} className="fill-zinc-500 dark:fill-zinc-400">
                  {fmtChartAmount(tick)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {months.map((month, i) => {
            const x = MARGIN.left + i * (BAR_W + BAR_GAP);
            const barH = CHART_H * (month.total / maxTotal);

            // Sort segments by global category rank for visual consistency
            const orderedCats = [...month.categories].sort(
              (a, b) => allCategories.indexOf(a.name) - allCategories.indexOf(b.name),
            );

            // Build stacked segments (bottom to top)
            let yOffset = 0;
            const segments = orderedCats.map((cat) => {
              const h = CHART_H * (cat.amount / maxTotal);
              const segY = MARGIN.top + CHART_H - (yOffset + h);
              yOffset += h;
              return { name: cat.name, amount: cat.amount, x, y: segY, height: h };
            });

            const isActive = hovered === i;

            return (
              <g
                key={month.cycleKey}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setHovered(isActive ? null : i)}
                style={{ cursor: "pointer" }}
              >
                {/* Invisible hit area */}
                <rect
                  x={x}
                  y={MARGIN.top}
                  width={BAR_W}
                  height={CHART_H}
                  fill="transparent"
                />

                {/* Stacked segments */}
                {segments.map((seg) => (
                  <rect
                    key={seg.name}
                    x={x}
                    y={seg.y}
                    width={BAR_W}
                    height={Math.max(seg.height, 0)}
                    fill={colorOf(seg.name)}
                    opacity={hovered === null || isActive ? 1 : 0.35}
                    rx={2}
                  />
                ))}

                {/* Total label above bar */}
                {barH > 12 && (
                  <text
                    x={x + BAR_W / 2}
                    y={MARGIN.top + CHART_H - barH - 5}
                    textAnchor="middle"
                    fontSize={9}
                    className="fill-zinc-600 dark:fill-zinc-300"
                    fontWeight={isActive ? "700" : "400"}
                  >
                    {fmtChartAmount(month.total)}
                  </text>
                )}

                {/* Month label below bar */}
                <text
                  x={x + BAR_W / 2}
                  y={MARGIN.top + CHART_H + 16}
                  textAnchor="middle"
                  fontSize={11}
                  className={isActive ? "fill-zinc-900 dark:fill-zinc-50" : "fill-zinc-500 dark:fill-zinc-400"}
                  fontWeight={isActive ? "600" : "400"}
                >
                  {month.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Breakdown tooltip for selected bar */}
      {hovered !== null && months[hovered] && (
        <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            {months[hovered].label}&ensp;·&ensp;
            <span className="text-zinc-500 font-normal dark:text-zinc-400">
              {fmtChartAmount(months[hovered].total)} total
            </span>
          </p>
          <div className="space-y-1.5">
            {[...months[hovered].categories]
              .sort((a, b) => b.amount - a.amount)
              .map((cat) => (
                <div key={cat.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: colorOf(cat.name) }}
                  />
                  <span className="flex-1 text-zinc-600 dark:text-zinc-300">{cat.name}</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-100">{fmtChartAmount(cat.amount)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 pb-2">
        {allCategories.map((name) => (
          <div key={name} className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: colorOf(name) }}
            />
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SettingsContent ────────────────────────────────────────────────────────────

type SettingsContentProps = {
  users: DashboardUser[];
  onSaved: () => void;
};

function SettingsContent({ users, onSaved }: SettingsContentProps) {
  const [theme, setThemeState] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });
  const [names, setNames] = useState<Record<number, string>>(
    () => Object.fromEntries(users.map((u) => [u.id, u.name])),
  );
  const [saving, setSaving] = useState(false);

  function applyTheme(t: "light" | "dark") {
    setThemeState(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    try { localStorage.setItem("theme", t); } catch { /* noop */ }
  }
  const [savedMsg, setSavedMsg] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    setSavedMsg(false);

    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: Object.entries(names).map(([id, name]) => ({ id: Number(id), name })),
      }),
    });

    setSaving(false);

    if (!response.ok) {
      setError("Could not save. Please try again.");
      return;
    }

    setSavedMsg(true);
    onSaved();
    setTimeout(() => setSavedMsg(false), 2500);
  }

  const labels = ["Person 1", "Person 2", "Person 3"];

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Appearance
        </p>
        <div className="flex gap-2">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => applyTheme(t)}
              className={[
                "flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium capitalize transition-colors",
                theme === t
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
              ].join(" ")}
            >
              {t === "light" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" fill="currentColor" />
                  <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" />
                </svg>
              )}
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Partner Names */}
      <div className="space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Partner Names
        </p>
        {users.map((user, idx) => (
          <label key={user.id} className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {labels[idx] ?? `Person ${idx + 1}`}
            </span>
            <input
              type="text"
              value={names[user.id] ?? user.name}
              onChange={(e) => setNames((prev) => ({ ...prev, [user.id]: e.target.value }))}
              className="mt-1.5 h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-blue-400"
            />
          </label>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="h-12 w-full rounded-xl bg-zinc-900 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
      >
        {saving ? "Saving…" : savedMsg ? "Saved!" : "Save Changes"}
      </button>
    </div>
  );
}

// ── SettingsPanel ──────────────────────────────────────────────────────────────

type SettingsPanelProps = {
  users: DashboardUser[];
  onSettingsSaved?: () => void;
};

export function SettingsPanel({ users, onSettingsSaved }: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"history" | "settings">("history");
  const [historyData, setHistoryData] = useState<HistoryMonth[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && tab === "history" && historyData === null && !loadingHistory) {
      setLoadingHistory(true);
      fetch("/api/history")
        .then((r) => r.json())
        .then((body: { months: HistoryMonth[] }) => setHistoryData(body.months ?? []))
        .catch(() => setHistoryData([]))
        .finally(() => setLoadingHistory(false));
    }
  }, [isOpen, tab, historyData, loadingHistory]);

  function close() {
    setIsOpen(false);
  }

  return (
    <>
      {/* Trigger — three dot button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-10 w-10 items-center justify-center gap-0.75 rounded-full text-zinc-500 hover:bg-zinc-100 active:bg-zinc-200"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className="h-1 w-1 rounded-full bg-current" />
        <span className="h-1 w-1 rounded-full bg-current" />
        <span className="h-1 w-1 rounded-full bg-current" />
      </button>

      {/* Backdrop */}
      <div
        onClick={close}
        className={[
          "fixed inset-0 z-40 bg-black/50 transition-opacity",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        aria-hidden="true"
      />

      {/* Panel — bottom sheet */}
      <section
        className={[
          "fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-107.5 flex-col rounded-t-3xl border border-zinc-200 bg-white shadow-2xl transition-transform duration-300 dark:border-zinc-700 dark:bg-zinc-900",
          isOpen ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
        style={{ height: "88svh" }}
        role="dialog"
        aria-modal="true"
        aria-label="Settings and history"
      >
        {/* Drag handle */}
        <div className="mx-auto mt-4 mb-2 h-1.5 w-12 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700" />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-5 py-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Our Finances</h2>
          <button
            type="button"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 gap-2 px-5 pb-3 pt-1">
          {(["history", "settings"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={[
                "flex-1 rounded-xl py-2.5 text-sm font-medium capitalize transition-colors",
                tab === t
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {tab === "history" &&
            (loadingHistory ? (
              <div className="flex h-48 items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
                Loading…
              </div>
            ) : (
              <HistoryChart months={historyData ?? []} />
            ))}

          {tab === "settings" && (
            <SettingsContent users={users} onSaved={() => onSettingsSaved?.()} />
          )}
        </div>
      </section>
    </>
  );
}
