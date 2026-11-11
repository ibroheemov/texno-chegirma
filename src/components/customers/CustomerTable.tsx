"use client";

import { useMemo, useState } from "react";
import type { Customer } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Phone,
  Users,
  AlertCircle,
  Landmark,
  Clock,
  ShoppingBag,
  History,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { cn } from "@/lib/cn";
import { formatSom } from "@/lib/format";
import { CustomerFormModal } from "./CustomerFormModal";
import { CustomerPurchasesModal } from "./CustomerPurchasesModal";
import type { CustomerRow } from "@/lib/types";

export type { CustomerRow };

type StatusFilter = "all" | "debtors" | "paid" | "dueSoon";
type SortKey = "orders" | "spent" | "debt";

function SortableTh({
  label,
  icon: Icon,
  active,
  dir,
  onClick,
  align = "right",
}: {
  label: string;
  icon?: typeof ShoppingBag;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <th className={cn("pb-2 pr-3 font-medium", align === "right" && "text-right")}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-accent",
          align === "right" && "justify-end",
          active && "text-accent"
        )}
      >
        {Icon && <Icon size={11} />}
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp size={11} />
          ) : (
            <ArrowDown size={11} />
          )
        ) : (
          <ArrowUpDown size={11} className="opacity-40" />
        )}
      </button>
    </th>
  );
}

export function CustomerTable({ initialCustomers }: { initialCustomers: CustomerRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [error, setError] = useState("");
  const [purchasesCustomer, setPurchasesCustomer] = useState<CustomerRow | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const stats = useMemo(() => {
    const debtors = initialCustomers.filter((c) => c.debt > 0);
    return {
      total: initialCustomers.length,
      debtors: debtors.length,
      totalDebt: debtors.reduce((sum, c) => sum + c.debt, 0),
      dueSoon: initialCustomers.filter((c) => c.dueSoon).length,
    };
  }, [initialCustomers]);

  const filtered = useMemo(() => {
    return initialCustomers.filter((c) => {
      if (status === "debtors" && c.debt <= 0) return false;
      if (status === "paid" && c.debt > 0) return false;
      if (status === "dueSoon" && !c.dueSoon) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.phone?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [initialCustomers, status, query]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const field = sortKey === "orders" ? "ordersCount" : sortKey === "spent" ? "totalSpent" : "debt";
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => (a[field] - b[field]) * dir);
  }, [filtered, sortKey, sortDir]);

  async function remove(id: string) {
    setError("");
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jami mijozlar" value={String(stats.total)} icon={Users} />
        <StatCard label="Qarzdorlar" value={String(stats.debtors)} icon={AlertCircle} deltaTone="danger" />
        <StatCard label="Jami qarz" value={formatSom(stats.totalDebt)} icon={Landmark} />
        <StatCard label="Muddati yaqin" value={String(stats.dueSoon)} icon={Clock} deltaTone="danger" />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ism yoki telefon bo'yicha qidirish..."
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-accent"
            />
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={16} /> Mijoz qo&apos;shish
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ["all", `Hammasi (${stats.total})`],
              ["debtors", `Qarzdorlar (${stats.debtors})`],
              ["paid", `To'langan (${stats.total - stats.debtors})`],
              ["dueSoon", `Muddati yaqin (${stats.dueSoon})`],
            ] as [StatusFilter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              className={cn(
                "rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted",
                status === key && "border-accent bg-accent-soft text-accent"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="pb-2 pr-3 font-medium">Mijoz</th>
              <th className="pb-2 pr-3 font-medium">Telefon</th>
              <th className="pb-2 pr-3 font-medium">Manzil</th>
              <SortableTh
                label="Buyurtmalar"
                icon={ShoppingBag}
                active={sortKey === "orders"}
                dir={sortDir}
                onClick={() => toggleSort("orders")}
              />
              <SortableTh
                label="Jami xaridlar"
                active={sortKey === "spent"}
                dir={sortDir}
                onClick={() => toggleSort("spent")}
              />
              <SortableTh
                label="Nasiya qarzi"
                align="left"
                active={sortKey === "debt"}
                dir={sortDir}
                onClick={() => toggleSort("debt")}
              />
              <th className="pb-2 text-right font-medium">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.id} className="border-b border-border/60 last:border-0">
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                      {c.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate text-sm font-medium">{c.name}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-muted">
                  {c.phone ? (
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Phone size={11} /> {c.phone}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="max-w-[180px] truncate py-2.5 pr-3 text-muted">{c.address || "—"}</td>
                <td className="py-2.5 pr-3 text-right font-semibold">{c.ordersCount}</td>
                <td className="whitespace-nowrap py-2.5 pr-3 text-right font-semibold">
                  {formatSom(c.totalSpent)}
                </td>
                <td className="py-2.5 pr-3">
                  {c.debt > 0 ? (
                    <Badge tone={c.overdue ? "danger" : c.dueSoon ? "warning" : "danger"}>
                      {formatSom(c.debt)}
                      {c.overdue ? " · muddati o'tgan" : c.dueSoon ? " · muddati yaqin" : ""}
                    </Badge>
                  ) : (
                    <Badge tone="accent">Qarzi yo&apos;q</Badge>
                  )}
                </td>
                <td className="py-2.5">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setPurchasesCustomer(c)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted text-foreground hover:text-accent"
                      aria-label="Xaridlar tarixi"
                      title="Xaridlar tarixi"
                    >
                      <History size={12} />
                    </button>
                    <button
                      onClick={() => {
                        setEditing(c);
                        setModalOpen(true);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted text-foreground hover:text-accent"
                      aria-label="Tahrirlash"
                      title="Tahrirlash"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted text-foreground hover:text-danger"
                      aria-label="O'chirish"
                      title="O'chirish"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">Hech narsa topilmadi</p>
        )}
      </div>

      <CustomerFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => router.refresh()}
        customer={editing}
      />
      </Card>
      <CustomerPurchasesModal
        open={!!purchasesCustomer}
        onClose={() => setPurchasesCustomer(null)}
        customerId={purchasesCustomer?.id ?? null}
        customerName={purchasesCustomer?.name ?? ""}
      />
    </div>
  );
}
