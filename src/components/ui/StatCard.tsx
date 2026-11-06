import { LucideIcon } from "lucide-react";
import { Card } from "./Card";
import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  deltaTone = "accent",
  onClick,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: string;
  deltaLabel?: string;
  deltaTone?: "accent" | "danger";
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn("p-5", onClick && "cursor-pointer text-left transition-colors hover:border-accent")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between">
        <span className="text-sm font-semibold text-muted">{label}</span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-accent">
          <Icon size={18} />
        </span>
      </div>
      <div className="mt-3 text-[28px] font-bold leading-none text-foreground">{value}</div>
      {delta && (
        <>
          <div className="my-4 border-t border-dashed border-border" />
          <div className="text-xs text-muted">
            <span
              className={cn(
                "font-semibold",
                deltaTone === "accent" ? "text-accent" : "text-danger"
              )}
            >
              {delta}
            </span>{" "}
            {deltaLabel}
          </div>
        </>
      )}
    </Card>
  );
}
