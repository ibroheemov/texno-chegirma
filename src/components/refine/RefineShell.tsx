"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  CreditCard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
  Settings,
  ShoppingCart,
  Tags,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import "./refine-tokens.css";
import "./refine-ui.css";
import "./refine-shell.css";

type NavEntry = { href: string; label: string; icon: LucideIcon; migrated: boolean };

// `migrated` entries exist in the New design; the others still open the Old design page.
const navEntries: NavEntry[] = [
  { href: "/admin/yangi-dizayn", label: "Kassa", icon: ShoppingCart, migrated: true },
  { href: "/admin/yangi-dizayn/ombor", label: "Ombor", icon: Package, migrated: true },
  { href: "/admin/yangi-dizayn/mijozlar", label: "Mijozlar", icon: Users, migrated: true },
  { href: "/admin/moliya", label: "Moliya", icon: Wallet, migrated: false },
  { href: "/admin/nasiya", label: "Nasiya", icon: CreditCard, migrated: false },
  { href: "/admin/xodimlar", label: "Xodimlar", icon: UserCog, migrated: false },
  { href: "/admin/kategoriyalar", label: "Kategoriyalar", icon: Tags, migrated: false },
  { href: "/admin/sozlamalar", label: "Sozlamalar", icon: Settings, migrated: false },
];

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function RefineShell({
  storeName,
  userName,
  children,
}: {
  storeName: string;
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const current = navEntries.find((entry) => entry.migrated && entry.href !== "/admin/yangi-dizayn" && pathname.startsWith(entry.href));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="refine-ds rf-root">
      <div className="shell rf-shell">
        <aside className={`sb${collapsed ? " is-collapsed" : ""}`} aria-label="Asosiy navigatsiya">
          <div className="sb-brand">
            <span className="brand-mark">Z</span>
            <span className="hide-c" style={{ minWidth: 0 }}>
              <b className="rf-ellipsis">{storeName}</b>
              <small>Yangi dizayn</small>
            </span>
            <button
              type="button"
              className="sb-toggle"
              aria-label={collapsed ? "Yon panelni ochish" : "Yon panelni yig‘ish"}
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? <PanelLeftOpen className="ic" size={18} /> : <PanelLeftClose className="ic" size={18} />}
            </button>
          </div>

          <nav className="sb-nav">
            <div className="sb-group">
              <span className="sb-label">Yangi dizayn</span>
              {navEntries
                .filter((entry) => entry.migrated)
                .map((entry) => {
                  const Icon = entry.icon;
                  const active =
                    entry.href === "/admin/yangi-dizayn" ? pathname === entry.href : pathname.startsWith(entry.href);
                  return (
                    <Link
                      key={entry.href}
                      href={entry.href}
                      className={`sb-item${active ? " is-active" : ""}`}
                      title={entry.label}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="ic" size={20} />
                      <span className="hide-c">{entry.label}</span>
                    </Link>
                  );
                })}
            </div>
            <div className="sb-group">
              <span className="sb-label">Hozircha eski dizaynda</span>
              {navEntries
                .filter((entry) => !entry.migrated)
                .map((entry) => {
                  const Icon = entry.icon;
                  return (
                    <Link key={entry.href} href={entry.href} className="sb-item" title={`${entry.label} (eski dizayn)`}>
                      <Icon className="ic" size={20} />
                      <span className="hide-c">{entry.label}</span>
                    </Link>
                  );
                })}
            </div>
          </nav>

          <div className="sb-foot">
            <div className="sb-card hide-c">
              <b>Bosqichma-bosqich o‘tish</b>
              Kassa, Ombor va Mijozlar yangi dizaynda. Qolgan bo‘limlar tayyor bo‘lguncha eski dizaynda ochiladi.
              <Link href="/admin" className="rf-old-link">
                Eski dizaynga o‘tish
                <ChevronRight className="ic" size={14} />
              </Link>
            </div>
            <div className="sb-user" title={userName}>
              <span className="av av-sm av-1">{initials(userName)}</span>
              <span className="hide-c" style={{ minWidth: 0 }}>
                <b className="rf-ellipsis">{userName}</b>
                <small>Tizimga kirgan</small>
              </span>
            </div>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <nav className="crumbs" aria-label="Breadcrumb">
              <Link href="/admin/yangi-dizayn">Yangi dizayn</Link>
              <span className="sep">
                <ChevronRight className="ic" size={14} />
              </span>
              <span aria-current="page">{current?.label ?? "Kassa"}</span>
            </nav>
            <span className="grow" />
            <div className="hdr-user" title={userName}>
              <span className="av">{initials(userName)}</span>
              <span className="rf-hide-m">
                <b>{userName}</b>
                <small>{storeName}</small>
              </span>
            </div>
            <button type="button" className="hdr-btn" onClick={logout} aria-label="Chiqish" title="Chiqish">
              <LogOut className="ic" size={18} />
            </button>
          </header>
          <main className="content">{children}</main>
        </div>
      </div>
    </div>
  );
}
