"use client";

import { useEffect, useState } from "react";
import type { Product } from "@prisma/client";
import { Loader2, Plus, Truck, Phone } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { formatSom } from "@/lib/format";

type SupplierRow = {
  id: string;
  name: string;
  phone: string | null;
  distinctProducts: number;
  totalUnits: number;
  totalAmount: number;
  cash: number;
  card: number;
  debt: number;
  receiptsCount: number;
};

function formatUsd(somAmount: number, usdRate: number) {
  return `$${(somAmount / usdRate).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
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
        <p className="mt-1 text-2xl font-bold">{formatSom(totalRecorded)}</p>
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
          {suppliers.map((s) => (
            <Card key={s.id} className="p-4">
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
              <p className="mt-2 text-xs text-muted">
                {s.distinctProducts} tovar, {s.totalUnits} birlik
              </p>
              <p className="mt-1 text-lg font-bold">{formatSom(s.totalAmount)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted">
                {s.cash > 0 && <span>Naqd: {formatSom(s.cash)}</span>}
                {s.card > 0 && <span>Karta: {formatSom(s.card)}</span>}
              </div>
              {s.debt > 0 ? (
                <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3">
                  <Badge tone="danger">Qarz: {debtLabel(s.debt)}</Badge>
                  <Button size="sm" onClick={() => setPayTarget(s)}>
                    To&apos;lash
                  </Button>
                </div>
              ) : (
                <div className="mt-3 border-t border-dashed border-border pt-3">
                  <Badge tone="accent">Qarzi yo&apos;q</Badge>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <AddSupplierModal open={addSupplierOpen} onClose={() => setAddSupplierOpen(false)} onSaved={load} />
      <AddReceiptModal
        open={addReceiptOpen}
        onClose={() => setAddReceiptOpen(false)}
        onSaved={load}
        suppliers={suppliers}
        products={products}
      />
      <PaySupplierModal target={payTarget} onClose={() => setPayTarget(null)} onPaid={load} />
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

function AddReceiptModal({
  open,
  onClose,
  onSaved,
  suppliers,
  products,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  suppliers: SupplierRow[];
  products: Product[];
}) {
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [qty, setQty] = useState("1");
  const [totalCost, setTotalCost] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "CREDIT">("CASH");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setSupplierId(suppliers[0]?.id ?? "");
      setProductId("");
      setProductName("");
      setQty("1");
      setTotalCost("");
      setPaymentMethod("CASH");
      setError("");
    }
  }, [open, suppliers]);

  function pickProduct(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) setProductName(p.name);
  }

  async function save() {
    if (!supplierId || !productName.trim() || !qty || !totalCost) {
      setError("Barcha maydonlarni to'ldiring");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/goods-receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierId, productId: productId || undefined, productName, qty, totalCost, paymentMethod }),
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
        <div className="grid grid-cols-2 gap-2">
          <Field label="Soni (dona)">
            <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Field label="Umumiy summa (so'm)">
            <Input type="number" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} />
          </Field>
        </div>
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

function PaySupplierModal({
  target,
  onClose,
  onPaid,
}: {
  target: SupplierRow | null;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (target) {
      setAmount(String(target.debt));
      setError("");
    }
  }, [target]);

  if (!target) return null;

  async function submit() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/suppliers/${target!.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount) }),
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
        <p className="text-sm text-muted">
          Qoldiq qarz: <span className="font-semibold text-foreground">{formatSom(target.debt)}</span>
        </p>
        <Field label="To'lov summasi (so'm)">
          <Input type="number" value={amount} max={target.debt} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button onClick={submit} disabled={saving} className="mt-2">
          {saving && <Loader2 size={16} className="animate-spin" />}
          Tasdiqlash
        </Button>
      </div>
    </Modal>
  );
}
