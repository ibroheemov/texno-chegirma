"use client";

import { useMemo, useState } from "react";
import type { Customer } from "@prisma/client";
import { useRouter } from "next/navigation";
import { Search, Plus, Pencil, Trash2, Phone, Users, AlertCircle, Landmark, Clock, ShoppingBag } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { cn } from "@/lib/cn";
import { formatSom } from "@/lib/format";
import { CustomerFormModal } from "./CustomerFormModal";
import type { CustomerRow } from "@/lib/types";

export type { CustomerRow };

type StatusFilter = "all" | "debtors" | "paid" | "dueSoon";

export function CustomerTable({ initialCustomers }: { initialCustomers: CustomerRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [error, setError] = useState("");

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
        return c.name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [initialCustomers, status, query]);

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

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <div key={c.id} className="rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
                  {c.name.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-semibold">{c.name}</p>
                  {c.phone && (
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <Phone size={11} /> {c.phone}
                    </p>
                  )}
                  {c.address && <p className="text-xs text-muted">{c.address}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setEditing(c);
                    setModalOpen(true);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted text-foreground hover:text-accent"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => remove(c.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted text-foreground hover:text-danger"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3 text-xs">
              <span className="flex items-center gap-1 text-muted">
                <ShoppingBag size={11} /> Buyurtmalar
              </span>
              <span className="font-semibold">{c.ordersCount}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-muted">Jami xaridlar</span>
              <span className="font-semibold">{formatSom(c.totalSpent)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-muted">Nasiya qarzi</span>
              {c.debt > 0 ? (
                <Badge tone={c.overdue ? "danger" : c.dueSoon ? "warning" : "danger"}>
                  {formatSom(c.debt)}
                  {c.overdue ? " · muddati o'tgan" : c.dueSoon ? " · muddati yaqin" : ""}
                </Badge>
              ) : (
                <Badge tone="accent">Qarzi yo&apos;q</Badge>
              )}
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">Hech narsa topilmadi</p>
      )}

      <CustomerFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => router.refresh()}
        customer={editing}
      />
      </Card>
    </div>
  );
}
