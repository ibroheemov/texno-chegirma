"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { navItems, storeNavItem } from "./nav-items";
import { Store as StoreIcon, X } from "lucide-react";

export function Sidebar({
  storeName,
  open,
  onClose,
}: {
  storeName: string;
  open: boolean;
  onClose: () => void;
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
          "fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-border bg-surface transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-5">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <StoreIcon size={18} />
            </span>
            <span className="truncate">{storeName}</span>
          </div>
          <button onClick={onClose} className="text-muted lg:hidden">
            <X size={20} />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          <span className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Asosiy menyu
          </span>
          {navItems.map((item) => {
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
                className={cn(
                  "flex items-center gap-3 rounded-lg border-l-[3px] border-transparent px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-surface-muted",
                  active &&
                    "border-accent bg-accent-soft text-accent hover:bg-accent-soft"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
          <span className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Do&apos;kon
          </span>
          <a
            href={storeNavItem.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg border-l-[3px] border-transparent px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-surface-muted"
          >
            <storeNavItem.icon size={18} />
            {storeNavItem.label}
          </a>
        </nav>
      </aside>
    </>
  );
}
