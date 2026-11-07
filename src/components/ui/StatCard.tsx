import { Eye, EyeOff, LucideIcon } from "lucide-react";
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
  masked,
  onToggleMask,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: string;
  deltaLabel?: string;
  deltaTone?: "accent" | "danger";
  onClick?: () => void;
  masked?: boolean;
  onToggleMask?: () => void;
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
        <div className="flex items-center gap-1">
          {onToggleMask && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMask();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              aria-label={masked ? "Summani ko'rsatish" : "Summani yashirish"}
            >
              {masked ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-accent">
            <Icon size={18} />
          </span>
        </div>
      </div>
      <div className="mt-3 text-[28px] font-bold leading-none text-foreground">
        {masked ? "••••••" : value}
      </div>
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
