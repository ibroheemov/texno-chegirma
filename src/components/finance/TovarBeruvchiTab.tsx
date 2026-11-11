"use client";

import { useEffect, useState } from "react";
import type { Product } from "@prisma/client";
import { Loader2, Plus, Truck, Phone, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { formatSom } from "@/lib/format";
import { cn } from "@/lib/cn";
import { SupplierPurchasesPanel } from "./SupplierPurchasesPanel";
import { GoodsReceiptModal } from "@/components/inventory/GoodsReceiptModal";

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
  receiptsCount: number;
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
  const [loading, setLoading] = useState(true);
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [addReceiptOpen, setAddReceiptOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<SupplierRow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/suppliers");
    const data = await res.json();
    setSuppliers(data.suppliers ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
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
              {s.debt > 0 ? (
                <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3">
                  <Badge tone="danger">Qarz: {debtLabel(s.debt)}</Badge>
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
                  <SupplierPurchasesPanel supplierId={s.id} />
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

type DebtBreakdown = { debtTotal: number; debtSom: number; debtUsd: number; debtUsdSomValue: number };

function PaySupplierModal({
  target,
  onClose,
  onPaid,
  storeUsdRate,
}: {
  target: SupplierRow | null;
  onClose: () => void;
  onPaid: () => void;
  storeUsdRate?: number | null;
}) {
  const [debt, setDebt] = useState<DebtBreakdown | null>(null);
  const [unit, setUnit] = useState<"som" | "usd">("som");
  const [amount, setAmount] = useState("");
  const [somUsdAmount, setSomUsdAmount] = useState("");
  const [somUsdRate, setSomUsdRate] = useState("");
  const [method, setMethod] = useState<"CASH" | "CARD">("CASH");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!target) return;
    setMethod("CASH");
    setError("");
    setDebt(null);
    setAmount(String(target.debt));
    setUnit("som");
    setSomUsdAmount("");
    setSomUsdRate(storeUsdRate ? String(storeUsdRate) : "");
    fetch(`/api/suppliers/${target.id}/debt`)
      .then((res) => res.json())
      .then((data: DebtBreakdown) => {
        setDebt(data);
        const preferUsd = data.debtSom <= 0 && data.debtUsd > 0;
        setUnit(preferUsd ? "usd" : "som");
        if (preferUsd) setAmount(String(data.debtUsd));
      });
  }, [target, storeUsdRate]);

  if (!target) return null;

  // When the supplier has its own dollar-denominated debt, "Dollarda" pays that pool
  // natively (each receipt's own historical rate). Otherwise it converts a dollar
  // payment, at a manually entered rate, toward the so'm-denominated debt.
  const dollarMode: "native" | "manual" = debt && debt.debtUsd > 0 ? "native" : "manual";
  const nativeSomPreview =
    unit === "usd" && dollarMode === "native" && debt && debt.debtUsd > 0
      ? Math.round((Number(amount || 0) / debt.debtUsd) * debt.debtUsdSomValue)
      : null;
  const somUsdRateNum = Number(somUsdRate || 0);
  const somFromUsd = Math.round(Number(somUsdAmount || 0) * somUsdRateNum);

  function switchUnit(next: "som" | "usd") {
    if (!debt) return;
    if (next === "som" && debt.debtSom <= 0) return;
    if (next === "usd" && debt.debtSom <= 0 && debt.debtUsd <= 0) return;
    setUnit(next);
    if (next === "som") setAmount(String(debt.debtSom));
    else if (debt.debtUsd > 0) setAmount(String(debt.debtUsd));
  }

  function fillSomUsd(fraction: 0.5 | 1) {
    if (!debt || somUsdRateNum <= 0) return;
    setSomUsdAmount(String(Math.round(((debt.debtSom * fraction) / somUsdRateNum) * 100) / 100));
  }

  const canSubmit =
    unit === "som"
      ? Number(amount || 0) > 0
      : dollarMode === "native"
        ? Number(amount || 0) > 0
        : Number(somUsdAmount || 0) > 0 && somUsdRateNum > 0;

  async function submit() {
    setSaving(true);
    setError("");
    const body =
      unit === "usd" && dollarMode === "manual"
        ? {
            amount: somFromUsd,
            method,
            currency: "som",
            paidUsdAmount: Number(somUsdAmount || 0),
            paidUsdRate: somUsdRateNum,
          }
        : { amount: Number(amount), method, currency: unit };
    const res = await fetch(`/api/suppliers/${target!.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    onPaid();
    onClose();
  }

  return (
    <Modal open={!!target} onClose={onClose} title={`${target.name} — qarz to'lash`}>
      <div className="flex flex-col gap-3">
        <div className="rounded-lg bg-surface-muted p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">So&apos;m qarzi</span>
            <span className="font-semibold">{formatSom(target.debt)}</span>
          </div>
          {debt && debt.debtUsd > 0 && (
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted">Dollar qarzi</span>
              <span className="font-semibold text-accent">{formatUsdAmount(debt.debtUsd)}</span>
            </div>
          )}
        </div>

        <Field label="To'lov qaysi pulda beriladi">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => switchUnit("som")}
              disabled={!debt || debt.debtSom <= 0}
              className={cn(
                "h-10 rounded-lg border border-border text-sm font-medium text-muted disabled:cursor-not-allowed disabled:opacity-40",
                unit === "som" && "border-accent bg-accent-soft text-accent"
              )}
            >
              So&apos;mda
            </button>
            <button
              type="button"
              onClick={() => switchUnit("usd")}
              disabled={!debt || (debt.debtSom <= 0 && debt.debtUsd <= 0)}
              className={cn(
                "h-10 rounded-lg border border-border text-sm font-medium text-muted disabled:cursor-not-allowed disabled:opacity-40",
                unit === "usd" && "border-accent bg-accent-soft text-accent"
              )}
            >
              Dollarda
            </button>
          </div>
        </Field>

        {unit === "usd" && dollarMode === "manual" ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="To'lov miqdori ($)">
                <Input type="number" value={somUsdAmount} onChange={(e) => setSomUsdAmount(e.target.value)} />
              </Field>
              <Field label="Kurs (1$=?so'm)">
                <Input type="number" value={somUsdRate} onChange={(e) => setSomUsdRate(e.target.value)} />
              </Field>
            </div>
            <div className="-mt-2 flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillSomUsd(0.5)}
                disabled={somUsdRateNum <= 0}
                className="rounded-full border border-border px-2.5 py-1 font-medium text-muted hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                Yarmi
              </button>
              <button
                type="button"
                onClick={() => fillSomUsd(1)}
                disabled={somUsdRateNum <= 0}
                className="rounded-full border border-accent bg-accent-soft px-2.5 py-1 font-medium text-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                Hammasi
              </button>
            </div>
            <p className="-mt-1 text-xs text-muted">≈ {formatSom(somFromUsd)}</p>
          </>
        ) : (
          <>
            <Field label={unit === "usd" ? "To'lov miqdori ($)" : "To'lov summasi (so'm)"}>
              <Input
                type="number"
                value={amount}
                max={unit === "usd" ? (debt?.debtUsd ?? 0) : (debt?.debtSom ?? 0)}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <div className="-mt-2 flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setAmount(String((unit === "usd" ? (debt?.debtUsd ?? 0) : (debt?.debtSom ?? 0)) / 2))}
                className="rounded-full border border-border px-2.5 py-1 font-medium text-muted hover:border-accent hover:text-accent"
              >
                Yarmi
              </button>
              <button
                type="button"
                onClick={() => setAmount(String(unit === "usd" ? (debt?.debtUsd ?? 0) : (debt?.debtSom ?? 0)))}
                className="rounded-full border border-accent bg-accent-soft px-2.5 py-1 font-medium text-accent"
              >
                Hammasi
              </button>
            </div>
            {nativeSomPreview !== null && (
              <p className="-mt-1 text-xs text-muted">
                ≈ {formatSom(nativeSomPreview)} (har bir tovar o&apos;z kursiga ko&apos;ra hisoblanadi)
              </p>
            )}
          </>
        )}

        <Field label="To'lov usuli">
          <Select value={method} onChange={(e) => setMethod(e.target.value as "CASH" | "CARD")}>
            <option value="CASH">Naqd</option>
            <option value="CARD">Karta</option>
          </Select>
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button onClick={submit} disabled={saving || !canSubmit} className="mt-2">
          {saving && <Loader2 size={16} className="animate-spin" />}
          Tasdiqlash
        </Button>
      </div>
    </Modal>
  );
}
