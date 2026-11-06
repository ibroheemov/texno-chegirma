"use client";

import { useState } from "react";
import { Menu, LogOut } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { useRouter, usePathname } from "next/navigation";
import { pageTitles } from "@/lib/page-titles";

export function AdminShell({
  storeName,
  userName,
  children,
}: {
  storeName: string;
  userName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const page = pageTitles[pathname];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar storeName={storeName} open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur lg:px-6">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-foreground lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Menyu"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1">
            {page && (
              <>
                <h1 className="truncate text-base font-bold leading-tight">{page.title}</h1>
                <p className="hidden truncate text-xs text-muted sm:block">{page.subtitle}</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden items-center gap-2 rounded-full bg-surface-muted py-1 pl-1 pr-3 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                {userName.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-sm font-medium">{userName}</span>
            </div>
            <button
              onClick={logout}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-foreground hover:text-danger"
              aria-label="Chiqish"
              title="Chiqish"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
