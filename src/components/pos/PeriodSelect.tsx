"use client";

import type { PeriodValue } from "@/lib/period";
import { toDateInputValue, toMonthInputValue } from "@/lib/period";

const KIND_OPTIONS: { value: PeriodValue["kind"]; label: string }[] = [
  { value: "today", label: "Bugun" },
  { value: "yesterday", label: "Kecha" },
  { value: "day", label: "Sana bo'yicha" },
  { value: "month", label: "Oy bo'yicha" },
  { value: "range", label: "Sana oralig'i" },
];

export function PeriodSelect({
  value,
  onChange,
}: {
  value: PeriodValue;
  onChange: (next: PeriodValue) => void;
}) {
  const now = new Date();

  function changeKind(kind: PeriodValue["kind"]) {
    switch (kind) {
      case "today":
        onChange({ kind: "today" });
        return;
      case "yesterday":
        onChange({ kind: "yesterday" });
        return;
      case "day":
        onChange({ kind: "day", date: toDateInputValue(now) });
        return;
      case "month":
        onChange({ kind: "month", month: toMonthInputValue(now) });
        return;
      case "range":
        onChange({ kind: "range", from: toDateInputValue(now), to: toDateInputValue(now) });
        return;
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={value.kind}
        onChange={(e) => changeKind(e.target.value as PeriodValue["kind"])}
        className="h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-accent"
      >
        {KIND_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {value.kind === "day" && (
        <input
          type="date"
          value={value.date}
          onChange={(e) => onChange({ kind: "day", date: e.target.value })}
          className="h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-accent"
        />
      )}
      {value.kind === "month" && (
        <input
          type="month"
          value={value.month}
          onChange={(e) => onChange({ kind: "month", month: e.target.value })}
          className="h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-accent"
        />
      )}
      {value.kind === "range" && (
        <>
          <input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ kind: "range", from: e.target.value, to: value.to })}
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-accent"
          />
          <span className="text-xs text-muted">—</span>
          <input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ kind: "range", from: value.from, to: e.target.value })}
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-accent"
          />
        </>
      )}
    </div>
  );
}
