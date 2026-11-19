"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { formatSom } from "@/lib/format";
import { cn } from "@/lib/cn";

function formatUsdAmount(amount: number) {
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export type PayTarget = {
  id: string; // supplier id
  name: string;
  debt: number;
  // When set, only these receipts are paid (a single product row's debt).
  receiptIds?: string[];
  title?: string;
};

type DebtBreakdown = { debtTotal: number; debtSom: number; debtUsd: number; debtUsdSomValue: number };

export function PaySupplierModal({
  target,
  onClose,
  onPaid,
  storeUsdRate,
}: {
  target: PayTarget | null;
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
    const query = target.receiptIds?.length ? `?receiptIds=${target.receiptIds.join(",")}` : "";
    fetch(`/api/suppliers/${target.id}/debt${query}`)
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
    const body: Record<string, unknown> =
      unit === "usd" && dollarMode === "manual"
        ? {
            amount: somFromUsd,
            method,
            currency: "som",
            paidUsdAmount: Number(somUsdAmount || 0),
            paidUsdRate: somUsdRateNum,
          }
        : { amount: Number(amount), method, currency: unit };
    if (target!.receiptIds?.length) body.receiptIds = target!.receiptIds;
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
    <Modal open={!!target} onClose={onClose} title={target.title ?? `${target.name} — qarz to'lash`}>
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
