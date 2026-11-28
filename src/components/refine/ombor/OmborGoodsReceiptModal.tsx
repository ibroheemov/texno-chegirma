"use client";

import { useEffect, useState } from "react";
import { Info, Truck } from "lucide-react";
import type { ProductOption, SupplierOption } from "@/components/inventory/GoodsReceiptModal";
import { RfField, RfModal, RfSegment, RfSelect } from "../RfModal";

type Currency = "som" | "usd";
type PaymentMethod = "CASH" | "CARD" | "CREDIT";

// New design version of the Old GoodsReceiptModal: same fields, same /api/goods-receipts payload.
export function OmborGoodsReceiptModal({
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
  // Mounted only while open, so every opening starts with fresh state (and restarts once suppliers load).
  if (!open) return null;
  return (
    <GoodsReceiptForm
      key={`${initialProductId ?? ""}-${suppliers.length}`}
      onClose={onClose}
      onSaved={onSaved}
      suppliers={suppliers}
      products={products}
      storeUsdRate={storeUsdRate}
      initialProductId={initialProductId}
    />
  );
}

function GoodsReceiptForm({
  onClose,
  onSaved,
  suppliers,
  products,
  storeUsdRate,
  initialProductId,
}: {
  onClose: () => void;
  onSaved: () => void;
  suppliers: SupplierOption[];
  products: ProductOption[];
  storeUsdRate?: number | null;
  initialProductId?: string;
}) {
  const initial = initialProductId ? products.find((p) => p.id === initialProductId) : undefined;
  const initialRate = storeUsdRate ? String(storeUsdRate) : "";
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [productId, setProductId] = useState(initial?.id ?? "");
  const [productName, setProductName] = useState(initial?.name ?? "");
  const [qty, setQty] = useState("1");
  const [currency, setCurrency] = useState<Currency>("som");
  const [totalCost, setTotalCost] = useState("");
  const [costUsd, setCostUsd] = useState("");
  const [usdRateInput, setUsdRateInput] = useState(initialRate);
  const [usdRateHint, setUsdRateHint] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // The rate field starts as the store's manual rate (a fallback) and switches to the live rate.
    fetch("/api/usd-rate")
      .then((res) => res.json())
      .then((d) => {
        const info = d.rate as { rate: number; source: "telegram" | "cbu" | "manual"; date?: string } | null;
        if (!info) return;
        setUsdRateInput((prev) => (prev === initialRate ? String(info.rate) : prev));
        setUsdRateHint(
          info.source === "cbu"
            ? `CBU kursi (${info.date})`
            : info.source === "telegram"
              ? "Bozor kursi (Telegram)"
              : "Qo'lda kiritilgan kurs"
        );
      })
      .catch(() => {});
  }, [initialRate]);

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
    <RfModal
      open
      onClose={onClose}
      busy={saving}
      onSubmit={save}
      title="Tovar kirimi qo‘shish"
      description="Yetkazib beruvchidan kelgan tovarni qayd eting."
      icon={<Truck className="ic" size={20} />}
      width={540}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Bekor qilish
          </button>
          <button type="submit" className={`btn btn-primary${saving ? " is-loading" : ""}`} disabled={saving}>
            <Truck className="ic" size={18} />
            Saqlash
          </button>
        </>
      }
    >
      <RfField label="Yetkazib beruvchi" required>
        <RfSelect value={supplierId} onChange={setSupplierId}>
          <option value="">Tanlang</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </RfSelect>
      </RfField>
      <RfField label="Mahsulot (ombordan)" optional>
        <RfSelect value={productId} onChange={pickProduct}>
          <option value="">Ombordan tanlamasdan davom etish</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </RfSelect>
      </RfField>
      <div className="rfm-grid-2">
        <RfField label="Mahsulot nomi" required>
          <span className="control">
            <input value={productName} onChange={(event) => setProductName(event.target.value)} />
          </span>
        </RfField>
        <RfField label="Soni (dona)" required>
          <span className="control">
            <input type="number" inputMode="numeric" value={qty} onChange={(event) => setQty(event.target.value)} />
          </span>
        </RfField>
      </div>

      <RfField label="Valyuta" group>
        <RfSegment
          value={currency}
          onChange={setCurrency}
          ariaLabel="Valyuta"
          options={[
            ["som", "So‘m"],
            ["usd", "Dollar"],
          ]}
        />
      </RfField>

      {currency === "usd" ? (
        <>
          <div className="rfm-grid-3">
            <RfField label="Narx ($, 1 dona)">
              <span className="control">
                <span className="addon">$</span>
                <input type="number" step="any" value={costUsd} onChange={(event) => setCostUsd(event.target.value)} />
              </span>
            </RfField>
            <RfField label="Kurs (1$ = ? so‘m)" help={usdRateHint || undefined}>
              <span className="control">
                <input
                  type="number"
                  step="any"
                  value={usdRateInput}
                  onChange={(event) => setUsdRateInput(event.target.value)}
                />
              </span>
            </RfField>
            <RfField label="Jami (so‘m)">
              <span className="control is-disabled">
                <input
                  className="mono"
                  type="text"
                  value={effectiveTotalCost ? effectiveTotalCost.toLocaleString("en-US") : ""}
                  readOnly
                  disabled
                />
              </span>
            </RfField>
          </div>
          {totalUsd > 0 && (
            <p className="t-body-sm">
              Jami: <b className="mono strong">${totalUsd.toLocaleString("en-US")}</b> ({qtyNum} × $
              {Number(costUsd).toLocaleString("en-US")})
            </p>
          )}
        </>
      ) : (
        <RfField label="Umumiy summa (so‘m)" required>
          <span className="control">
            <input
              type="number"
              inputMode="numeric"
              value={totalCost}
              onChange={(event) => setTotalCost(event.target.value)}
            />
            <span className="addon">so‘m</span>
          </span>
        </RfField>
      )}

      <RfField label="To‘lov usuli">
        <RfSelect value={paymentMethod} onChange={(next) => setPaymentMethod(next as PaymentMethod)}>
          <option value="CASH">Naqd</option>
          <option value="CARD">Karta</option>
          <option value="CREDIT">Nasiya (qarzga)</option>
        </RfSelect>
      </RfField>

      {productId && (
        <div className="alert alert-info rfm-alert">
          <Info className="ic a-ic" size={18} />
          <p>Tasdiqlashda ombordagi zaxira avtomatik oshiriladi.</p>
        </div>
      )}
      {error && (
        <div className="alert alert-danger rfm-alert" role="alert">
          <p>{error}</p>
        </div>
      )}
    </RfModal>
  );
}
