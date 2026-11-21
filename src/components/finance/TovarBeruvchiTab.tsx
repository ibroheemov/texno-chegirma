"use client";

import { useEffect, useState } from "react";
import type { Product } from "@prisma/client";
import { Loader2, Plus, Truck, Phone, ChevronDown, PackageCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { formatSom } from "@/lib/format";
import { cn } from "@/lib/cn";
import { SupplierPurchasesPanel } from "./SupplierPurchasesPanel";
import { GoodsReceiptModal } from "@/components/inventory/GoodsReceiptModal";
import { PaySupplierModal } from "./PaySupplierModal";

type SupplierRow = {
  id: string;
  name: string;
  phone: string | null;
  distinctProducts: number;
  totalUnits: number;
  totalAmount: number;
  totalUsd: number;
  cash: number;
  card: number;
  debt: number;
  debtUsd: number;
  debtUsdEstimated: boolean;
  receiptsCount: number;
  stockValue: number;
};

function formatUsd(somAmount: number, usdRate: number) {
  return `$${(somAmount / usdRate).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function formatUsdAmount(amount: number) {
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function TovarBeruvchiTab({
  products,
  usdRate,
  showDebtInUsdOnly,
}: {
  products: Product[];
  usdRate?: number | null;
  showDebtInUsdOnly?: boolean;
}) {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [expenses, setExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [addReceiptOpen, setAddReceiptOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<SupplierRow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Spinner only on the first load; later refreshes keep the open panel mounted.
  async function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    const res = await fetch("/api/suppliers");
    const data = await res.json();
    setSuppliers(data.suppliers ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load(true);
    fetch("/api/ledger?period=all")
      .then((res) => res.json())
      .then((data) => setExpenses(data.balances?.expenses ?? 0))
      .catch(() => {});
  }, []);

  const totalRecorded = suppliers.reduce((s, x) => s + x.totalAmount, 0);
  const totalRecordedUsd = suppliers.reduce((s, x) => s + x.totalUsd, 0);
  const totalCash = suppliers.reduce((s, x) => s + x.cash, 0);
  const totalCard = suppliers.reduce((s, x) => s + x.card, 0);
  const totalDebt = suppliers.reduce((s, x) => s + x.debt, 0);

  function debtLabel(amount: number) {
    if (showDebtInUsdOnly && usdRate) return formatUsd(amount, usdRate);
    return formatSom(amount);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-accent" size={24} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <StatCard label="Chiqarilgan" value={formatSom(expenses)} icon={PackageCheck} />

      <Card className="p-4">
        <p className="text-sm font-semibold text-muted">Qayd etilgan kirimlar</p>
        <p className="mt-1 text-2xl font-bold">
          {formatSom(totalRecorded)}
          {totalRecordedUsd > 0 && (
            <span className="ml-2 text-base font-semibold text-muted">({formatUsdAmount(totalRecordedUsd)})</span>
          )}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-surface-muted p-3 text-center">
            <p className="text-xs text-muted">Naqd</p>
            <p className="text-sm font-bold">{formatSom(totalCash)}</p>
          </div>
          <div className="rounded-lg bg-surface-muted p-3 text-center">
            <p className="text-xs text-muted">Karta</p>
            <p className="text-sm font-bold">{formatSom(totalCard)}</p>
          </div>
          <div className="rounded-lg bg-surface-muted p-3 text-center">
            <p className="text-xs text-muted">Qarz</p>
            <p className="text-sm font-bold text-danger">{debtLabel(totalDebt)}</p>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Yetkazib beruvchilar ro&apos;yxati ({suppliers.length})</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setAddSupplierOpen(true)}>
            <Plus size={16} /> Yetkazib beruvchi
          </Button>
          <Button size="sm" onClick={() => setAddReceiptOpen(true)}>
            <Plus size={16} /> Tovar kirimi
          </Button>
        </div>
      </div>

      {suppliers.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">Yetkazib beruvchilar yo&apos;q</Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => {
            const expanded = expandedId === s.id;
            return (
            <Card
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={() => setExpandedId(expanded ? null : s.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setExpandedId(expanded ? null : s.id);
                }
              }}
              className={cn(
                "cursor-pointer p-4 transition-colors hover:border-accent",
                expanded && "sm:col-span-2 lg:col-span-3"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
                    {s.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    {s.phone && (
                      <p className="flex items-center gap-1 text-xs text-muted">
                        <Phone size={11} /> {s.phone}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={cn("mt-1.5 shrink-0 text-muted transition-transform", expanded && "rotate-180")}
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                {s.distinctProducts} tovar, {s.totalUnits} birlik
              </p>
              <p className="mt-1 text-lg font-bold">
                {formatSom(s.totalAmount)}
                {s.totalUsd > 0 && (
                  <span className="ml-1.5 text-sm font-semibold text-muted">({formatUsdAmount(s.totalUsd)})</span>
                )}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted">
                {s.cash > 0 && <span>Naqd: {formatSom(s.cash)}</span>}
                {s.card > 0 && <span>Karta: {formatSom(s.card)}</span>}
              </div>
              <p className="mt-1 text-xs text-muted">
                Omborda qoldiq qiymati: <span className="font-semibold text-foreground">{formatSom(s.stockValue)}</span>
              </p>
              {s.debt > 0 ? (
                <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3">
                  <div className="flex flex-col items-start gap-1">
                    <Badge tone="danger" className="whitespace-nowrap text-sm font-semibold">
                      Qarz: {s.debtUsd > 0 ? `${s.debtUsdEstimated ? "≈ " : ""}${formatUsdAmount(s.debtUsd)}` : debtLabel(s.debt)}
                    </Badge>
                    {s.debtUsd > 0 && <span className="text-xs text-danger/80">{formatSom(s.debt)}</span>}
                  </div>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPayTarget(s);
                    }}
                  >
                    To&apos;lash
                  </Button>
                </div>
              ) : (
                <div className="mt-3 border-t border-dashed border-border pt-3">
                  <Badge tone="accent">Qarzi yo&apos;q</Badge>
                </div>
              )}
              {expanded && (
                <div className="mt-4 border-t border-border pt-4">
                  <SupplierPurchasesPanel supplierId={s.id} supplierName={s.name} storeUsdRate={usdRate} onPaid={load} />
                </div>
              )}
            </Card>
            );
          })}
        </div>
      )}

      <AddSupplierModal open={addSupplierOpen} onClose={() => setAddSupplierOpen(false)} onSaved={load} />
      <GoodsReceiptModal
        open={addReceiptOpen}
        onClose={() => setAddReceiptOpen(false)}
        onSaved={load}
        suppliers={suppliers}
        products={products}
        storeUsdRate={usdRate}
      />
      <PaySupplierModal
        target={payTarget}
        onClose={() => setPayTarget(null)}
        onPaid={load}
        storeUsdRate={usdRate}
      />
    </div>
  );
}

function AddSupplierModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setPhone("");
      setError("");
    }
  }, [open]);

  async function save() {
    if (!name.trim()) {
      setError("Nomini kiriting");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
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
    <Modal open={open} onClose={onClose} title="Yetkazib beruvchi qo'shish">
      <div className="flex flex-col gap-3">
        <Field label="Nomi">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Shivaki" />
        </Field>
        <Field label="Telefon (ixtiyoriy)">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" />
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
