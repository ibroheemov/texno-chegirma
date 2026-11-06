import { cn } from "@/lib/cn";
import { HTMLAttributes } from "react";

type Tone = "neutral" | "accent" | "danger" | "warning" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-muted text-muted",
  accent: "bg-accent-soft text-accent",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
