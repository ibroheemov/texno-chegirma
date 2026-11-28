"use client";

import { Check } from "lucide-react";
import { SEGMENT_COLORS, SEGMENT_COLOR_LABELS, type SegmentColor } from "@/lib/customerSegments";
import "./mijozlar.css";

export async function readError(res: Response) {
  const data = await res.json().catch(() => ({}));
  return (data.error as string | undefined) ?? "Xatolik yuz berdi";
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

/** Stable avatar palette (.av-1 … .av-6) per customer id. */
export function avClass(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return `av-${(Math.abs(hash) % 6) + 1}`;
}

export function SegmentBadge({
  name,
  color,
  kind = "tag",
  small,
}: {
  name: string;
  color: SegmentColor;
  kind?: "group" | "tag";
  small?: boolean;
}) {
  return (
    <span className={`badge mj-seg mj-c-${color}${kind === "tag" ? " badge-square" : ""}${small ? " badge-sm" : ""}`}>
      {kind === "group" && <i className="bd" />}
      {name}
    </span>
  );
}

export function ColorPicker({ value, onChange }: { value: SegmentColor; onChange: (color: SegmentColor) => void }) {
  return (
    <div className="mj-swatches" role="radiogroup" aria-label="Rang">
      {SEGMENT_COLORS.map((color) => (
        <button
          type="button"
          key={color}
          role="radio"
          aria-checked={value === color}
          aria-label={SEGMENT_COLOR_LABELS[color]}
          title={SEGMENT_COLOR_LABELS[color]}
          className={`mj-swatch mj-c-${color}${value === color ? " is-active" : ""}`}
          onClick={() => onChange(color)}
        >
          {value === color && <Check className="ic" size={14} />}
        </button>
      ))}
    </div>
  );
}
