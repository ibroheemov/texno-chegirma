"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { navItems, storeNavItem } from "./nav-items";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export function Sidebar({
  storeName,
  restricted = false,
  open,
  onClose,
  collapsed = false,
  onToggleCollapsed,
}: {
  storeName: string;
  restricted?: boolean;
  open: boolean;
  onClose: () => void;
  /** Desktop only: shrink the sidebar to an icon rail. The mobile drawer always stays full width. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-border bg-surface transition-[transform,width] lg:static lg:translate-x-0",
          collapsed ? "lg:w-[72px]" : "lg:w-64",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center justify-between gap-2 border-b border-border px-5",
            collapsed && "lg:justify-center lg:px-0"
          )}
        >
          <div className={cn("flex min-w-0 items-center gap-2 font-bold text-foreground", collapsed && "lg:hidden")}>
            <Logo imgClassName="h-6" />
            <span className="truncate">{storeName}</span>
          </div>
          <button onClick={onClose} className="text-muted lg:hidden" aria-label="Yopish">
            <X size={20} />
          </button>
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground lg:flex"
              aria-label={collapsed ? "Yon panelni ochish" : "Yon panelni yig'ish"}
              title={collapsed ? "Yon panelni ochish" : "Yon panelni yig'ish"}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          )}
        </div>
        <nav className="flex flex-col gap-1 p-3">
          <span
            className={cn(
              "px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted",
              collapsed && "lg:hidden"
            )}
          >
            Asosiy menyu
          </span>
          {(restricted ? navItems.slice(0, 1) : navItems).map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                className={cn(
                  // "!" because globals.css sets `* { border-color }` outside Tailwind's layers, which would
                  // otherwise override these (a grey bar on every item, and no accent bar on the active one).
                  "flex items-center gap-3 rounded-lg border-l-[3px] !border-transparent px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-surface-muted",
                  collapsed && "lg:justify-center lg:gap-0 lg:px-0",
                  active &&
                    "!border-accent bg-accent-soft text-accent hover:bg-accent-soft"
                )}
              >
                <Icon size={18} className="shrink-0" />
                <span className={cn(collapsed && "lg:hidden")}>{item.label}</span>
              </Link>
            );
          })}
          {!restricted && (<>
          <span
            className={cn(
              "px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-muted",
              collapsed && "lg:hidden"
            )}
          >
            Do&apos;kon
          </span>
          <a
            href={storeNavItem.href}
            target="_blank"
            rel="noreferrer"
            title={collapsed ? storeNavItem.label : undefined}
            aria-label={storeNavItem.label}
            className={cn(
              "flex items-center gap-3 rounded-lg border-l-[3px] !border-transparent px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-surface-muted",
              collapsed && "lg:justify-center lg:gap-0 lg:px-0"
            )}
          >
            <storeNavItem.icon size={18} className="shrink-0" />
            <span className={cn(collapsed && "lg:hidden")}>{storeNavItem.label}</span>
          </a>
          </>)}
        </nav>
      </aside>
    </>
  );
}
