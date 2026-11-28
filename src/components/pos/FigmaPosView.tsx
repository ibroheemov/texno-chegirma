"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Customer } from "@prisma/client";
import { Banknote, CalendarDays, Check, ChevronDown, Clock, Command, CreditCard, MapPin, Minus, Pause, Plus, ScanBarcode, Tag, Trash2, Wallet, X } from "lucide-react";
import type { ReceiptSale, ReceiptSettings } from "@/lib/receipt";
import { formatSom } from "@/lib/format";
import type { CartLine, PaymentMethod, PriceAdjustment, ProductWithCategory } from "./PosView";
import { KassaMark, KassaWordmark } from "../refine/KassaMark";
import "../refine/refine-tokens.css";
import "./FigmaPosView.css";

const iconFiles = [
  "bd74c.svg",
  "e44b7.svg",
  "b79ee.svg",
  "38c8c.svg",
  "83e46.svg",
  "69218.svg",
  "c9fe5.svg",
  "013e2.svg",
  "70a4d.svg",
  "be0e0.svg",
  "28863.svg",
  "e6535.svg",
  "56ed4.svg",
  "094c0.svg",
  "2f7b7.svg",
  "323ff.svg",
  "be3d0.svg",
  "626b2.svg",
  "f739d.svg",
  "84fd0.svg",
  "2f943.svg",
  "f3014.svg",
  "c0840.svg",
  "9443c.svg",
  "94d11.svg",
  "2bdc4.svg",
  "5132a.svg",
  "ad4cf.svg",
  "97f5e.svg",
  "5cce9.svg",
  "6bc95.svg",
  "87d34.svg",
  "811b8.svg",
  "81772.svg",
  "9da5f.svg",
  "73481.svg",
] as const;

type DeferredCart = { id: number; items: CartLine[] };

