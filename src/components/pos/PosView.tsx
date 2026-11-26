"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Product, Category, Customer } from "@prisma/client";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ScanBarcode,
  Loader2,
  CheckCircle2,
  X,
  Printer,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/ui/ProductImage";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { formatSom } from "@/lib/format";
import { productImages } from "@/lib/productImages";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { BarcodeScannerModal } from "./BarcodeScannerModal";
import { DeliveryDatePicker, DeliveryTimePicker } from "./DeliveryDateTimeFields";
import { ReceiptModal } from "./ReceiptModal";
import { MixedPaymentModal } from "./MixedPaymentModal";
import { FigmaPosView } from "./FigmaPosView";
import { printReceipt, type ReceiptSettings, type ReceiptSale } from "@/lib/receipt";

export type ProductWithCategory = Product & { category: Category | null };

export type CartLine = {
  product: ProductWithCategory;
  qty: number;
  adjustment: PriceAdjustment | null;
};

export type PriceAdjustment = {
  direction: "discount" | "increase" | "set";
  unit: "percent" | "amount";
  value: number;
};

type StatusFilter = "all" | "available" | "low" | "out" | "discount";
export type PaymentMethod = "CASH" | "CARD" | "CREDIT" | "MIXED";

type LastSale = ReceiptSale;

function effectivePrice(p: Product) {
  return p.onSale && p.salePrice ? p.salePrice : p.price;
}

