"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/cn";

const UZ_MONTHS = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentyabr",
  "Oktyabr",
  "Noyabr",
  "Dekabr",
];
const UZ_WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function toDateValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseDateValue(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function DeliveryDatePicker({
  value,
  onChange,
  min,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseDateValue(value);
  const minDate = min ? parseDateValue(min) : null;
  const [viewDate, setViewDate] = useState(selected ?? minDate ?? new Date());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; openUp: boolean } | null>(null);

  function openPicker() {
    setViewDate(selected ?? minDate ?? new Date());
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const popoverHeight = 300;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < popoverHeight && rect.top > spaceBelow;
      setCoords({
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        openUp,
      });
    }
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        popoverRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function isDisabled(day: number) {
    if (!minDate) return false;
    return new Date(year, month, day) < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 text-left text-sm text-foreground outline-none focus:border-accent"
      >
        <Calendar size={14} className="shrink-0 text-muted" />
        {selected ? (
          `${pad2(selected.getDate())}.${pad2(selected.getMonth() + 1)}.${selected.getFullYear()}`
        ) : (
          <span className="text-muted">Sanani tanlang</span>
        )}
      </button>
      {open &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              transform: coords.openUp ? "translateY(-100%)" : undefined,
            }}
            className="z-50 w-64 rounded-lg border border-border bg-surface p-3 shadow-lg"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="rounded px-1.5 py-0.5 text-muted hover:text-accent"
              >
                ‹
              </button>
              <span className="text-sm font-medium">
                {UZ_MONTHS[month]} {year}
              </span>
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="rounded px-1.5 py-0.5 text-muted hover:text-accent"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
              {UZ_WEEKDAYS.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((day, i) =>
                day === null ? (
                  <span key={i} />
                ) : (
                  <button
                    key={i}
                    type="button"
                    disabled={isDisabled(day)}
                    onClick={() => {
                      onChange(toDateValue(new Date(year, month, day)));
                      setOpen(false);
                    }}
                    className={cn(
                      "h-7 w-7 rounded-full text-xs text-foreground hover:bg-accent-soft hover:text-accent disabled:cursor-not-allowed disabled:opacity-30",
                      selected &&
                        selected.getFullYear() === year &&
                        selected.getMonth() === month &&
                        selected.getDate() === day &&
                        "bg-accent text-white hover:bg-accent hover:text-white"
                    )}
                  >
                    {day}
                  </button>
                )
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export function DeliveryTimePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [hour, minute] = value ? value.split(":") : ["", ""];
  const hours = Array.from({ length: 24 }, (_, i) => pad2(i));
  const minutes = Array.from({ length: 12 }, (_, i) => pad2(i * 5));

  return (
    <div className="flex h-10 items-center gap-1 rounded-lg border border-border bg-background px-2 text-sm text-foreground focus-within:border-accent">
      <Clock size={14} className="shrink-0 text-muted" />
      <select
        value={hour}
        onChange={(e) => onChange(`${e.target.value}:${minute || "00"}`)}
        className="h-full flex-1 bg-transparent text-sm text-foreground outline-none"
      >
        <option value="" disabled>
          Soat
        </option>
        {hours.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-muted">:</span>
      <select
        value={minute}
        onChange={(e) => onChange(`${hour || "00"}:${e.target.value}`)}
        className="h-full flex-1 bg-transparent text-sm text-foreground outline-none"
      >
        <option value="" disabled>
          Daqiqa
        </option>
        {minutes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