type FigmaPosViewProps = {
  products: ProductWithCategory[];
  customers: Customer[];
  employees?: { id: string; name: string }[];
  currentUserName: string;
  query: string;
  loading: boolean;
  cart: CartLine[];
  activeBasketIndex: number;
  subtotal: number;
  total: number;
  totalQty: number;
  discountValue: number;
  discountUnit: "percent" | "amount";
  discountAmount: number;
  selectedCustomer: Customer | null;
  filteredCustomers: Customer[];
  customerMode: "existing" | "new";
  customerId: string;
  customerSearch: string;
  customerDropdownOpen: boolean;
  newCustomerName: string;
  newCustomerPhone: string;
  newCustomerAddress: string;
  newCustomerNote: string;
  customerInfoMissing: boolean;
  employeeId: string;
  needsDelivery: boolean;
  deliveryAddress: string;
  deliveryDate: string;
  deliveryTime: string;
  setNeedsDelivery: (value: boolean) => void;
  setDeliveryAddress: (value: string) => void;
  setDeliveryDate: (value: string) => void;
  setDeliveryTime: (value: string) => void;
  method: PaymentMethod;
  /** False until the cashier picks a payment method (New design has no default). */
  paymentChosen: boolean;
  setPaymentChosen: (value: boolean) => void;
  standaloneCustomMethod: string | null;
  customPaymentMethods: string[];
  deferredPaymentMethods: Record<string, boolean>;
  enableMixedPayment: boolean;
  mixedCash: number;
  mixedCard: number;
  mixedCredit: number;
  mixedCustomAmounts: Record<string, number>;
  setMixedCash: (value: number) => void;
  setMixedCard: (value: number) => void;
  setMixedCredit: (value: number) => void;
  setMixedCustomAmounts: (value: Record<string, number>) => void;
  hasDeferredSelection: boolean;
  settlementDate: string;
  settlementNote: string;
  dueDate: string;
  error: string;
  success: boolean;
  submitting: boolean;
  receipt?: ReceiptSettings;
  lastSale: ReceiptSale | null;
  setQuery: (value: string) => void;
  setCart: (cart: CartLine[]) => void;
  clearCart: () => void;
  addToCart: (product: ProductWithCategory) => void;
  changeQty: (productId: string, delta: number) => void;
  removeLine: (productId: string) => void;
  unitPrice: (line: CartLine) => number;
  updatePriceAdjustment: (productId: string, adjustment: PriceAdjustment | null) => void;
  setDiscountValue: (value: number) => void;
  setDiscountUnit: (unit: "percent" | "amount") => void;
  setCustomerMode: (mode: "existing" | "new") => void;
  setCustomerId: (id: string) => void;
  setCustomerSearch: (value: string) => void;
  setCustomerDropdownOpen: (open: boolean) => void;
  setNewCustomerName: (value: string) => void;
  setNewCustomerPhone: (value: string) => void;
  setNewCustomerAddress: (value: string) => void;
  setNewCustomerNote: (value: string) => void;
  setEmployeeId: (value: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setStandaloneCustomMethod: (method: string | null) => void;
  setSettlementDate: (value: string) => void;
  setSettlementNote: (value: string) => void;
  setDueDate: (value: string) => void;
  checkout: () => void;
  setScannerOpen: (open: boolean) => void;
  setReceiptPreviewOpen: (open: boolean) => void;
  onSearchSubmit: (value: string) => void;
};

function FigmaIcon({ index, size = 20 }: { index: number; size?: number }) {
  return (
    <Image
      src={`/figma-pos/${iconFiles[index]}`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      draggable={false}
    />
  );
}

function Shortcut({ children }: { children: string }) {
  return <kbd className="figma-kbd">{children}</kbd>;
}

function productIconIndex(product: ProductWithCategory) {
  const description = `${product.name} ${product.category?.name ?? ""}`.toLowerCase();
  if (product.unit.toLowerCase() === "xizmat" || /xizmat|o'rnat|o‘rnat/.test(description)) return 23;
  if (/televiz|televisor|monitor|ekran/.test(description)) return 22;
  return 17;
}

function formatFigmaAmount(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function SectionHeading({
  children,
  shortcut,
  action,
}: {
  children: string;
  shortcut?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="figma-section-heading">
      <div className="figma-heading-label">
        <h2>{children}</h2>
        {shortcut && <Shortcut>{shortcut}</Shortcut>}
      </div>
      {action}
    </div>
  );
}

const AVATAR_TONES = ["av-1", "av-2", "av-3", "av-4"];

function avatarTone(id: string) {
  let sum = 0;
  for (let index = 0; index < id.length; index++) sum += id.charCodeAt(index);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
}

function customerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function FigmaPosView(props: FigmaPosViewProps) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const customerRef = useRef<HTMLInputElement>(null);
  const discountRef = useRef<HTMLInputElement>(null);
  const [saleType, setSaleType] = useState<"retail" | "wholesale">("retail");
  const [discountOpen, setDiscountOpen] = useState(false);
  const [priceEditorId, setPriceEditorId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState(0);
  const [deferredCarts, setDeferredCarts] = useState<DeferredCart[]>([]);
  const [paymentLineMethods, setPaymentLineMethods] = useState(["Naqd"]);
  const [deferredOpen, setDeferredOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  useEffect(() => {
    if (!clearConfirmOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setClearConfirmOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [clearConfirmOpen]);

  const postponeCart = useCallback(() => {
    if (!props.cart.length) {
      setDeferredOpen(true);
      return;
    }
    setDeferredCarts((current) => [...current, { id: Date.now(), items: props.cart }]);
    props.clearCart();
    setFeedback("Savat kechiktirildi");
    setTimeout(() => setFeedback(""), 2500);
  }, [props]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target;
      // Checkboxes and radios aren't text fields, so shortcuts like "/" still work while one has focus.
      const isEditing =
        (target instanceof HTMLInputElement && !["checkbox", "radio", "button"].includes(target.type)) ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

      if (event.key === "F2") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "/" && !isEditing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Same as F2, matching the hint in the empty cart.
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "F3") {
        event.preventDefault();
        customerRef.current?.focus();
      } else if (event.key === "F4") {
        event.preventDefault();
        setDiscountOpen(true);
        window.setTimeout(() => discountRef.current?.focus(), 0);
      } else if (event.key === "F6") {
        event.preventDefault();
        setDeferredOpen(true);
      } else if (event.key === "F7" || event.key === "F8") {
        event.preventDefault();
        router.push("/admin/moliya");
      } else if (event.key === "F9") {
        event.preventDefault();
        if (!props.submitting && (props.cart.length > 0 || deferredCarts.length > 0)) postponeCart();
      } else if (event.key === "F10") {
        event.preventDefault();
        props.checkout();
      } else if (!isEditing && props.cart.length) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedRow((row) => Math.min(props.cart.length - 1, row + 1));
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedRow((row) => Math.max(0, row - 1));
        } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          const line = props.cart[selectedRow];
          if (line) props.changeQty(line.product.id, event.key === "ArrowRight" ? 1 : -1);
        } else if (event.key === "Delete") {
          event.preventDefault();
          const line = props.cart[selectedRow];
          if (line) props.removeLine(line.product.id);
        }
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [props, postponeCart, router, selectedRow, deferredCarts.length]);

  function paymentAmount(method: string) {
    if (props.method !== "MIXED" || props.standaloneCustomMethod) {
      if (method === "Naqd" && props.method === "CASH" && !props.standaloneCustomMethod) return props.total;
      if (method === "Qarz" && props.method === "CREDIT" && !props.standaloneCustomMethod) return props.total;
      if (method === "Karta" && props.method === "CARD" && !props.standaloneCustomMethod) return props.total;
      if (method === props.standaloneCustomMethod) return props.total;
      return 0;
    }
    if (method === "Naqd") return props.mixedCash;
    if (method === "Qarz") return props.mixedCredit;
    if (method === "Karta") return props.mixedCard;
    return props.mixedCustomAmounts[method] ?? 0;
  }

  function updatePaymentAmount(method: string, value: number) {
    if (props.method !== "MIXED" || props.standaloneCustomMethod) {
      props.setMixedCash(0);
      props.setMixedCard(0);
      props.setMixedCredit(0);
      props.setMixedCustomAmounts({});
      props.setStandaloneCustomMethod(null);
      props.setPaymentMethod("MIXED");
    }
    if (method === "Naqd") props.setMixedCash(value);
    else if (method === "Qarz") props.setMixedCredit(value);
    else if (method === "Karta") props.setMixedCard(value);
    else {
      props.setMixedCustomAmounts({ ...props.mixedCustomAmounts, [method]: value });
    }
  }

  function addPaymentMethod(method: string) {
    const currentPaymentMethods = visiblePaymentMethods;
    if (currentPaymentMethods.includes(method)) return;

    const currentAmounts = currentPaymentMethods.reduce((sum, item) => sum + paymentAmount(item), 0);
    if (props.method !== "MIXED" || props.standaloneCustomMethod) {
      props.setMixedCash(0);
      props.setMixedCard(0);
      props.setMixedCredit(0);
      props.setMixedCustomAmounts({});
      if (props.method === "CASH" && !props.standaloneCustomMethod) props.setMixedCash(props.total);
      else if (props.method === "CREDIT" && !props.standaloneCustomMethod) props.setMixedCredit(props.total);
      else if (props.method === "CARD" && !props.standaloneCustomMethod) props.setMixedCard(props.total);
      else if (props.standaloneCustomMethod) {
        props.setMixedCustomAmounts({ [props.standaloneCustomMethod]: props.total });
      }
      props.setStandaloneCustomMethod(null);
      props.setPaymentMethod("MIXED");
    }
    const remaining = Math.max(0, props.total - currentAmounts);
    if (method === "Naqd") props.setMixedCash(remaining);
    else if (method === "Qarz") props.setMixedCredit(remaining);
    else if (method === "Karta") props.setMixedCard(remaining);
    else {
      props.setMixedCustomAmounts({ ...props.mixedCustomAmounts, [method]: remaining });
    }
    setPaymentLineMethods([...currentPaymentMethods, method]);
  }

  function removePaymentMethod(method: string) {
    if (visiblePaymentMethods.length === 1) {
      setPaymentLineMethods(["Naqd"]);
      props.setPaymentChosen(false);
      props.setPaymentMethod("CASH");
      props.setStandaloneCustomMethod(null);
      props.setMixedCash(0);
      props.setMixedCard(0);
      props.setMixedCredit(0);
      props.setMixedCustomAmounts({});
      return;
    }
    setPaymentLineMethods(visiblePaymentMethods.filter((item) => item !== method));
    if (method === "Naqd") props.setMixedCash(0);
    else if (method === "Qarz") props.setMixedCredit(0);
    else if (method === "Karta") props.setMixedCard(0);
    else {
      props.setMixedCustomAmounts(
        Object.fromEntries(Object.entries(props.mixedCustomAmounts).filter(([name]) => name !== method))
      );
    }
  }

  function restoreDeferred(index: number) {
    const deferred = deferredCarts[index];
    if (!deferred) return;
    if (props.cart.length) {
      setDeferredCarts((current) => [...current, { id: Date.now(), items: props.cart }]);
    }
    props.setCart(deferred.items);
    setDeferredCarts((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setDeferredOpen(false);
  }

  const amountValue = props.discountValue;
  const selectedEmployeeName =
    props.employees?.find((employee) => employee.id === props.employeeId)?.name ??
    props.currentUserName;
  const paymentOptions = [
    { label: "Naqd", Icon: Banknote },
    { label: "Karta", Icon: CreditCard },
    { label: "Qarz", Icon: Wallet },
    ...props.customPaymentMethods.map((label) => ({ label, Icon: Wallet })),
  ];
  const visiblePaymentMethods = !props.paymentChosen
    ? []
    : props.method === "MIXED" && !props.standaloneCustomMethod
      ? paymentLineMethods
      : [props.standaloneCustomMethod ??
        (props.method === "CARD"
          ? "Karta"
          : props.method === "CREDIT"
            ? "Qarz"
            : "Naqd")];

  // Replaces the whole selection with a single payment method (the full amount goes to it).
  function selectSingleMethod(method: string) {
    setPaymentLineMethods([method]);
    props.setMixedCash(0);
    props.setMixedCard(0);
    props.setMixedCredit(0);
    props.setMixedCustomAmounts({});
    if (method === "Naqd") {
      props.setStandaloneCustomMethod(null);
      props.setPaymentMethod("CASH");
    } else if (method === "Qarz") {
      props.setStandaloneCustomMethod(null);
      props.setPaymentMethod("CREDIT");
    } else if (method === "Karta") {
      props.setStandaloneCustomMethod(null);
      props.setPaymentMethod("CARD");
    } else {
      props.setStandaloneCustomMethod(method);
      props.setPaymentMethod("MIXED");
    }
    props.setPaymentChosen(true);
  }

  function handlePaymentOption(method: string) {
    if (visiblePaymentMethods.includes(method)) return;
    // Nothing selected yet: the first tap picks that method on its own.
    if (!props.paymentChosen) {
      selectSingleMethod(method);
      return;
    }
    if (!props.enableMixedPayment) {
      if (visiblePaymentMethods.length !== 1 || props.method === "MIXED") return;
      selectSingleMethod(method);
      return;
    }
    addPaymentMethod(method);
  }

  return (
    <div className="figma-pos">
      <div className="figma-main">
        <header className="figma-topbar">
          <div className="figma-topbar-left">
            <div className="figma-toolbar">
              <div className="figma-search-wrap">
                <label className="figma-search control control-soft control-lg">
                  <FigmaIcon index={12} size={24} />
                  <input
                    ref={searchRef}
                    value={props.query}
                    onChange={(event) => props.setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && props.query.trim()) {
                        event.preventDefault();
                        props.onSearchSubmit(props.query.trim());
                      }
                    }}
                    placeholder="Shtrix-kodni skanerlang yoki nom / artikul kiriting"
                    aria-label="Mahsulot qidirish"
                  />
                  <Shortcut>F2</Shortcut>
                </label>
                {props.query && (
                  <div className="figma-search-results">
                    {props.loading ? (
                      <p className="figma-search-empty">Qidirilmoqda...</p>
                    ) : props.products.length ? (
                      props.products.slice(0, 8).map((product) => (
                        <button
                          type="button"
                          key={product.id}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            props.addToCart(product);
                            props.setQuery("");
                          }}
                        >
                          <span className="figma-search-result-icon">
                            <FigmaIcon index={productIconIndex(product)} size={22} />
                          </span>
                          <span className="figma-search-result-info">
                            <strong>{product.name}</strong>
                            <small>{product.sku}</small>
                          </span>
                          <span className="figma-search-price figma-mono">
                            {product.onSale && product.salePrice ? (
                              <>
                                <s>{formatFigmaAmount(product.price)}</s>
                                {formatFigmaAmount(product.salePrice)}
                              </>
                            ) : (
                              formatFigmaAmount(product.price)
                            )}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="figma-search-empty">Mahsulot topilmadi</p>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="figma-toolbar-button figma-icon-button figma-scanner-button"
                onClick={() => props.setScannerOpen(true)}
                aria-label="Kamera bilan skanerlash"
              >
                <ScanBarcode size={24} strokeWidth={1.6} />
                <span className="figma-toolbar-tooltip">Skaner</span>
              </button>
              <button
                type="button"
                className="figma-toolbar-button figma-icon-button figma-deferred-button"
                onClick={() => setDeferredOpen(true)}
                aria-label={`Kechiktirilgan savatlar, ${deferredCarts.length}`}
              >
                <FigmaIcon index={13} size={24} />
                <b>{deferredCarts.length}</b>
                <span className="figma-toolbar-tooltip">Kechiktirilgan<Shortcut>F6</Shortcut></span>
              </button>
              <button
                type="button"
                className="figma-toolbar-button figma-icon-button figma-return-button"
                onClick={() => router.push("/admin/moliya")}
                aria-label="Qaytarish"
              >
                <FigmaIcon index={14} size={24} />
                <span className="figma-toolbar-tooltip">Qaytarish<Shortcut>F7</Shortcut></span>
              </button>
              <button
                type="button"
                className="figma-toolbar-button figma-icon-button figma-history-button"
                onClick={() => router.push("/admin/moliya")}
                aria-label="Tarix"
              >
                <FigmaIcon index={15} size={24} />
                <span className="figma-toolbar-tooltip">Tarix<Shortcut>F8</Shortcut></span>
              </button>
            </div>
          </div>
        </header>

        <div className="figma-work-area">
          <section className="figma-cart-workspace" aria-label="Savat">
            <div className={`figma-cart-panel${props.cart.length ? "" : " is-empty"}`}>
              {props.cart.length > 0 && (
                <button type="button" className="btn btn-danger-soft figma-clear-cart" onClick={() => setClearConfirmOpen(true)}>
                  <Trash2 className="ic" size={18} aria-hidden="true" />
                  Savatni tozalash
                </button>
              )}
              {clearConfirmOpen && (
                <div className="figma-confirm-overlay" onClick={() => setClearConfirmOpen(false)}>
                  <div
                    className="modal"
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="figma-clear-title"
                    style={{ maxWidth: 440 }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="modal-b figma-confirm-body">
                      <span className="ic-tile lg danger">
                        <Trash2 className="ic" size={22} aria-hidden="true" />
                      </span>
                      <h3 className="t-h3" id="figma-clear-title">
                        Savatni tozalaysizmi?
                      </h3>
                      <p className="t-body-sm">
                        Savatdagi {props.cart.length} ta pozitsiya olib tashlanadi. Bu amalni ortga qaytarib bo‘lmaydi.
                      </p>
                    </div>
                    <div className="modal-f">
                      <button type="button" className="btn btn-outline" autoFocus onClick={() => setClearConfirmOpen(false)}>
                        Bekor qilish
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => {
                          setClearConfirmOpen(false);
                          props.clearCart();
                        }}
                      >
                        Tozalash
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {props.cart.length > 0 && (
                <div className="figma-cart-header">
                  <div className="figma-cart-summary">
                    <label className="figma-seller-select control control-sm">
                      <span className="addon">Sotuvchi:</span>
                      <select
                        value={props.employeeId}
                        onChange={(event) => props.setEmployeeId(event.target.value)}
                        aria-label="Sotuvchi"
                      >
                        <option value="">Barchasi</option>
                        {props.employees?.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="ic" size={16} aria-hidden="true" />
                    </label>
                    <strong>{props.cart.length} pozitsiya · {props.totalQty} dona</strong>
                    <span className="figma-receipt-id">Savat #{String(props.activeBasketIndex + 1).padStart(2, "0")}</span>
                  </div>
                </div>
              )}

              <div className="figma-table-scroll">
                {!props.cart.length ? (
                  <div className="figma-empty-state">
                    <svg className="figma-empty-outline" aria-hidden="true">
                      <rect />
                    </svg>
                    <div className="figma-empty-icon figma-empty-logo">
                      <KassaMark mono size={48} />
                      <span className="figma-empty-wordmark">
                        <KassaWordmark size={48} />
                      </span>
                    </div>
                    <h2>Savatcha hozircha bo‘sh</h2>
                    <p>Tovarlarni qidirish uchun “/” tugmasini bosing yoki tovarlarni skanerlang</p>
                  </div>
                ) : (
                <>
                <div className="figma-cart-table">
                  <div className="figma-cart-table-header">
                    <span>№</span>
                    <span>Mahsulot</span>
                    <span>Shtrix-kod</span>
                    <span>Miqdor</span>
                    <span>Summa</span>
                    <span />
                  </div>
                  {props.cart.map((line, index) => {
                    const unitPrice = props.unitPrice(line);
                    return (
                      <div
                        key={line.product.id}
                        className={`figma-cart-row${selectedRow === index ? " is-selected" : ""}`}
                        onMouseEnter={() => setSelectedRow(index)}
                      >
                        <span className="figma-row-number">{index + 1}</span>
                        <div className="figma-product-cell">
                          <span className="figma-product-icon">
                            <FigmaIcon index={productIconIndex(line.product)} size={28} />
                          </span>
                          <span className="figma-product-info">
                            <strong title={line.product.name}>{line.product.name}</strong>
                            <small>
                              <FigmaIcon index={18} size={13} />
                              {selectedEmployeeName}
                              <i />
                              {line.product.unit.toLowerCase() === "xizmat"
                                ? "Xizmat"
                                : `Omborda: ${line.product.stock} dona`}
                            </small>
                          </span>
                        </div>
                        <span className="figma-product-sku">
                          <strong>{line.product.sku || "—"}</strong>
                          <small>{line.product.sku || "—"}</small>
                        </span>
                        <div className="control control-lg figma-quantity-stepper">
                          <button
                            type="button"
                            className="spin"
                            onClick={() => props.changeQty(line.product.id, -1)}
                            aria-label={`${line.product.name} miqdorini kamaytirish`}
                          >
                            <Minus className="ic" size={16} aria-hidden="true" />
                          </button>
                          <input
                            className="mono"
                            value={line.qty}
                            readOnly
                            aria-label={`${line.product.name} miqdori`}
                          />
                          <button
                            type="button"
                            className="spin"
                            onClick={() => props.changeQty(line.product.id, 1)}
                            aria-label={`${line.product.name} miqdorini oshirish`}
                          >
                            <Plus className="ic" size={16} aria-hidden="true" />
                          </button>
                        </div>
                        <button
                          type="button"
                          className="figma-line-total figma-mono"
                          onClick={() =>
                            setPriceEditorId((current) =>
                              current === line.product.id ? null : line.product.id
                            )
                          }
                          title="Mahsulot narxini moslash"
                          aria-label={`${line.product.name} narxini moslash`}
                        >
                          {formatFigmaAmount(unitPrice * line.qty)}
                          {line.adjustment && <small className="figma-price-adjusted">Moslangan</small>}
                        </button>
                        <button
                          type="button"
                          className="figma-remove-line"
                          onClick={() => props.removeLine(line.product.id)}
                          aria-label={`${line.product.name}ni savatdan olib tashlash`}
                        >
                          <FigmaIcon index={21} size={22} />
                        </button>
                        {priceEditorId === line.product.id && (
                          <div className="figma-price-editor">
                            <label>
                              <span>Narx turi</span>
                              <select
                                value={line.adjustment?.direction ?? "set"}
                                onChange={(event) => {
                                  const direction = event.target.value as PriceAdjustment["direction"];
                                  props.updatePriceAdjustment(line.product.id, {
                                    direction,
                                    unit: direction === "set" ? "amount" : "percent",
                                    value: direction === "set" ? unitPrice : 0,
                                  });
                                }}
                              >
                                <option value="set">Maxsus narx</option>
                                <option value="discount">Chegirma</option>
                                <option value="increase">Ustama</option>
                              </select>
                            </label>
                            {line.adjustment?.direction !== "set" && (
                              <select
                                aria-label="Narx o'zgarish birligi"
                                value={line.adjustment?.unit ?? "percent"}
                                onChange={(event) =>
                                  props.updatePriceAdjustment(line.product.id, {
                                    ...(line.adjustment ?? { direction: "discount", unit: "percent", value: 0 }),
                                    unit: event.target.value as PriceAdjustment["unit"],
                                  })
                                }
                              >
                                <option value="percent">%</option>
                                <option value="amount">UZS</option>
                              </select>
                            )}
                            <label>
                              <span>{line.adjustment?.direction === "set" ? "Narx" : "Miqdor"}</span>
                              <input
                                type="number"
                                min="0"
                                max={line.adjustment?.direction === "discount" && line.adjustment.unit === "percent" ? 100 : undefined}
                                step={line.adjustment?.unit === "percent" ? "0.1" : "1000"}
                                value={line.adjustment?.value ?? unitPrice}
                                onChange={(event) =>
                                  props.updatePriceAdjustment(line.product.id, {
                                    ...(line.adjustment ?? { direction: "set", unit: "amount", value: unitPrice }),
                                    value: Math.max(0, Number(event.target.value) || 0),
                                  })
                                }
                              />
                            </label>
                            {line.adjustment && (
                              <button
                                type="button"
                                className="figma-price-reset"
                                onClick={() => {
                                  props.updatePriceAdjustment(line.product.id, null);
                                  setPriceEditorId(null);
                                }}
                              >
                                Bekor
                              </button>
                            )}
                            <button type="button" onClick={() => setPriceEditorId(null)}>Tayyor</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                </>
                )}
              </div>
            </div>

            <div className="figma-shortcuts">
              <span className="figma-shortcuts-title">
                <Command size={18} strokeWidth={1.6} aria-hidden="true" />
                <strong>Tezkor tugmalar</strong>
              </span>
              <span><Shortcut>↑</Shortcut><Shortcut>↓</Shortcut> tanlash</span>
              <span><Shortcut>←</Shortcut><Shortcut>→</Shortcut> miqdor</span>
              <span><Shortcut>Del</Shortcut> o&apos;chirish</span>
              <span><Shortcut>F2</Shortcut> qidirish</span>
              <span><Shortcut>F4</Shortcut> chegirma</span>
              <span><Shortcut>F9</Shortcut> kechiktirish</span>
            </div>
          </section>

          <aside className="figma-checkout">
            <div className="figma-checkout-body">
              <section className="figma-checkout-section figma-customer-section">
                <SectionHeading
                  shortcut="F3"
                  action={
                    <button
                      type="button"
                      className="figma-text-action"
                      onClick={() => props.setCustomerMode("new")}
                    >
                      <FigmaIcon index={27} size={16} />
                      Yangi mijoz
                    </button>
                  }
                >
                  Mijoz
                </SectionHeading>
                {props.customerMode === "existing" ? (
                  <div className="figma-customer-search-wrap">
                    <label className="figma-customer-search control control-soft control-lg">
                      <FigmaIcon index={28} size={18} />
                      <input
                        ref={customerRef}
                        value={props.selectedCustomer?.name ?? props.customerSearch}
                        onChange={(event) => {
                          props.setCustomerId("");
                          props.setCustomerSearch(event.target.value);
                          props.setCustomerDropdownOpen(true);
                        }}
                        onFocus={() => props.setCustomerDropdownOpen(true)}
                        onBlur={() => setTimeout(() => props.setCustomerDropdownOpen(false), 150)}
                        placeholder="Ism, telefon yoki bonus karta"
                        aria-label="Mijoz qidirish"
                      />
                      {props.selectedCustomer && (
                        <button
                          type="button"
                          className="figma-customer-clear"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            props.setCustomerId("");
                            props.setCustomerSearch("");
                          }}
                          aria-label="Mijozni olib tashlash"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </label>
                    {props.customerDropdownOpen && !props.selectedCustomer && (
                      <div className="figma-customer-results menu" role="listbox" aria-label="Mijozlar">
                        {props.filteredCustomers.length ? (
                          props.filteredCustomers.map((customer) => (
                            <button
                              type="button"
                              role="option"
                              aria-selected={false}
                              key={customer.id}
                              className="menu-item"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                props.setCustomerId(customer.id);
                                props.setCustomerSearch("");
                                props.setCustomerDropdownOpen(false);
                              }}
                            >
                              <span className={`av av-xs ${avatarTone(customer.id)}`} aria-hidden="true">
                                {customerInitials(customer.name)}
                              </span>
                              <span className="rf-ellipsis">{customer.name}</span>
                              {customer.phone ? <span className="end mono">{customer.phone}</span> : null}
                            </button>
                          ))
                        ) : (
                          <div className="menu-item is-empty">
                            Mijoz topilmadi —
                            <button
                              type="button"
                              className="menu-item-link"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                props.setCustomerDropdownOpen(false);
                                props.setCustomerMode("new");
                              }}
                            >
                              yangi mijoz qo‘shish
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="figma-new-customer-fields">
                    <label className="control control-soft">
                      <input
                        value={props.newCustomerName}
                        onChange={(event) => props.setNewCustomerName(event.target.value)}
                        placeholder="Ism familiya"
                        aria-label="Yangi mijoz ismi"
                      />
                    </label>
                    <label className="control control-soft">
                      <input
                        value={props.newCustomerPhone}
                        onChange={(event) => props.setNewCustomerPhone(event.target.value)}
                        placeholder="Telefon raqami (ixtiyoriy)"
                        aria-label="Yangi mijoz telefoni"
                      />
                    </label>
                    <label className="control control-soft">
                      <input
                        value={props.newCustomerAddress}
                        onChange={(event) => props.setNewCustomerAddress(event.target.value)}
                        placeholder="MFY (Manzil)"
                        aria-label="Yangi mijoz manzili"
                      />
                    </label>
                    <label className="control control-soft">
                      <input
                        value={props.newCustomerNote}
                        onChange={(event) => props.setNewCustomerNote(event.target.value)}
                        placeholder="Izoh (ixtiyoriy)"
                        aria-label="Yangi mijoz izohi"
                      />
                    </label>
                    <div className="figma-customer-mode-actions">
                      <button type="button" onClick={() => props.setCustomerMode("existing")}>Bekor qilish</button>
                      <span>Yangi mijoz sotuv bilan saqlanadi</span>
                    </div>
                  </div>
                )}
              </section>

              <section className="figma-checkout-section figma-payment-section">
                <SectionHeading>To‘lov usuli</SectionHeading>
                <div className="figma-payment-tiles">
                  {paymentOptions.map(({ label, Icon }) => {
                    const active = visiblePaymentMethods.includes(label);
                    const isDeferred = label in props.deferredPaymentMethods;
                    return (
                      <button
                        type="button"
                        key={label}
                        className={`figma-payment-tile${active ? " is-current" : ""}`}
                        onClick={() => handlePaymentOption(label)}
                        title={isDeferred ? `${label} — to'lov keyinroq tushadi (uchinchi tomon)` : label}
                        aria-pressed={active}
                        disabled={!active && !props.enableMixedPayment && props.method === "MIXED"}
                      >
                        <span className="figma-payment-icon"><Icon size={24} strokeWidth={1.6} /></span>
                        <span>{label}{isDeferred && <Clock className="figma-payment-deferred" size={12} />}</span>
                        {active ? <Check className="figma-payment-status" size={18} /> : <Plus className="figma-payment-status" size={18} />}
                      </button>
                    );
                  })}
                </div>
                <div className="figma-payment-lines">
                  {Array.from({ length: Math.max(4, visiblePaymentMethods.length) }, (_, index) => {
                    const method = visiblePaymentMethods[index];
                    return method ? (
                      <div className="figma-payment-line" key={method}>
                        <div>
                          <span>{method}</span>
                          <button
                            type="button"
                            onClick={() => removePaymentMethod(method)}
                            aria-label={`${method} to'lovini o'chirish`}
                          >
                            <Trash2 size={16} strokeWidth={1.6} />
                          </button>
                        </div>
                        <input
                          inputMode="numeric"
                          value={formatFigmaAmount(paymentAmount(method))}
                          onChange={(event) =>
                            updatePaymentAmount(
                              method,
                              Number(event.target.value.replace(/\D/g, "")) || 0
                            )
                          }
                          aria-label={`${method} summasi`}
                        />
                      </div>
                    ) : <div className="figma-payment-slot" key={`slot-${index}`} />;
                  })}
                </div>
                {props.hasDeferredSelection && (
                  <div className="figma-settlement">
                    <p>To&apos;lov keyinroq tushadi. Kutilayotgan sanani tanlang.</p>
                    <input
                      type="date"
                      value={props.settlementDate}
                      onChange={(event) => props.setSettlementDate(event.target.value)}
                    />
                    <input
                      value={props.settlementNote}
                      onChange={(event) => props.setSettlementNote(event.target.value)}
                      placeholder="Izoh (ixtiyoriy)"
                    />
                  </div>
                )}
                {(props.method === "CREDIT" || (props.method === "MIXED" && props.mixedCredit > 0)) && !props.standaloneCustomMethod && (
                  <label className="figma-credit-due">
                    Nasiya muddati
                    <input
                      type="date"
                      value={props.dueDate}
                      onChange={(event) => props.setDueDate(event.target.value)}
                    />
                  </label>
                )}
              </section>

              <section className={`figma-checkout-section figma-discount-section${discountOpen ? " is-open" : ""}`}>
                <div className="figma-discount-heading">
                  <button
                    type="button"
                    className="figma-discount-toggle"
                    aria-expanded={discountOpen}
                    aria-controls="figma-discount-body"
                    onClick={() => setDiscountOpen((open) => !open)}
                  >
                    <h2>Chegirma</h2>
                    <Shortcut>F4</Shortcut>
                    {!discountOpen && props.discountAmount > 0 && (
                      <span className="figma-discount-chip">
                        − {props.discountUnit === "percent"
                          ? `${props.discountValue}%`
                          : `${formatFigmaAmount(props.discountAmount)} UZS`}
                      </span>
                    )}
                  </button>
                  <div className="figma-discount-actions">
                    {discountOpen && (
                      <button
                        type="button"
                        className="figma-text-action"
                        onClick={() => discountRef.current?.focus()}
                      >
                        <Tag size={15} strokeWidth={1.7} />
                        Promokod
                      </button>
                    )}
                    <button
                      type="button"
                      className="figma-discount-chevron"
                      aria-label={discountOpen ? "Chegirmani yopish" : "Chegirmani ochish"}
                      onClick={() => setDiscountOpen((open) => !open)}
                    >
                      <ChevronDown size={18} strokeWidth={1.8} />
                    </button>
                  </div>
                </div>
                <div
                  className="figma-discount-collapse"
                  id="figma-discount-body"
                  inert={!discountOpen}
                >
                  <div className="figma-discount-collapse-inner">
                    <div className="figma-discount-input">
                      <input
                        ref={discountRef}
                        type="number"
                        min="0"
                        max={props.discountUnit === "percent" ? 100 : undefined}
                        step={props.discountUnit === "percent" ? "0.1" : "1000"}
                        value={amountValue || ""}
                        placeholder="0"
                        onChange={(event) => props.setDiscountValue(Math.max(0, Number(event.target.value) || 0))}
                        aria-label="Chegirma miqdori"
                      />
                      <div className="figma-discount-units" role="group" aria-label="Chegirma birligi">
                        <button
                          type="button"
                          className={props.discountUnit === "percent" ? "is-current" : ""}
                          onClick={() => props.setDiscountUnit("percent")}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          className={props.discountUnit === "amount" ? "is-current" : ""}
                          onClick={() => props.setDiscountUnit("amount")}
                        >
                          UZS
                        </button>
                      </div>
                    </div>
                    <div className="figma-discount-presets">
                      {[5, 10, 15, 20].map((value) => (
                        <button
                          type="button"
                          key={value}
                          className={props.discountUnit === "percent" && props.discountValue === value ? "is-current" : ""}
                          onClick={() => {
                            props.setDiscountUnit("percent");
                            props.setDiscountValue(value);
                          }}
                        >
                          {value}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="figma-checkout-section figma-toggle-section">
                <label className="check figma-toggle-row">
                  <input
                    type="checkbox"
                    checked={saleType === "wholesale"}
                    onChange={(event) => setSaleType(event.target.checked ? "wholesale" : "retail")}
                  />
                  <span className="box">
                    <Check size={14} strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span className="figma-toggle-title">Ulgurji</span>
                </label>
              </section>

              <section className="figma-checkout-section figma-toggle-section figma-delivery-section">
                <label className="check figma-toggle-row">
                  <input
                    type="checkbox"
                    checked={props.needsDelivery}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      props.setNeedsDelivery(checked);
                      if (checked && !props.deliveryAddress) {
                        props.setDeliveryAddress(
                          (props.customerMode === "existing"
                            ? props.selectedCustomer?.address
                            : props.newCustomerAddress) || ""
                        );
                      }
                    }}
                  />
                  <span className="box">
                    <Check size={14} strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span className="figma-toggle-title">Yetkazib berish kerak</span>
                </label>
                {props.needsDelivery && (
                  <div className="figma-delivery-fields">
                    <div className="field">
                      <label className="label" htmlFor="figma-delivery-address">
                        Yetkazib berish manzili <span className="opt">(ixtiyoriy)</span>
                      </label>
                      <div className="control">
                        <MapPin className="ic" size={16} aria-hidden="true" />
                        <input
                          id="figma-delivery-address"
                          value={props.deliveryAddress}
                          onChange={(event) => props.setDeliveryAddress(event.target.value)}
                          placeholder="Manzilni kiriting"
                        />
                      </div>
                    </div>
                    <div className="figma-delivery-datetime">
                      <div className="field">
                        <label className="label" htmlFor="figma-delivery-date">
                          Sana <span className="req">*</span>
                        </label>
                        <div className="control">
                          <CalendarDays className="ic" size={16} aria-hidden="true" />
                          <input
                            id="figma-delivery-date"
                            type="date"
                            className="mono"
                            min={new Date().toISOString().slice(0, 10)}
                            value={props.deliveryDate}
                            onChange={(event) => props.setDeliveryDate(event.target.value)}
                          />
                        </div>
                      </div>
                      <div className="field">
                        <span className="label" id="figma-delivery-time-label">
                          Vaqt <span className="req">*</span>
                        </span>
                        <div className="control" role="group" aria-labelledby="figma-delivery-time-label">
                          <Clock className="ic" size={16} aria-hidden="true" />
                          <select
                            className="mono"
                            aria-label="Soat"
                            value={props.deliveryTime.split(":")[0] ?? ""}
                            onChange={(event) =>
                              props.setDeliveryTime(`${event.target.value}:${props.deliveryTime.split(":")[1] || "00"}`)
                            }
                          >
                            <option value="" disabled>Soat</option>
                            {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((hour) => (
                              <option key={hour} value={hour}>{hour}</option>
                            ))}
                          </select>
                          <span className="figma-time-sep">:</span>
                          <select
                            className="mono"
                            aria-label="Daqiqa"
                            value={props.deliveryTime.split(":")[1] ?? ""}
                            onChange={(event) =>
                              props.setDeliveryTime(`${props.deliveryTime.split(":")[0] || "00"}:${event.target.value}`)
                            }
                          >
                            <option value="" disabled>Daqiqa</option>
                            {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0")).map((minute) => (
                              <option key={minute} value={minute}>{minute}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

            </div>

            <div className="figma-checkout-footer">
              <div className="figma-summary-row">
                <span>Oraliq jami <small>{props.totalQty} dona</small></span>
                <strong>{formatFigmaAmount(props.subtotal)} UZS</strong>
              </div>
              <div className="figma-summary-row">
                <span>Chegirma</span>
                <strong className={props.discountAmount ? "is-discount" : ""}>
                  {props.discountAmount ? `-${formatFigmaAmount(props.discountAmount)} UZS` : "0 UZS"}
                </strong>
              </div>
              <div className="figma-summary-total">
                <span>Jami</span>
                <strong>{formatFigmaAmount(props.total)} <small>UZS</small></strong>
              </div>
              {props.error && <p className="figma-checkout-error" role="alert">{props.error}</p>}
              {feedback && <p className="figma-checkout-feedback" role="status">{feedback}</p>}
              {props.success && (
                <div className="figma-checkout-success">
                  <span>Sotuv muvaffaqiyatli saqlandi</span>
                  {props.receipt && props.lastSale && !props.receipt.autoPrint && (
                    <button type="button" onClick={() => props.setReceiptPreviewOpen(true)}>
                      Chek chiqarish
                    </button>
                  )}
                </div>
              )}
              <button
                type="button"
                className="figma-pay-button"
                onClick={props.checkout}
                disabled={
                  props.submitting ||
                  !props.paymentChosen ||
                  props.cart.length === 0 ||
                  props.total <= 0 ||
                  props.customerInfoMissing ||
                  (props.method === "MIXED" && !props.standaloneCustomMethod &&
                    props.mixedCash + props.mixedCard + props.mixedCredit +
                      Object.values(props.mixedCustomAmounts).reduce((sum, amount) => sum + amount, 0) !== props.total) ||
                  (props.hasDeferredSelection && !props.settlementDate)
                }
              >
                <Check className="figma-button-icon" size={20} strokeWidth={1.8} aria-hidden="true" />
                <span>{props.submitting ? "Saqlanmoqda..." : "To‘lash"}</span>
                <Shortcut>F10</Shortcut>
              </button>
              <button
                type="button"
                className="figma-postpone-button"
                onClick={postponeCart}
                disabled={props.submitting || (props.cart.length === 0 && deferredCarts.length === 0)}
              >
                <Pause className="figma-button-icon" size={20} strokeWidth={1.8} aria-hidden="true" />
                <span>Kechiktirish</span>
                <Shortcut>F9</Shortcut>
              </button>
            </div>
          </aside>
        </div>
      </div>

      {deferredOpen && (
        <div className="figma-modal-backdrop" role="presentation" onMouseDown={() => setDeferredOpen(false)}>
          <section
            className="figma-deferred-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="figma-deferred-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="figma-deferred-modal-header">
              <h2 id="figma-deferred-title">Kechiktirilgan savatlar</h2>
              <button type="button" onClick={() => setDeferredOpen(false)} aria-label="Yopish">×</button>
            </div>
            {deferredCarts.length ? (
              deferredCarts.map((deferred, index) => (
                <button type="button" className="figma-deferred-item" key={deferred.id} onClick={() => restoreDeferred(index)}>
                  <span>Savat {index + 1} · {deferred.items.length} pozitsiya</span>
                  <strong>{formatSom(deferred.items.reduce((sum, line) => sum + props.unitPrice(line) * line.qty, 0))}</strong>
                </button>
              ))
            ) : (
              <p className="figma-deferred-empty">Kechiktirilgan savatlar yo&apos;q.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
