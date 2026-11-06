"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Product, Category, Customer } from "@prisma/client";
import { Search, Plus, Minus, Trash2, ScanBarcode, Loader2, CheckCircle2, X, Printer } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/ui/ProductImage";
import { formatSom, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { BarcodeScannerModal } from "./BarcodeScannerModal";

type ProductWithCategory = Product & { category: Category | null };

type CartLine = {
  product: ProductWithCategory;
  qty: number;
};

type StatusFilter = "all" | "available" | "low" | "out";
type PaymentMethod = "CASH" | "CARD" | "CREDIT" | "MIXED";

type ReceiptSettings = {
  storeName: string;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  telegramUsername: string | null;
  footer: string | null;
  autoPrint: boolean;
};

type LastSale = {
  items: { name: string; qty: number; price: number }[];
  total: number;
  method: PaymentMethod;
  customerName: string | null;
  createdAt: Date;
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Naqd",
  CARD: "Karta",
  CREDIT: "Nasiya",
  MIXED: "Aralash",
};

function printReceipt(sale: LastSale, settings: ReceiptSettings) {
  const win = window.open("", "_blank", "width=380,height=600");
  if (!win) return;
  const rows = sale.items
    .map(
      (i) => `
      <div class="row">
        <span>${escapeHtml(i.name)} × ${i.qty}</span>
        <span>${formatSom(i.price * i.qty)}</span>
      </div>`
    )
    .join("");

  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Chek</title>
        <style>
          body { font-family: monospace; width: 280px; margin: 0 auto; padding: 16px; color: #111; }
          .center { text-align: center; }
          .logo { max-width: 64px; max-height: 64px; margin: 0 auto 8px; display: block; }
          h1 { font-size: 16px; margin: 0 0 2px; }
          p { margin: 2px 0; font-size: 11px; }
          .divider { border-top: 1px dashed #999; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; font-size: 12px; margin: 2px 0; }
          .total { font-weight: bold; font-size: 14px; }
          .footer { margin-top: 10px; font-size: 11px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="center">
          ${settings.logoUrl ? `<img class="logo" src="${settings.logoUrl}" alt="" />` : ""}
          <h1>${escapeHtml(settings.storeName)}</h1>
          ${settings.phone ? `<p>${escapeHtml(settings.phone)}</p>` : ""}
          ${settings.address ? `<p>${escapeHtml(settings.address)}</p>` : ""}
          ${settings.telegramUsername ? `<p>${escapeHtml(settings.telegramUsername)}</p>` : ""}
        </div>
        <div class="divider"></div>
        <p>${formatDateTime(sale.createdAt)}</p>
        ${sale.customerName ? `<p>Mijoz: ${escapeHtml(sale.customerName)}</p>` : ""}
        <div class="divider"></div>
        ${rows}
        <div class="divider"></div>
        <div class="row total"><span>JAMI</span><span>${formatSom(sale.total)}</span></div>
        <p>To&apos;lov: ${METHOD_LABEL[sale.method]}</p>
        ${settings.footer ? `<div class="footer">${escapeHtml(settings.footer)}</div>` : ""}
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `);
  win.document.close();
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function effectivePrice(p: Product) {
  return p.onSale && p.salePrice ? p.salePrice : p.price;
}

function stockBadge(p: Product) {
  if (p.stock <= 0) return <Badge tone="danger">Tugagan</Badge>;
  if (p.stock <= p.lowStockAt) return <Badge tone="warning">Kam qoldi · {p.stock}</Badge>;
  return <Badge tone="accent">{p.stock} dona</Badge>;
}

export function PosView({
  initialProducts,
  categories,
  customers,
  enableMixedPayment = true,
  receipt,
}: {
  initialProducts: ProductWithCategory[];
  categories: Category[];
  customers: Customer[];
  enableMixedPayment?: boolean;
  receipt?: ReceiptSettings;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newCustomerNote, setNewCustomerNote] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [mixedCash, setMixedCash] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lastSale, setLastSale] = useState<LastSale | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (status !== "all") params.set("status", status);
      if (categoryId) params.set("categoryId", categoryId);
      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      setProducts(data.products ?? []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query, status, categoryId]);

  function addToCart(product: ProductWithCategory) {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  }

  function changeQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product.id === productId
            ? { ...l, qty: Math.min(l.product.stock, Math.max(0, l.qty + delta)) }
            : l
        )
        .filter((l) => l.qty > 0)
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }

  const handleScanned = useCallback(
    async (code: string) => {
      setScannerOpen(false);
      setError("");
      const match = products.find((p) => p.sku.toLowerCase() === code.toLowerCase());
      if (match) {
        addToCart(match);
        return;
      }
      const res = await fetch(`/api/products?q=${encodeURIComponent(code)}&take=1`);
      const data = await res.json();
      const found = (data.products ?? [])[0];
      if (found && found.sku.toLowerCase() === code.toLowerCase()) {
        addToCart(found);
      } else {
        setError(`"${code}" kodli mahsulot topilmadi`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products]
  );

  const total = useMemo(
    () => cart.reduce((sum, l) => sum + effectivePrice(l.product) * l.qty, 0),
    [cart]
  );
  const totalQty = useMemo(() => cart.reduce((sum, l) => sum + l.qty, 0), [cart]);

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

  async function checkout() {
    setError("");
    if (!cart.length) {
      setError("Savatcha bo'sh");
      return;
    }
    if (method === "CREDIT" && customerMode === "existing" && !customerId) {
      setError("Nasiya uchun mijoz tanlang");
      return;
    }
    if (method === "CREDIT" && customerMode === "new" && !newCustomerName.trim()) {
      setError("Nasiya uchun mijoz ismini kiriting");
      return;
    }
    setSubmitting(true);

    let resolvedCustomerId = customerId || undefined;
    if (customerMode === "new" && newCustomerName.trim()) {
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
        setSubmitting(false);
        setError(customerData.error ?? "Mijozni saqlab bo'lmadi");
        return;
      }
      resolvedCustomerId = customerData.customer.id;
    }

    const cashAmount = method === "CASH" ? total : method === "MIXED" ? mixedCash : 0;
    const cardAmount = method === "CARD" ? total : method === "MIXED" ? total - mixedCash : 0;
    const creditAmount = method === "CREDIT" ? total : 0;

    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((l) => ({ productId: l.product.id, qty: l.qty })),
        paymentMethod: method,
        customerId: resolvedCustomerId,
        cashAmount,
        cardAmount,
        creditAmount,
      }),
    });
    setSubmitting(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    const completedSale: LastSale = {
      items: cart.map((l) => ({ name: l.product.name, qty: l.qty, price: effectivePrice(l.product) })),
      total,
      method,
      customerName: customerMode === "new" ? newCustomerName.trim() || null : selectedCustomer?.name ?? null,
      createdAt: new Date(),
    };
    setLastSale(completedSale);
    if (receipt?.autoPrint) printReceipt(completedSale, receipt);

    setCart([]);
    setCustomerMode("existing");
    setCustomerId("");
    setCustomerSearch("");
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerAddress("");
    setNewCustomerNote("");
    setMethod("CASH");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
    router.refresh();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const refreshed = await fetch(`/api/products?${params.toString()}`);
    const refreshedData = await refreshed.json();
    setProducts(refreshedData.products ?? []);
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nomi yoki shtrix kod bo'yicha qidirish..."
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={() => setScannerOpen(true)}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-surface-muted px-4 text-sm font-medium text-foreground hover:border-accent hover:text-accent"
          >
            <ScanBarcode size={16} />
            Skaner
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ["all", "Barchasi"],
              ["available", "Mavjud"],
              ["low", "Kam qolgan"],
              ["out", "Tugagan"],
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
          <span className="mx-1 w-px self-stretch bg-border" />
          <button
            onClick={() => setCategoryId(undefined)}
            className={cn(
              "rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted",
              !categoryId && "border-accent bg-accent-soft text-accent"
            )}
          >
            Kategoriyasiz
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={cn(
                "rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted",
                categoryId === c.id && "border-accent bg-accent-soft text-accent"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="relative mt-4">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-surface/60 backdrop-blur-sm">
              <Loader2 className="animate-spin text-accent" size={24} />
            </div>
          )}
          {products.length === 0 && !loading ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted">
              <Search size={28} />
              <p className="text-sm">Hech narsa topilmadi</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={p.stock <= 0}
                  className="flex flex-col items-start gap-2 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ProductImage
                    src={p.imageUrl}
                    name={p.name}
                    className="aspect-square w-full rounded-lg text-xl"
                  />
                  <div className="flex w-full items-start justify-between gap-1">
                    <span className="line-clamp-2 text-sm font-semibold leading-snug">{p.name}</span>
                    <Plus size={16} className="shrink-0 text-accent" />
                  </div>
                  <span className="text-xs text-muted">{p.sku}</span>
                  <div className="flex flex-wrap items-center gap-1">
                    {stockBadge(p)}
                    {p.onSale && p.salePrice && <Badge tone="danger">Chegirma</Badge>}
                  </div>
                  {p.onSale && p.salePrice ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-danger">{formatSom(p.salePrice)}</span>
                      <span className="text-xs text-muted line-through">{formatSom(p.price)}</span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-foreground">{formatSom(p.price)}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="flex h-fit flex-col p-4 xl:sticky xl:top-20">
        <h2 className="text-sm font-semibold">Savatcha</h2>
        {cart.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted">
            Mahsulot qo&apos;shish uchun ro&apos;yxatdan tanlang
          </p>
        ) : (
          <div className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
            {cart.map((l) => (
              <div key={l.product.id} className="flex items-center gap-2 rounded-lg bg-surface-muted p-2">
                <ProductImage
                  src={l.product.imageUrl}
                  name={l.product.name}
                  className="h-9 w-9 shrink-0 rounded-md text-xs"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.product.name}</p>
                  <p className="text-xs text-muted">{formatSom(effectivePrice(l.product))}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => changeQty(l.product.id, -1)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-foreground"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-5 text-center text-sm font-semibold">{l.qty}</span>
                  <button
                    onClick={() => changeQty(l.product.id, 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-foreground"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <button onClick={() => removeLine(l.product.id)} className="text-muted hover:text-danger">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-dashed border-border pt-3 text-sm">
          <span className="text-muted">Jami mahsulot</span>
          <span className="font-semibold">{totalQty} dona</span>
        </div>
        <div className="flex items-center justify-between pt-1 text-base">
          <span className="font-semibold">JAMI</span>
          <span className="font-bold text-accent">{formatSom(total)}</span>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted">Mijoz ma&apos;lumotlari (ixtiyoriy)</label>
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
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={selectedCustomer ? selectedCustomer.name : customerSearch}
                onChange={(e) => {
                  setCustomerId("");
                  setCustomerSearch(e.target.value);
                  setCustomerDropdownOpen(true);
                }}
                onFocus={() => {
                  setCustomerId("");
                  setCustomerDropdownOpen(true);
                }}
                onBlur={() => setTimeout(() => setCustomerDropdownOpen(false), 150)}
                placeholder="Mijoz qidirish (ism, telefon)..."
                className="h-10 w-full rounded-lg border border-border bg-background pl-8 pr-8 text-sm outline-none focus:border-accent"
              />
              {selectedCustomer && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setCustomerId("");
                    setCustomerSearch("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-danger"
                >
                  <X size={14} />
                </button>
              )}
              {customerDropdownOpen && !selectedCustomer && (
                <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
                  {filteredCustomers.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted">Mijoz topilmadi</p>
                  ) : (
                    filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
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
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <input
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Ism familiya"
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              />
              <input
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="Telefon raqami (ixtiyoriy)"
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              />
              <input
                value={newCustomerAddress}
                onChange={(e) => setNewCustomerAddress(e.target.value)}
                placeholder="MFY (Manzil)"
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              />
              <input
                value={newCustomerNote}
                onChange={(e) => setNewCustomerNote(e.target.value)}
                placeholder="Izoh (ixtiyoriy)"
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              />
            </div>
          )}
        </div>

        <div className={cn("mt-3 grid gap-1.5", enableMixedPayment ? "grid-cols-4" : "grid-cols-3")}>
          {(
            [
              ["CASH", "Naqd"],
              ["CARD", "Karta"],
              ["CREDIT", "Nasiya"],
              ...(enableMixedPayment ? [["MIXED", "Aralash"] as [PaymentMethod, string]] : []),
            ] as [PaymentMethod, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMethod(key)}
              className={cn(
                "rounded-lg border border-border py-2 text-xs font-medium text-muted",
                method === key && "border-accent bg-accent-soft text-accent"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {method === "MIXED" && (
          <div className="mt-3 flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted">Naqd summa</label>
            <input
              type="number"
              value={mixedCash}
              min={0}
              max={total}
              onChange={(e) => setMixedCash(Math.min(total, Number(e.target.value)))}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
            />
            <p className="text-xs text-muted">Karta: {formatSom(total - mixedCash)}</p>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        {success && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm text-accent">
              <CheckCircle2 size={14} /> Sotuv muvaffaqiyatli saqlandi
            </p>
            {receipt && lastSale && !receipt.autoPrint && (
              <button
                onClick={() => printReceipt(lastSale, receipt)}
                className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                <Printer size={12} /> Chek chiqarish
              </button>
            )}
          </div>
        )}

        <Button size="lg" className="mt-4" disabled={submitting || cart.length === 0} onClick={checkout}>
          {submitting && <Loader2 size={16} className="animate-spin" />}
          To&apos;lov qilish
        </Button>
      </Card>

      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleScanned}
      />
    </div>
  );
}
