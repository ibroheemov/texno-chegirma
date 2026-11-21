"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@prisma/client";
import {
  Loader2,
  Phone,
  Clock,
  CheckCircle2,
  PackageCheck,
  Ban,
  History,
  Plus,
  Wallet,
  PackagePlus,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { formatSom, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { CustomerOption } from "./MoliyaTabs";

type Status = "ACTIVE" | "COMPLETED" | "DELIVERED" | "CANCELED";

type Payment = {
  id: string;
  amount: number;
  method: "CASH" | "CARD";
  note: string | null;
  createdAt: string;
};

type Order = {
  id: string;
  productName: string;
  qty: number;
  totalCost: number;
  totalUsd: number | null;
  paidAmount: number;
  status: Status;
  note: string | null;
  deliveredAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  customer: { id: string; name: string; phone: string | null };
  payments: Payment[];
};

function formatUsdAmount(amount: number) {
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function XaqdorlarTab({ customers, products }: { customers: CustomerOption[]; products: Product[] }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<Order | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/layaway");
    const data = await res.json();
    setOrders(data.orders ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const active = orders.filter((o) => o.status === "ACTIVE");
  const ready = orders.filter((o) => o.status === "COMPLETED");
  const done = orders.filter((o) => o.status === "DELIVERED" || o.status === "CANCELED");

  const totalCollected = useMemo(
    () => orders.filter((o) => o.status !== "CANCELED").reduce((s, o) => s + o.paidAmount, 0),
    [orders]
  );
  const totalPending = useMemo(
    () => active.reduce((s, o) => s + Math.max(0, o.totalCost - o.paidAmount), 0),
    [active]
  );

  async function deliver(order: Order) {
    setBusyId(order.id);
    setActionError("");
    const res = await fetch(`/api/layaway/${order.id}/deliver`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    load();
  }

  async function cancel(order: Order) {
    if (!window.confirm(`${order.customer.name} uchun "${order.productName}" buyurtmasini bekor qilasizmi?`)) return;
    setBusyId(order.id);
    setActionError("");
    const res = await fetch(`/api/layaway/${order.id}/cancel`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="-mt-2 text-xs text-muted">
        Mijoz mahsulot narxini qismlab, xohlagan vaqtida to&apos;laydi; narx to&apos;liq yopilgach mahsulot
        topshiriladi.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Yig'ilgan summa" value={formatSom(totalCollected)} icon={Wallet} />
        <StatCard label="Kutilayotgan summa" value={formatSom(totalPending)} icon={Clock} />
        <StatCard label="Faol buyurtmalar" value={String(active.length)} icon={PackagePlus} />
        <StatCard label="Berishga tayyor" value={String(ready.length)} icon={PackageCheck} />
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Yangi buyurtma
        </Button>
      </div>

      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      {ready.length > 0 && (
        <OrderGroup
          title="To'liq to'langan — berishga tayyor"
          icon={<PackageCheck size={16} className="text-accent" />}
          items={ready}
          busyId={busyId}
          onPay={setPayTarget}
          onHistory={setHistoryId}
          onDeliver={deliver}
          onCancel={cancel}
        />
      )}
      {active.length > 0 && (
        <OrderGroup
          title="Yig'ilmoqda"
          icon={<Clock size={16} className="text-warning" />}
          items={active}
          busyId={busyId}
          onPay={setPayTarget}
          onHistory={setHistoryId}
          onDeliver={deliver}
          onCancel={cancel}
        />
      )}
      {done.length > 0 && (
        <OrderGroup
          title="Yakunlangan"
          icon={<CheckCircle2 size={16} className="text-muted" />}
          items={done}
          busyId={busyId}
          onPay={setPayTarget}
          onHistory={setHistoryId}
          onDeliver={deliver}
          onCancel={cancel}
          readOnly
        />
      )}
      {orders.length === 0 && (
        <Card className="p-10 text-center text-sm text-muted">Hali Xaqdorlar buyurtmalari yo&apos;q</Card>
      )}

      <CreateOrderModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={load}
        customers={customers}
        products={products}
      />
      <PayModal order={payTarget} onClose={() => setPayTarget(null)} onPaid={() => { setPayTarget(null); load(); }} />
      <HistoryModal
        order={orders.find((o) => o.id === historyId) ?? null}
        onClose={() => setHistoryId(null)}
      />
    </div>
  );
}

function OrderGroup({
  title,
  icon,
  items,
  busyId,
  onPay,
  onHistory,
  onDeliver,
  onCancel,
  readOnly,
}: {
  title: string;
  icon: React.ReactNode;
  items: Order[];
  busyId: string | null;
  onPay: (o: Order) => void;
  onHistory: (id: string) => void;
  onDeliver: (o: Order) => void;
  onCancel: (o: Order) => void;
  readOnly?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold">
          {title} ({items.length})
        </h3>
      </div>
      <div className="flex flex-col divide-y divide-border/60">
        {items.map((o) => {
          const remaining = Math.max(0, o.totalCost - o.paidAmount);
          const pct = o.totalCost > 0 ? Math.min(100, Math.round((o.paidAmount / o.totalCost) * 100)) : 0;
          return (
            <div key={o.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
                  {o.customer.name.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-semibold">{o.customer.name}</p>
                  {o.customer.phone && (
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <Phone size={11} /> {o.customer.phone}
                    </p>
                  )}
                  <p className="text-xs text-muted">
                    {o.productName} {o.qty > 1 && `× ${o.qty}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                <div className="min-w-[8rem] text-right">
                  <p className="text-sm font-semibold">
                    {formatSom(o.paidAmount)}{" "}
                    <span className="text-xs font-normal text-muted">/ {formatSom(o.totalCost)}</span>
                  </p>
                  {o.status === "ACTIVE" ? (
                    <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-surface-muted">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted">{formatDate(o.createdAt)}</p>
                  )}
                </div>

                {o.status === "ACTIVE" && <Badge tone="warning">{formatSom(remaining)} qoldi</Badge>}
                {o.status === "COMPLETED" && <Badge tone="accent">To&apos;liq to&apos;landi</Badge>}
                {o.status === "DELIVERED" && <Badge tone="accent">Berildi</Badge>}
                {o.status === "CANCELED" && <Badge tone="danger">Bekor qilindi</Badge>}

                <button
                  onClick={() => onHistory(o.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-accent"
                  aria-label="To'lovlar tarixi"
                  title="To'lovlar tarixi"
                >
                  <History size={14} />
                </button>

                {!readOnly && o.status === "ACTIVE" && (
                  <Button size="sm" onClick={() => onPay(o)}>
                    To&apos;lov qo&apos;shish
                  </Button>
                )}
                {!readOnly && o.status === "COMPLETED" && (
                  <Button size="sm" onClick={() => onDeliver(o)} disabled={busyId === o.id}>
                    {busyId === o.id && <Loader2 size={14} className="animate-spin" />}
                    Mahsulot berildi
                  </Button>
                )}
                {!readOnly && (o.status === "ACTIVE" || o.status === "COMPLETED") && (
                  <button
                    onClick={() => onCancel(o)}
                    disabled={busyId === o.id}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                    aria-label="Bekor qilish"
                    title="Bekor qilish"
                  >
                    <Ban size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function PayModal({ order, onClose, onPaid }: { order: Order | null; onClose: () => void; onPaid: () => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"CASH" | "CARD">("CASH");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (order) {
      setAmount(String(Math.max(0, order.totalCost - order.paidAmount)));
      setMethod("CASH");
      setNote("");
      setError("");
    }
  }, [order]);

  if (!order) return null;
  const remaining = Math.max(0, order.totalCost - order.paidAmount);

  async function submit() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/layaway/${order!.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), method, note }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    onPaid();
  }

  return (
    <Modal open={!!order} onClose={onClose} title={`${order.customer.name} — to'lov qo'shish`}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          {order.productName} — qoldiq: <span className="font-semibold text-foreground">{formatSom(remaining)}</span>
        </p>
        <Field label="To'lov summasi (so'm)">
          <Input type="number" value={amount} max={remaining} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <div className="-mt-1 flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setAmount(String(Math.round(remaining / 2)))}
            className="rounded-full border border-border px-2.5 py-1 font-medium text-muted hover:border-accent hover:text-accent"
          >
            Yarmi
          </button>
          <button
            type="button"
            onClick={() => setAmount(String(remaining))}
            className="rounded-full border border-accent bg-accent-soft px-2.5 py-1 font-medium text-accent"
          >
            Hammasi
          </button>
        </div>
        <Field label="To'lov usuli">
          <Select value={method} onChange={(e) => setMethod(e.target.value as "CASH" | "CARD")}>
            <option value="CASH">Naqd</option>
            <option value="CARD">Karta</option>
          </Select>
        </Field>
        <Field label="Izoh (ixtiyoriy)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
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

function HistoryModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
  if (!order) return null;
  return (
    <Modal open={!!order} onClose={onClose} title={`To'lovlar tarixi — ${order.customer.name}`}>
      <div className="flex flex-col gap-3">
        <div className="rounded-lg bg-surface-muted p-3 text-sm">
          <p className="font-medium">
            {order.productName} {order.qty > 1 && `× ${order.qty}`}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs text-muted">
            <span>Jami narx: {formatSom(order.totalCost)}</span>
            <span>To&apos;langan: {formatSom(order.paidAmount)}</span>
          </div>
        </div>
        {order.payments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Hali to&apos;lov qilinmagan</p>
        ) : (
          <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
            {order.payments.map((p) => (
              <div key={p.id} className="rounded-md bg-surface-muted px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted">
                    {formatDateTime(p.createdAt)} · {p.method === "CARD" ? "karta" : "naqd"}
                  </p>
                  <span className="text-xs font-semibold text-accent">{formatSom(p.amount)}</span>
                </div>
                {p.note && <p className="mt-1 text-xs text-muted">Izoh: {p.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function CreateOrderModal({
  open,
  onClose,
  onSaved,
  customers,
  products,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  customers: CustomerOption[];
  products: Product[];
}) {
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newCustomerNote, setNewCustomerNote] = useState("");
  const [productMode, setProductMode] = useState<"ombor" | "custom">("ombor");
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [qty, setQty] = useState("1");
  const [currency, setCurrency] = useState<"som" | "usd">("som");
  const [unitPrice, setUnitPrice] = useState("");
  const [usdRateInput, setUsdRateInput] = useState("");
  const [initialPayment, setInitialPayment] = useState("");
  const [method, setMethod] = useState<"CASH" | "CARD">("CASH");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setCustomerMode("existing");
      setCustomerSearch("");
      setCustomerId("");
      setCustomerDropdownOpen(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerAddress("");
      setNewCustomerNote("");
      setProductMode("ombor");
      setProductId("");
      setProductName("");
      setQty("1");
      setCurrency("som");
      setUnitPrice("");
      setInitialPayment("");
      setMethod("CASH");
      setNote("");
      setError("");
      fetch("/api/usd-rate")
        .then((r) => r.json())
        .then((d) => {
          const info = d.rate as { rate: number } | null;
          if (info) setUsdRateInput(String(info.rate));
        })
        .catch(() => {});
    }
  }, [open]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId]
  );
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [customers, customerSearch]);

  const selectedProduct = useMemo(() => products.find((p) => p.id === productId) ?? null, [products, productId]);

  const qtyNum = Math.max(1, Number(qty) || 1);
  const parsedUnitPrice = Number(unitPrice || 0);
  const parsedUsdRate = Number(usdRateInput || 0);
  const totalUsd = currency === "usd" ? Math.round(parsedUnitPrice * qtyNum * 100) / 100 : 0;
  const totalCost =
    currency === "usd" && parsedUsdRate > 0
      ? Math.round(totalUsd * parsedUsdRate)
      : Math.round(parsedUnitPrice * qtyNum);

  function pickProduct(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) {
      setProductName(p.name);
      if (currency === "som") setUnitPrice(String(p.price));
    }
  }

  async function save() {
    setError("");
    if (customerMode === "existing" && !customerId) {
      setError("Mijozni tanlang");
      return;
    }
    if (customerMode === "new" && !newCustomerName.trim()) {
      setError("Mijoz ismini kiriting");
      return;
    }
    const name = productMode === "ombor" ? selectedProduct?.name ?? "" : productName.trim();
    if (!name) {
      setError("Mahsulot nomini kiriting");
      return;
    }
    if (!totalCost || totalCost <= 0) {
      setError("Narxni kiriting");
      return;
    }
    const deposit = Number(initialPayment || 0);
    if (deposit > totalCost) {
      setError("Boshlang'ich to'lov narxdan oshmasligi kerak");
      return;
    }
    setSaving(true);

    let resolvedCustomerId = customerId;
    if (customerMode === "new") {
      const customerRes = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim(),
          address: newCustomerAddress.trim(),
          note: newCustomerNote.trim(),
        }),
      });
      const customerData = await customerRes.json();
      if (!customerRes.ok) {
        setSaving(false);
        setError(customerData.error ?? "Mijozni saqlab bo'lmadi");
        return;
      }
      resolvedCustomerId = customerData.customer.id;
    }

    const res = await fetch("/api/layaway", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: resolvedCustomerId,
        productId: productMode === "ombor" ? productId || undefined : undefined,
        productName: name,
        qty: qtyNum,
        totalCost,
        totalUsd: currency === "usd" ? totalUsd : undefined,
        initialPayment: deposit || undefined,
        method,
        note,
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
    <Modal open={open} onClose={onClose} title="Yangi Xaqdor buyurtmasi">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted">Mijoz</label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setCustomerMode("existing")}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium text-muted",
                  customerMode === "existing" && "bg-accent-soft text-accent"
                )}
              >
                Ro&apos;yxatdan
              </button>
              <button
                type="button"
                onClick={() => setCustomerMode("new")}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium text-muted",
                  customerMode === "new" && "bg-accent-soft text-accent"
                )}
              >
                Yangi mijoz
              </button>
            </div>
          </div>
          {customerMode === "existing" ? (
            <div className="relative">
              <Input
                value={selectedCustomer ? selectedCustomer.name : customerSearch}
                onChange={(e) => {
                  setCustomerId("");
                  setCustomerSearch(e.target.value);
                  setCustomerDropdownOpen(true);
                }}
                onFocus={() => setCustomerDropdownOpen(true)}
                placeholder="Ism yoki telefon bo'yicha qidirish..."
              />
              {customerDropdownOpen && !customerId && filteredCustomers.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCustomerId(c.id);
                        setCustomerSearch("");
                        setCustomerDropdownOpen(false);
                      }}
                      className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-surface-muted"
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.phone && <span className="text-xs text-muted">{c.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Input
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Ism familiya"
              />
              <Input
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="Telefon raqami (ixtiyoriy)"
              />
              <Input
                value={newCustomerAddress}
                onChange={(e) => setNewCustomerAddress(e.target.value)}
                placeholder="Manzil (ixtiyoriy)"
              />
              <Input
                value={newCustomerNote}
                onChange={(e) => setNewCustomerNote(e.target.value)}
                placeholder="Izoh (ixtiyoriy)"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setProductMode("ombor")}
            className={cn(
              "h-10 rounded-lg border border-border text-sm font-medium text-muted",
              productMode === "ombor" && "border-accent bg-accent-soft text-accent"
            )}
          >
            Ombordan
          </button>
          <button
            type="button"
            onClick={() => {
              setProductMode("custom");
              setProductId("");
            }}
            className={cn(
              "h-10 rounded-lg border border-border text-sm font-medium text-muted",
              productMode === "custom" && "border-accent bg-accent-soft text-accent"
            )}
          >
            Boshqa mahsulot
          </button>
        </div>

        {productMode === "ombor" ? (
          <Field label="Mahsulot">
            <Select value={productId} onChange={(e) => pickProduct(e.target.value)}>
              <option value="">Tanlang</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.stock} dona mavjud)
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Mahsulot nomi">
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Masalan: iPhone 15 Pro" />
          </Field>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Field label="Soni">
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Field label={currency === "usd" ? "Narx ($, 1 dona)" : "Narx (so'm, 1 dona)"}>
            <Input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          </Field>
          <Field label="Valyuta">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value as "som" | "usd")}>
              <option value="som">So&apos;m</option>
              <option value="usd">Dollar</option>
            </Select>
          </Field>
        </div>
        {currency === "usd" && (
          <Field label="Kurs (1$=?so'm)">
            <Input type="number" value={usdRateInput} onChange={(e) => setUsdRateInput(e.target.value)} />
          </Field>
        )}
        <p className="-mt-1 text-xs text-muted">
          Jami narx: <span className="font-semibold text-foreground">{formatSom(totalCost)}</span>
          {currency === "usd" && totalUsd > 0 && <span> ({formatUsdAmount(totalUsd)})</span>}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Boshlang'ich to'lov (ixtiyoriy)">
            <Input type="number" value={initialPayment} onChange={(e) => setInitialPayment(e.target.value)} />
          </Field>
          <Field label="To'lov usuli">
            <Select value={method} onChange={(e) => setMethod(e.target.value as "CASH" | "CARD")}>
              <option value="CASH">Naqd</option>
              <option value="CARD">Karta</option>
            </Select>
          </Field>
        </div>

        <Field label="Izoh (ixtiyoriy)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
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
