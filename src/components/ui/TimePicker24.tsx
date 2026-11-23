"use client";

import { Select } from "@/components/ui/Field";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

// <input type="time"> follows the browser locale and often shows AM/PM, so
// this uses two selects to always give a 24-hour "HH:MM" value ("" = unset).
export function TimePicker24({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [h = "", m = ""] = value ? value.split(":") : [];

  function update(nextH: string, nextM: string) {
    if (!nextH && !nextM) return onChange("");
    onChange(`${nextH || "00"}:${nextM || "00"}`);
  }

  return (
    <div className="flex items-center gap-1.5">
      <Select value={h} onChange={(e) => update(e.target.value, m)}>
        <option value="">--</option>
        {HOURS.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </Select>
      <span className="text-muted">:</span>
      <Select value={m} onChange={(e) => update(h, e.target.value)}>
        <option value="">--</option>
        {MINUTES.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </Select>
    </div>
  );
}
