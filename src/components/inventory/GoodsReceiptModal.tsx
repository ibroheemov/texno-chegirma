"use client";

import { useEffect, useState } from "react";
import { Loader2, Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

export type SupplierOption = { id: string; name: string };
export type ProductOption = { id: string; name: string };

export function GoodsReceiptModal({
  open,
  onClose,
  onSaved,
  suppliers,
  products,
  storeUsdRate,
  initialProductId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  suppliers: SupplierOption[];
  products: ProductOption[];
  storeUsdRate?: number | null;
  initialProductId?: string;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [qty, setQty] = useState("1");
  const [currency, setCurrency] = useState<"som" | "usd">("som");
  const [totalCost, setTotalCost] = useState("");
  const [costUsd, setCostUsd] = useState("");
  const [usdRateInput, setUsdRateInput] = useState("");
  const [usdRateHint, setUsdRateHint] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "CREDIT">("CASH");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setSupplierId(suppliers[0]?.id ?? "");
      setQty("1");
      setCurrency("som");
      setTotalCost("");
      setCostUsd("");
      const initialRate = storeUsdRate ? String(storeUsdRate) : "";
      setUsdRateInput(initialRate);
      setUsdRateHint("");
      // Apply the live CBU rate (the form's rate field starts out as the store's
      // manual rate, which is only a fallback).
      fetch("/api/usd-rate")
        .then((res) => res.json())
        .then((d) => {
          const info = d.rate as { rate: number; source: "cbu" | "manual"; date?: string } | null;
          if (!info) return;
          setUsdRateInput((prev) => (prev === initialRate ? String(info.rate) : prev));
          setUsdRateHint(info.source === "cbu" ? `CBU kursi (${info.date})` : "Qo'lda kiritilgan kurs");
        })
        .catch(() => {});
      setPaymentMethod("CASH");
      setError("");
      const initial = initialProductId ? products.find((p) => p.id === initialProductId) : undefined;
      setProductId(initial?.id ?? "");
      setProductName(initial?.name ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, suppliers, storeUsdRate, initialProductId]);

  function pickProduct(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) setProductName(p.name);
  }

  const parsedUsdRate = Number(usdRateInput || 0);
  // In dollar mode "Narx ($)" is the price of ONE unit: total = qty x price.
  const qtyNum = Math.max(0, Number(qty) || 0);
  const totalUsd = Math.round(Number(costUsd || 0) * qtyNum * 100) / 100;
  const effectiveTotalCost =
    currency === "usd" && parsedUsdRate > 0 ? Math.round(totalUsd * parsedUsdRate) : Number(totalCost || 0);

  async function save() {
    if (!supplierId || !productName.trim() || !qty || !effectiveTotalCost) {
      setError("Barcha maydonlarni to'ldiring");
      return;
    }
    if (currency === "usd" && (!costUsd || !parsedUsdRate)) {
      setError("Narx ($) va kursni kiriting");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/goods-receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId,
        productId: productId || undefined,
        productName,
        qty,
        totalCost: effectiveTotalCost,
        currency,
        costUsd: currency === "usd" ? totalUsd : undefined,
        usdRate: currency === "usd" ? parsedUsdRate : undefined,
        paymentMethod,
      }),
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
    <Modal open={open} onClose={onClose} title="Tovar kirimi qo'shish">
      <div className="flex flex-col gap-3">
        <Field label="Yetkazib beruvchi">
          <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Tanlang</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mahsulot (ombordan, ixtiyoriy)">
          <Select value={productId} onChange={(e) => pickProduct(e.target.value)}>
            <option value="">Ombordan tanlamasdan davom etish</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mahsulot nomi">
          <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
        </Field>
        <Field label="Soni (dona)">
          <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCurrency("som")}
            className={cn(
              "h-10 rounded-lg border border-border text-sm font-medium text-muted",
              currency === "som" && "border-accent bg-accent-soft text-accent"
            )}
          >
            So&apos;m
          </button>
          <button
            type="button"
            onClick={() => setCurrency("usd")}
            className={cn(
              "h-10 rounded-lg border border-border text-sm font-medium text-muted",
              currency === "usd" && "border-accent bg-accent-soft text-accent"
            )}
          >
            Dollar
          </button>
        </div>

        {currency === "usd" ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Narx ($, 1 dona)">
                <Input type="number" value={costUsd} onChange={(e) => setCostUsd(e.target.value)} />
              </Field>
              <Field label="Kurs (1$=?so'm)">
                <Input type="number" step="any" value={usdRateInput} onChange={(e) => setUsdRateInput(e.target.value)} />
                {usdRateHint && <p className="mt-1 text-[10px] text-muted">{usdRateHint}</p>}
              </Field>
              <Field label="Jami (so'm)">
                <Input
                  type="text"
                  value={effectiveTotalCost ? effectiveTotalCost.toLocaleString("en-US") : ""}
                  readOnly
                  disabled
                />
              </Field>
            </div>
            {totalUsd > 0 && (
              <p className="-mt-1 text-xs text-muted">
                Jami: <span className="font-semibold text-foreground">${totalUsd.toLocaleString("en-US")}</span> ({qtyNum} × $
                {Number(costUsd).toLocaleString("en-US")})
              </p>
            )}
          </>
        ) : (
          <Field label="Umumiy summa (so'm)">
            <Input type="number" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} />
          </Field>
        )}

        <Field label="To'lov usuli">
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "CARD" | "CREDIT")}>
            <option value="CASH">Naqd</option>
            <option value="CARD">Karta</option>
            <option value="CREDIT">Nasiya (qarzga)</option>
          </Select>
        </Field>
        {productId && (
          <p className="text-xs text-muted">Tasdiqlashda ombordagi zaxira avtomatik oshiriladi.</p>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button onClick={save} disabled={saving} className="mt-2">
          {saving && <Loader2 size={16} className="animate-spin" />}
          <Truck size={16} /> Saqlash
        </Button>
      </div>
    </Modal>
  );
}