function cartUnitPrice(line: CartLine) {
  const basePrice = effectivePrice(line.product);
  if (!line.adjustment) return basePrice;
  if (line.adjustment.direction === "set") return Math.max(0, Math.round(line.adjustment.value));
  const adjustment =
    line.adjustment.unit === "percent"
      ? (basePrice * line.adjustment.value) / 100
      : line.adjustment.value;
  return Math.round(Math.max(0, basePrice + (line.adjustment.direction === "discount" ? -adjustment : adjustment)));
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
  employees,
  currentUserName,
  enableMixedPayment = true,
  customPaymentMethods = [],
  deferredPaymentMethods = {},
  receipt,
  design = "standard",
}: {
  initialProducts: ProductWithCategory[];
  categories: Category[];
  customers: Customer[];
  employees?: { id: string; name: string }[];
  currentUserName?: string;
  enableMixedPayment?: boolean;
  customPaymentMethods?: string[];
  deferredPaymentMethods?: Record<string, boolean>;
  receipt?: ReceiptSettings;
  design?: "standard" | "figma";
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("available");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(false);
  const [cartBaskets, setCartBaskets] = useState<CartLine[][]>([[]]);
  const [activeBasketIndex, setActiveBasketIndex] = useState(0);
  const cart = useMemo(
    () => cartBaskets[activeBasketIndex] ?? [],
    [cartBaskets, activeBasketIndex]
  );
  function setCart(next: CartLine[] | ((current: CartLine[]) => CartLine[])) {
    setCartBaskets((current) =>
      current.map((basket, index) =>
        index === activeBasketIndex
          ? typeof next === "function"
            ? next(basket)
            : next
          : basket
      )
    );
  }
  function createBasket() {
    setCartBaskets((current) => [...current, []]);
    setActiveBasketIndex(cartBaskets.length);
  }
  const [employeeId, setEmployeeId] = useState("");
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newCustomerNote, setNewCustomerNote] = useState("");
  const [needsDelivery, setNeedsDelivery] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountUnit, setDiscountUnit] = useState<"percent" | "amount">("percent");
  const [mixedCash, setMixedCash] = useState(0);
  const [mixedCard, setMixedCard] = useState(0);
  const [mixedCredit, setMixedCredit] = useState(0);
  const [mixedCustomAmounts, setMixedCustomAmounts] = useState<Record<string, number>>({});
  const [mixedModalOpen, setMixedModalOpen] = useState(false);
  const [standaloneCustomMethod, setStandaloneCustomMethod] = useState<string | null>(null);
  const [settlementDate, setSettlementDate] = useState("");
  const defaultDueDate = () => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [settlementNote, setSettlementNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lightboxProduct, setLightboxProduct] = useState<ProductWithCategory | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lastSale, setLastSale] = useState<LastSale | null>(null);
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);

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

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => (a.onSale === b.onSale ? 0 : a.onSale ? -1 : 1)),
    [products]
  );

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
      return [...prev, { product, qty: 1, adjustment: null }];
    });
  }

  function updatePriceAdjustment(productId: string, adjustment: PriceAdjustment | null) {
    const normalizedAdjustment = adjustment
      ? {
          ...adjustment,
          value: Math.min(
            adjustment.direction === "discount" && adjustment.unit === "percent" ? 100 : Infinity,
            Number.isFinite(adjustment.value) ? Math.max(0, adjustment.value) : 0
          ),
        }
      : null;
    setCart((prev) =>
      prev.map((line) =>
        line.product.id === productId ? { ...line, adjustment: normalizedAdjustment } : line
      )
    );
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

  const subtotal = useMemo(
    () => cart.reduce((sum, l) => sum + cartUnitPrice(l) * l.qty, 0),
    [cart]
  );
  const discountAmount = Math.min(
    subtotal,
    Math.round(discountUnit === "percent" ? (subtotal * Math.min(100, Math.max(0, discountValue))) / 100 : Math.max(0, discountValue))
  );
  const total = Math.max(0, subtotal - discountAmount);
  const totalQty = useMemo(() => cart.reduce((sum, l) => sum + l.qty, 0), [cart]);

  const mixedCustomTotal = useMemo(
    () => Object.values(mixedCustomAmounts).reduce((s, v) => s + v, 0),
    [mixedCustomAmounts]
  );
  const mixedEntered = mixedCash + mixedCard + mixedCredit + mixedCustomTotal;

  const hasDeferredSelection = standaloneCustomMethod
    ? standaloneCustomMethod in deferredPaymentMethods
    : method === "MIXED" &&
      customPaymentMethods.some((m) => m in deferredPaymentMethods && (mixedCustomAmounts[m] ?? 0) > 0);

  const lightboxImages = lightboxProduct ? productImages(lightboxProduct) : [];

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId]
  );
  const customerInfoMissing =
    customerMode === "existing" ? !customerId : !newCustomerName.trim();
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
    if (customerMode === "existing" && !customerId) {
      setError("Mijozni tanlang");
      return;
    }
    if (customerMode === "new" && !newCustomerName.trim()) {
      setError("Mijoz ismini kiriting");
      return;
    }
    if (needsDelivery && (!deliveryDate || !deliveryTime)) {
      setError("Yetkazib berish sanasi va vaqtini tanlang");
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

    if (method === "MIXED" && !standaloneCustomMethod && mixedEntered !== total) {
      setError("Aralash to'lov summalari jami summaga teng bo'lishi kerak");
      return;
    }
    if (hasDeferredSelection && !settlementDate) {
      setError("Pul kelish sanasini tanlang");
      return;
    }

    const cashAmount = standaloneCustomMethod ? 0 : method === "CASH" ? total : method === "MIXED" ? mixedCash : 0;
    const cardAmount = standaloneCustomMethod ? 0 : method === "CARD" ? total : method === "MIXED" ? mixedCard : 0;
    const creditAmount =
      standaloneCustomMethod ? 0 : method === "CREDIT" ? total : method === "MIXED" ? mixedCredit : 0;
    const customAmounts = standaloneCustomMethod
      ? { [standaloneCustomMethod]: total }
      : method === "MIXED"
        ? mixedCustomAmounts
        : {};

    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((l) => ({
          productId: l.product.id,
          qty: l.qty,
          unitPrice: cartUnitPrice(l),
        })),
        discountAmount,
        paymentMethod: standaloneCustomMethod ? "CUSTOM" : method,
        customerId: resolvedCustomerId,
        employeeId: employeeId || undefined,
        cashAmount,
        cardAmount,
        creditAmount,
        customAmounts,
        needsDelivery,
        deliveryAddress: deliveryAddress.trim(),
        deliveryDate: needsDelivery ? `${deliveryDate}T${deliveryTime}` : undefined,
        settlementDate: hasDeferredSelection ? settlementDate : undefined,
        dueDate: creditAmount > 0 ? dueDate : undefined,
        settlementNote: hasDeferredSelection ? settlementNote.trim() : undefined,
      }),
    });
    setSubmitting(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    const completedSale: LastSale = {
      items: cart.map((l) => ({ name: l.product.name, qty: l.qty, price: cartUnitPrice(l) })),
      total,
      discountAmount,
      method: standaloneCustomMethod ?? method,
      customerName: customerMode === "new" ? newCustomerName.trim() || null : selectedCustomer?.name ?? null,
      createdAt: new Date(),
    };
    setLastSale(completedSale);
    if (receipt?.autoPrint) void printReceipt(completedSale, receipt);

    setCart([]);
    setDiscountValue(0);
    setDiscountUnit("percent");
    setCustomerMode("existing");
    setCustomerId("");
    setCustomerSearch("");
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerAddress("");
    setNewCustomerNote("");
    setNeedsDelivery(false);
    setDeliveryAddress("");
    setDeliveryDate("");
    setDeliveryTime("");
    setMethod("CASH");
    setMixedCash(0);
    setMixedCard(0);
    setMixedCredit(0);
    setMixedCustomAmounts({});
    setStandaloneCustomMethod(null);
    setSettlementDate("");
    setDueDate(defaultDueDate());
    setSettlementNote("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 15000);
    router.refresh();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status !== "all") params.set("status", status);
    if (categoryId) params.set("categoryId", categoryId);
    const refreshed = await fetch(`/api/products?${params.toString()}`);
    const refreshedData = await refreshed.json();
    setProducts(refreshedData.products ?? []);
  }

  const posOverlays = (
    <>
      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleScanned}
      />

      {receipt && (
        <ReceiptModal
          open={receiptPreviewOpen}
          onClose={() => setReceiptPreviewOpen(false)}
          sale={lastSale}
          settings={receipt}
        />
      )}

      <MixedPaymentModal
        open={mixedModalOpen}
        onClose={() => setMixedModalOpen(false)}
        total={total}
        cash={mixedCash}
        card={mixedCard}
        credit={mixedCredit}
        customMethods={customPaymentMethods}
        customAmounts={mixedCustomAmounts}
        onChangeCash={setMixedCash}
        onChangeCard={setMixedCard}
        onChangeCredit={setMixedCredit}
        onChangeCustom={(name, v) => setMixedCustomAmounts((prev) => ({ ...prev, [name]: v }))}
        onConfirm={() => setMixedModalOpen(false)}
      />

      {lightboxProduct && lightboxImages.length > 0 && (
        <ImageLightbox
          title={lightboxProduct.name}
          images={lightboxImages}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxProduct(null)}
        />
      )}
    </>
  );

  if (design === "figma") {
    return (
      <>
        <FigmaPosView
          products={sortedProducts}
          customers={customers}
          employees={employees}
          currentUserName={currentUserName ?? "Men"}
          query={query}
          loading={loading}
          cart={cart}
          activeBasketIndex={activeBasketIndex}
          basketItemCounts={cartBaskets.map((basket) => basket.length)}
          subtotal={subtotal}
          total={total}
          totalQty={totalQty}
          discountValue={discountValue}
          discountUnit={discountUnit}
          discountAmount={discountAmount}
          selectedCustomer={selectedCustomer}
          filteredCustomers={filteredCustomers}
          customerMode={customerMode}
          customerId={customerId}
          customerSearch={customerSearch}
          customerDropdownOpen={customerDropdownOpen}
          newCustomerName={newCustomerName}
          newCustomerPhone={newCustomerPhone}
          newCustomerAddress={newCustomerAddress}
          newCustomerNote={newCustomerNote}
          customerInfoMissing={customerInfoMissing}
          employeeId={employeeId}
          needsDelivery={needsDelivery}
          deliveryAddress={deliveryAddress}
          deliveryDate={deliveryDate}
          deliveryTime={deliveryTime}
          setNeedsDelivery={setNeedsDelivery}
          setDeliveryAddress={setDeliveryAddress}
          setDeliveryDate={setDeliveryDate}
          setDeliveryTime={setDeliveryTime}
          method={method}
          standaloneCustomMethod={standaloneCustomMethod}
          customPaymentMethods={customPaymentMethods}
          deferredPaymentMethods={deferredPaymentMethods}
          enableMixedPayment={enableMixedPayment}
          mixedCash={mixedCash}
          mixedCard={mixedCard}
          mixedCredit={mixedCredit}
          mixedCustomAmounts={mixedCustomAmounts}
          setMixedCash={setMixedCash}
          setMixedCard={setMixedCard}
          setMixedCredit={setMixedCredit}
          setMixedCustomAmounts={setMixedCustomAmounts}
          hasDeferredSelection={hasDeferredSelection}
          settlementDate={settlementDate}
          settlementNote={settlementNote}
          dueDate={dueDate}
          error={error}
          success={success}
          submitting={submitting}
          receipt={receipt}
          lastSale={lastSale}
          setQuery={setQuery}
          setActiveBasketIndex={setActiveBasketIndex}
          createBasket={createBasket}
          setCart={(nextCart) => setCart(nextCart)}
          clearCart={() => setCart([])}
          addToCart={addToCart}
          changeQty={changeQty}
          removeLine={removeLine}
          unitPrice={cartUnitPrice}
          updatePriceAdjustment={updatePriceAdjustment}
          setDiscountValue={setDiscountValue}
          setDiscountUnit={setDiscountUnit}
          setCustomerMode={setCustomerMode}
          setCustomerId={setCustomerId}
          setCustomerSearch={setCustomerSearch}
          setCustomerDropdownOpen={setCustomerDropdownOpen}
          setNewCustomerName={setNewCustomerName}
          setNewCustomerPhone={setNewCustomerPhone}
          setNewCustomerAddress={setNewCustomerAddress}
          setNewCustomerNote={setNewCustomerNote}
          setEmployeeId={setEmployeeId}
          setPaymentMethod={setMethod}
          setStandaloneCustomMethod={setStandaloneCustomMethod}
          setSettlementDate={setSettlementDate}
          setSettlementNote={setSettlementNote}
          setDueDate={setDueDate}
          checkout={checkout}
          setScannerOpen={setScannerOpen}
          setReceiptPreviewOpen={setReceiptPreviewOpen}
          onSearchSubmit={(value) => {
            void handleScanned(value);
            setQuery("");
          }}
        />
        {posOverlays}
      </>
    );
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
              ["discount", "Chegirmada"],
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
              {sortedProducts.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border border-border bg-surface p-3 text-left",
                    p.stock <= 0 && "opacity-50"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!productImages(p).length) return;
                      setLightboxProduct(p);
                      setLightboxIndex(0);
                    }}
                    className={cn("w-full", productImages(p).length ? "cursor-zoom-in" : "cursor-default")}
                    aria-label={productImages(p).length ? `${p.name} rasmini kattalashtirish` : undefined}
                  >
                    <ProductImage
                      src={p.imageUrl}
                      name={p.name}
                      className="aspect-square w-full rounded-lg text-xl"
                    />
                  </button>
                  <div className="flex w-full items-start justify-between gap-1">
                    <span className="line-clamp-2 text-sm font-semibold leading-snug">{p.name}</span>
                    <button
                      type="button"
                      onClick={() => addToCart(p)}
                      disabled={p.stock <= 0}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`${p.name} savatchaga qo'shish`}
                    >
                      <Plus size={14} />
                    </button>
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
                </div>
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
          <div className="mt-3 flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
            {cart.map((l) => (
              <div key={l.product.id} className="rounded-lg bg-surface-muted p-2">
                <div className="flex items-center gap-2">
                  <ProductImage
                    src={l.product.imageUrl}
                    name={l.product.name}
                    className="h-9 w-9 shrink-0 rounded-md text-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.product.name}</p>
                    <p className="text-xs text-muted">
                      {formatSom(cartUnitPrice(l))}
                      {l.adjustment && (
                        <span className="ml-1 line-through">{formatSom(effectivePrice(l.product))}</span>
                      )}
                    </p>
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
                {l.adjustment ? (
                  <div className="mt-2 flex items-center gap-1.5">
                    <select
                      aria-label={`${l.product.name} narx o'zgarishi`}
                      value={l.adjustment.direction}
                      onChange={(e) =>
                        updatePriceAdjustment(l.product.id, {
                          unit: e.target.value === "set" ? "amount" : "percent",
                          direction: e.target.value as PriceAdjustment["direction"],
                          value: e.target.value === "set" ? cartUnitPrice(l) : 0,
                        })
                      }
                      className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-1.5 text-xs"
                    >
                      <option value="discount">Chegirma</option>
                      <option value="increase">Ustama</option>
                      <option value="set">Maxsus narx</option>
                    </select>
                    {l.adjustment.direction !== "set" && (
                      <select
                        aria-label={`${l.product.name} o'zgarish birligi`}
                        value={l.adjustment.unit}
                        onChange={(e) =>
                          updatePriceAdjustment(l.product.id, {
                            ...l.adjustment!,
                            unit: e.target.value as PriceAdjustment["unit"],
                          })
                        }
                        className="h-8 rounded-md border border-border bg-background px-1.5 text-xs"
                      >
                        <option value="percent">%</option>
                        <option value="amount">UZS</option>
                      </select>
                    )}
                    <input
                      aria-label={`${l.product.name} ${l.adjustment.direction === "set" ? "maxsus narxi" : l.adjustment.direction === "discount" ? "chegirma" : "ustama"} miqdori`}
                      type="number"
                      min="0"
                      max={l.adjustment.direction === "discount" && l.adjustment.unit === "percent" ? 100 : undefined}
                      step={l.adjustment.unit === "percent" ? "0.1" : "1000"}
                      value={l.adjustment.value}
                      onChange={(e) =>
                        updatePriceAdjustment(l.product.id, {
                          ...l.adjustment!,
                          value: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="h-8 w-24 rounded-md border border-border bg-background px-2 text-right text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => updatePriceAdjustment(l.product.id, null)}
                      className="px-1 text-xs text-muted hover:text-danger"
                    >
                      Bekor
                    </button>
                  </div>
                ) : (
                  <div className="mt-1.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updatePriceAdjustment(l.product.id, {
                          direction: "set",
                          unit: "amount",
                          value: effectivePrice(l.product),
                        })
                      }
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      Narx
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePriceAdjustment(l.product.id, { direction: "discount", unit: "percent", value: 0 })}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      Chegirma
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePriceAdjustment(l.product.id, { direction: "increase", unit: "percent", value: 0 })}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      Ustama
                    </button>
                  </div>
                )}
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

        {employees && employees.length > 0 && (
          <div className="mt-4 flex flex-col gap-1">
            <label className="text-xs font-medium text-muted">Sotuvchi</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-accent"
            >
              <option value="">Men ({currentUserName ?? "joriy foydalanuvchi"})</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted">
              Mijoz ma&apos;lumotlari <span className="text-danger">*</span>
            </label>
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

        <div className="mt-3 flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={needsDelivery}
              onChange={(e) => {
                const checked = e.target.checked;
                setNeedsDelivery(checked);
                if (checked && !deliveryAddress) {
                  setDeliveryAddress(
                    (customerMode === "existing" ? selectedCustomer?.address : newCustomerAddress) || ""
                  );
                }
              }}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Yetkazib berish kerak
          </label>
          {needsDelivery && (
            <>
              <input
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Yetkazib berish manzili (ixtiyoriy)"
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1 text-xs text-muted">
                  Yetkazib berish sanasi *
                  <DeliveryDatePicker
                    value={deliveryDate}
                    onChange={setDeliveryDate}
                    min={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div className="flex flex-col gap-1 text-xs text-muted">
                  Yetkazib berish vaqti *
                  <DeliveryTimePicker value={deliveryTime} onChange={setDeliveryTime} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {([
            { kind: "method", method: "CASH", label: "Naqd" },
            { kind: "method", method: "CARD", label: "Karta" },
            { kind: "method", method: "CREDIT", label: "Nasiya" },
            ...customPaymentMethods.map((name) => ({ kind: "custom" as const, name })),
            ...(enableMixedPayment ? [{ kind: "method" as const, method: "MIXED" as PaymentMethod, label: "Aralash" }] : []),
          ] as (
            | { kind: "method"; method: PaymentMethod; label: string }
            | { kind: "custom"; name: string }
          )[]).map((entry) => {
            const isCustom = entry.kind === "custom";
            const label = isCustom ? entry.name : entry.label;
            const isDeferred = isCustom && entry.name in deferredPaymentMethods;
            const active = isCustom
              ? standaloneCustomMethod === entry.name
              : method === entry.method && !standaloneCustomMethod;
            return (
              <button
                key={isCustom ? `custom:${entry.name}` : entry.method}
                onClick={() => {
                  if (isCustom) {
                    setStandaloneCustomMethod(entry.name);
                    setMethod("MIXED");
                  } else {
                    setStandaloneCustomMethod(null);
                    setMethod(entry.method);
                    if (entry.method === "MIXED") setMixedModalOpen(true);
                  }
                }}
                title={isDeferred ? `${label} — to'lov keyinroq tushadi (uchinchi tomon)` : label}
                className={cn(
                  "flex items-center justify-center gap-1 truncate rounded-lg border border-border py-2 text-xs font-medium text-muted",
                  active && "border-accent bg-accent-soft text-accent"
                )}
              >
                {isDeferred && <Clock size={11} />}
                {label}
              </button>
            );
          })}
        </div>
        {hasDeferredSelection && (
          <div className="mt-2 flex flex-col gap-2 rounded-lg bg-surface-muted p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Clock size={12} />
              Pul uchinchi tomondan keyinroq tushadi (Moliya → Ishonch/Yuksalish)
            </p>
            <div className="flex flex-col gap-1 text-xs text-muted">
              Pul kelish sanasi *
              <DeliveryDatePicker
                value={settlementDate}
                onChange={setSettlementDate}
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <input
              value={settlementNote}
              onChange={(e) => setSettlementNote(e.target.value)}
              placeholder="Izoh (ixtiyoriy)"
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
            />
          </div>
        )}

        {(method === "CREDIT" || (method === "MIXED" && mixedCredit > 0)) && !standaloneCustomMethod && (
          <div className="mt-2 flex flex-col gap-1 rounded-lg bg-surface-muted p-3 text-xs text-muted">
            Nasiya to&apos;lov muddati *
            <DeliveryDatePicker value={dueDate} onChange={setDueDate} min={new Date().toISOString().slice(0, 10)} />
          </div>
        )}

        {method === "MIXED" && !standaloneCustomMethod && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-surface-muted p-3 text-xs">
            {mixedEntered === total ? (
              <span className="text-muted">
                Naqd: <strong className="text-foreground">{formatSom(mixedCash)}</strong> · Karta:{" "}
                <strong className="text-foreground">{formatSom(mixedCard)}</strong> · Nasiya:{" "}
                <strong className="text-foreground">{formatSom(mixedCredit)}</strong>
                {customPaymentMethods.map((m) =>
                  mixedCustomAmounts[m] ? (
                    <span key={m}>
                      {" "}
                      · {m}: <strong className="text-foreground">{formatSom(mixedCustomAmounts[m])}</strong>
                    </span>
                  ) : null
                )}
              </span>
            ) : (
              <span className="text-danger">Summalar taqsimlanmagan</span>
            )}
            <button
              type="button"
              onClick={() => setMixedModalOpen(true)}
              className="shrink-0 font-medium text-accent hover:underline"
            >
              O&apos;zgartirish
            </button>
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
                onClick={() => setReceiptPreviewOpen(true)}
                className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                <Printer size={12} /> Chek chiqarish
              </button>
            )}
          </div>
        )}

        <Button
          size="lg"
          className="mt-4"
          disabled={
            submitting ||
            cart.length === 0 ||
            customerInfoMissing ||
            (method === "MIXED" && !standaloneCustomMethod && mixedEntered !== total) ||
            (hasDeferredSelection && !settlementDate)
          }
          onClick={checkout}
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          To&apos;lov qilish
        </Button>
      </Card>

      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleScanned}
      />

      {receipt && (
        <ReceiptModal
          open={receiptPreviewOpen}
          onClose={() => setReceiptPreviewOpen(false)}
          sale={lastSale}
          settings={receipt}
        />
      )}

      <MixedPaymentModal
        open={mixedModalOpen}
        onClose={() => setMixedModalOpen(false)}
        total={total}
        cash={mixedCash}
        card={mixedCard}
        credit={mixedCredit}
        customMethods={customPaymentMethods}
        customAmounts={mixedCustomAmounts}
        onChangeCash={setMixedCash}
        onChangeCard={setMixedCard}
        onChangeCredit={setMixedCredit}
        onChangeCustom={(name, v) => setMixedCustomAmounts((prev) => ({ ...prev, [name]: v }))}
        onConfirm={() => setMixedModalOpen(false)}
      />

      {lightboxProduct && lightboxImages.length > 0 && (
        <ImageLightbox
          title={lightboxProduct.name}
          images={lightboxImages}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxProduct(null)}
        />
      )}
    </div>
  );
}
