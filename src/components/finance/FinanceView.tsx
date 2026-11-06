"use client";

import { useEffect, useState } from "react";
import {
  Wallet,
  CreditCard,
  Landmark,
  Plus,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  PackageCheck,
  Ban,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { formatSom, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

type Period = "today" | "week" | "month" | "all";

type Entry = {
  id: string;
  direction: "IN" | "OUT";
  amount: number;
  method: string;
  note: string | null;
  createdAt: string;
  sale: { id: string; canceled: boolean; customer: { name: string } | null } | null;
};

type Balances = {
  cash: number;
  card: number;
  mixed: number;
  creditOutstanding: number;
  totalIn: number;
  totalOut: number;
  handedOver: number;
};

export function FinanceView() {
  const [period, setPeriod] = useState<Period>("month");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/ledger?period=${period}`);
    const data = await res.json();
    setEntries(data.entries ?? []);
    setBalances(data.balances ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function cancelSale(saleId: string) {
    if (!window.confirm("Bu savdoni bekor qilasizmi? Tovarlar omborga qaytariladi.")) return;
    setCancelingId(saleId);
    setCancelError("");
    const res = await fetch(`/api/sales/${saleId}/cancel`, { method: "POST" });
    setCancelingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setCancelError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Naqd qoldiq" value={formatSom(balances?.cash ?? 0)} icon={Wallet} />
        <StatCard label="Karta qoldiq" value={formatSom(balances?.card ?? 0)} icon={CreditCard} />
        <StatCard label="Nasiyadagi summa" value={formatSom(balances?.creditOutstanding ?? 0)} icon={Landmark} />
        <StatCard label="Topshirilgan" value={formatSom(balances?.handedOver ?? 0)} icon={PackageCheck} />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["today", "Bugun"],
                ["week", "Hafta"],
                ["month", "Oy"],
                ["all", "Barchasi"],
              ] as [Period, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={cn(
                  "rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted",
                  period === key && "border-accent bg-accent-soft text-accent"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Kirim/Chiqim
          </Button>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-accent" size={24} />
            </div>
          ) : entries.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Harakatlar topilmadi</p>
          ) : (
            <div className="flex flex-col divide-y divide-border/60">
              {entries.map((e) => (
                <div
                  key={e.id}
                  className={cn("flex items-center gap-3 py-2.5", e.sale?.canceled && "opacity-50")}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full",
                      e.direction === "IN" ? "bg-accent-soft text-accent" : "bg-danger-soft text-danger"
                    )}
                  >
                    {e.direction === "IN" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {e.sale
                        ? `Sotuv${e.sale.customer ? " · " + e.sale.customer.name : ""}`
                        : e.direction === "OUT"
                          ? "Chiqim"
                          : "Kirim"}
                    </p>
                    {e.note && <p className="truncate text-xs text-muted">{e.note}</p>}
                    <p className="text-xs text-muted">
                      {formatDateTime(e.createdAt)} · {e.method === "CASH" ? "naqd" : e.method === "CARD" ? "karta" : "aralash"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      e.direction === "IN" ? "text-accent" : "text-danger"
                    )}
                  >
                    {e.direction === "IN" ? "+" : "-"}
                    {formatSom(e.amount)}
                  </span>
                  {e.sale &&
                    e.direction === "IN" &&
                    (e.sale.canceled ? (
                      <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-danger-soft px-2 py-1 text-xs text-danger">
                        <Ban size={11} /> Bekor qilingan
                      </span>
                    ) : (
                      <button
                        onClick={() => cancelSale(e.sale!.id)}
                        disabled={cancelingId === e.sale.id}
                        className="flex items-center gap-1 whitespace-nowrap text-xs text-muted hover:text-danger disabled:opacity-50"
                        title="Savdoni bekor qilish"
                      >
                        {cancelingId === e.sale.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Ban size={12} />
                        )}
                        Bekor qilish
                      </button>
                    ))}
                </div>
              ))}
            </div>
          )}
          {cancelError && <p className="mt-2 text-sm text-danger">{cancelError}</p>}
        </div>
      </Card>

      <LedgerFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} />
    </div>
  );
}

export function LedgerFormModal({
  open,
  onClose,
  onSaved,
  defaultDirection = "OUT",
  lockDirection = false,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultDirection?: "IN" | "OUT";
  lockDirection?: boolean;
}) {
  const [direction, setDirection] = useState<"IN" | "OUT">(defaultDirection);
  const [method, setMethod] = useState<"CASH" | "CARD">("CASH");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDirection(defaultDirection);
      setMethod("CASH");
      setAmount("");
      setCategory("");
      setNote("");
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultDirection]);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/ledger/categories?direction=${direction}`)
      .then((res) => res.json())
      .then((data) => setCategoryOptions(data.categories ?? []))
      .catch(() => {});
  }, [open, direction]);

  async function save() {
    if (!amount) {
      setError("Summani kiriting");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction, method, amount, category, note }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Kirim / Chiqim qo'shish">
      <div className="flex flex-col gap-3">
        {!lockDirection && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDirection("IN")}
              className={cn(
                "rounded-lg border border-border py-2 text-sm font-medium",
                direction === "IN" && "border-accent bg-accent-soft text-accent"
              )}
            >
              Kirim
            </button>
            <button
              onClick={() => setDirection("OUT")}
              className={cn(
                "rounded-lg border border-border py-2 text-sm font-medium",
                direction === "OUT" && "border-accent bg-accent-soft text-accent"
              )}
            >
              Chiqim
            </button>
          </div>
        )}
        <Field label="Summasi (so'm)">
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Usul">
          <Select value={method} onChange={(e) => setMethod(e.target.value as "CASH" | "CARD")}>
            <option value="CASH">Naqd</option>
            <option value="CARD">Karta</option>
          </Select>
        </Field>
        <Field label="Kategoriya (ixtiyoriy)">
          <>
            <Input
              list="ledger-category-options"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Masalan: Ofis xarajati"
            />
            <datalist id="ledger-category-options">
              {categoryOptions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </>
        </Field>
        <Field label="Izoh (ixtiyoriy)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Qo'shimcha izoh" />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button onClick={save} disabled={saving} className="mt-2">
          {saving && <Loader2 size={16} className="animate-spin" />}
          Saqlash
        </Button>
      </div>
    </Modal>
  );
}
