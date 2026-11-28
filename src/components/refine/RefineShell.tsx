"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Gift,
  HandCoins,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
  Settings,
  ShoppingCart,
  Tags,
  UserCog,
  UserRound,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { KassaMark, KassaWordmark } from "./KassaMark";
import "./refine-tokens.css";
import "./refine-ui.css";
import "./refine-shell.css";

type SubEntry = { href: string; label: string; icon: LucideIcon };
type NavEntry = { href: string; label: string; icon: LucideIcon; migrated: boolean; sub?: SubEntry[] };

const MIJOZLAR = "/admin/yangi-dizayn/mijozlar";

// `migrated` entries exist in the New design; the others still open the Old design page.
const navEntries: NavEntry[] = [
  { href: "/admin/yangi-dizayn", label: "Kassa", icon: ShoppingCart, migrated: true },
  { href: "/admin/yangi-dizayn/ombor", label: "Ombor", icon: Package, migrated: true },
  {
    href: MIJOZLAR,
    label: "Mijozlar",
    icon: UserRound,
    migrated: true,
    sub: [
      { href: MIJOZLAR, label: "Barcha mijozlar", icon: Users },
      { href: `${MIJOZLAR}/guruhlar`, label: "Guruhlar va teglar", icon: Tags },
      { href: `${MIJOZLAR}/sodiqlik`, label: "Sodiqlik dasturi", icon: Gift },
      { href: `${MIJOZLAR}/qarzlar`, label: "Mijozlar qarzlari", icon: HandCoins },
      { href: `${MIJOZLAR}/buyurtmalar`, label: "Buyurtmalar", icon: UsersRound },
    ],
  },
  { href: "/admin/moliya", label: "Moliya", icon: Wallet, migrated: false },
  { href: "/admin/nasiya", label: "Nasiya", icon: CreditCard, migrated: false },
  { href: "/admin/xodimlar", label: "Xodimlar", icon: UserCog, migrated: false },
  { href: "/admin/yangi-dizayn/kategoriyalar", label: "Kategoriyalar", icon: Tags, migrated: true },
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

  // Kassa is a full-bleed work area: no page padding and no shell top bar, so it fills the whole content column.
  const bleed = pathname === "/admin/yangi-dizayn";

  const current = navEntries.find((entry) => entry.migrated && entry.href !== "/admin/yangi-dizayn" && pathname.startsWith(entry.href));
  const currentSub = current?.sub
    ?.slice()
    .reverse()
    .find((item) => (item.href === current.href ? pathname === item.href : pathname.startsWith(item.href)));

  // A section with subpages swaps the nav for its own panel (back chevron + subpages) while one of its
  // pages is open. "Back" shows the main nav again without leaving the page, until the route changes.
  const [backedOutAt, setBackedOutAt] = useState<string | null>(null);
  const subPanel = current?.sub && backedOutAt !== pathname ? current : null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="refine-ds rf-root">
      <div className={`shell rf-shell${bleed ? " is-bleed" : ""}`}>
        <aside className={`sb${collapsed ? " is-collapsed" : ""}`} aria-label="Asosiy navigatsiya">
          <div className="sb-brand">
            <span className="brand-mark">
              <KassaMark size={44} />
            </span>
            <span className="hide-c rf-brand-word">
              <KassaWordmark size={44} />
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
            {subPanel ? (
              <div className="sb-group rf-subnav" key={subPanel.href}>
                <button
                  type="button"
                  className="rf-subnav-back"
                  onClick={() => setBackedOutAt(pathname)}
                  title="Asosiy menyuga qaytish"
                  aria-label={`${subPanel.label}: asosiy menyuga qaytish`}
                >
                  <ChevronLeft className="ic rf-subnav-chev" size={18} />
                  <subPanel.icon className="ic rf-subnav-ic" size={20} />
                  <span className="hide-c">{subPanel.label}</span>
                </button>
                {subPanel.sub!.map((item) => {
                  const active = item.href === currentSub?.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`sb-item rf-subnav-item${active ? " is-active" : ""}`}
                      title={item.label}
                      aria-current={active ? "page" : undefined}
                    >
                      <item.icon className="ic rf-show-c" size={20} />
                      <span className="hide-c">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <>
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
                          onClick={entry.sub ? () => setBackedOutAt(null) : undefined}
                        >
                          <Icon className="ic" size={20} />
                          <span className="hide-c">{entry.label}</span>
                          {entry.sub && (
                            <span className="end hide-c">
                              <ChevronRight className="ic rf-sb-chev" size={18} />
                            </span>
                          )}
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
              </>
            )}
          </nav>

          <div className="sb-foot">
            <div className="sb-card hide-c">
              <b>Bosqichma-bosqich o‘tish</b>
              Kassa, Ombor, Mijozlar va Kategoriyalar yangi dizaynda. Qolgan bo‘limlar tayyor bo‘lguncha eski dizaynda ochiladi.
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
          {!bleed && (
            <header className="topbar">
              <nav className="crumbs" aria-label="Breadcrumb">
                <Link href="/admin/yangi-dizayn">Yangi dizayn</Link>
                <span className="sep">
                  <ChevronRight className="ic" size={14} />
                </span>
                {currentSub ? (
                  <>
                    <Link href={current!.href}>{current!.label}</Link>
                    <span className="sep">
                      <ChevronRight className="ic" size={14} />
                    </span>
                    <span aria-current="page">{currentSub.label}</span>
                  </>
                ) : (
                  <span aria-current="page">{current?.label ?? "Kassa"}</span>
                )}
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
          )}
          <main className="content">{children}</main>
        </div>
      </div>
    </div>
  );
}
