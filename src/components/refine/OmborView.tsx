"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category, Product } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  Barcode,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Flame,
  LayoutGrid,
  Loader2,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Rows3,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Trash2,
  Truck,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { ProductImage } from "@/components/ui/ProductImage";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { PeriodSelect } from "@/components/pos/PeriodSelect";
import type { PeriodValue } from "@/lib/period";
import { periodToParams, toMonthInputValue } from "@/lib/period";
import { formatDateTime, formatSom, formatUsd } from "@/lib/format";
import { productImages } from "@/lib/productImages";
import { exportProductsToExcel } from "@/lib/exportExcel";
import type { UsdRateInfo } from "@/lib/usdRate";
import { emptyInventoryFilters, type InventoryFilters } from "@/components/inventory/InventoryFilterModal";
import type { SupplierOption } from "@/components/inventory/GoodsReceiptModal";
import { OmborProductFormModal } from "./ombor/OmborProductFormModal";
import { OmborBarcodeModal } from "./ombor/OmborBarcodeModal";
import { OmborFilterModal } from "./ombor/OmborFilterModal";
import { OmborGoodsReceiptModal } from "./ombor/OmborGoodsReceiptModal";
import { OmborImportModal } from "./ombor/OmborImportModal";
import { LegacyScope } from "./LegacyScope";
import "./ombor.css";

type ProductWithCategory = Product & { category: Category | null };
type StatusFilter = "all" | "available" | "low" | "out" | "discount";
type SortKey = "default" | "name-asc" | "name-desc" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc";
type Density = "comfortable" | "compact";
type SoldItemRow = { productId: string; qty: number };

const STATUS_TABS: [StatusFilter, string][] = [
  ["all", "Barchasi"],
  ["available", "Mavjud"],
  ["discount", "Chegirmada"],
  ["low", "Kam qolgan"],
  ["out", "Tugagan"],
];

const SORT_OPTIONS: [SortKey, string][] = [
  ["default", "Standart (chegirmadagilar birinchi)"],
  ["name-asc", "Nomi: A → Z"],
  ["name-desc", "Nomi: Z → A"],
  ["price-asc", "Narx: arzonroq birinchi"],
  ["price-desc", "Narx: qimmatroq birinchi"],
  ["stock-asc", "Qoldiq: kamroq birinchi"],
  ["stock-desc", "Qoldiq: ko‘proq birinchi"],
];

const PAGE_SIZE: Record<Density, number> = { comfortable: 12, compact: 24 };

function matchesStatus(p: Product, status: StatusFilter) {
  if (status === "available") return p.stock > 0;
  if (status === "low") return p.stock > 0 && p.stock <= p.lowStockAt;
  if (status === "out") return p.stock <= 0;
  if (status === "discount") return p.onSale;
  return true;
}

function stockBadge(p: Product) {
  if (p.stock <= 0)
    return (
      <span className="badge badge-danger">
        <span className="bd" />
        Tugagan
      </span>
    );
  if (p.stock <= p.lowStockAt)
    return (
      <span className="badge badge-warning">
        <span className="bd" />
        Kam qoldi · {p.stock}
      </span>
    );
  return (
    <span className="badge badge-success">
      <span className="bd" />
      {p.stock} {p.unit || "dona"}
    </span>
  );
}

function pageList(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) result.push("gap");
    result.push(n);
  });
  return result;
}

export function OmborView({
  initialProducts,
  categories,
  totalCostValue,
  totalSaleValue,
  usdRateInfo,
  usdRate,
}: {
  initialProducts: ProductWithCategory[];
  categories: Category[];
  totalCostValue: number;
  totalSaleValue: number;
  usdRateInfo?: UsdRateInfo | null;
  usdRate?: number | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [density, setDensity] = useState<Density>("comfortable");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<InventoryFilters>(emptyInventoryFilters);
  const [restockTarget, setRestockTarget] = useState<Product | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductWithCategory | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const [lightboxProduct, setLightboxProduct] = useState<ProductWithCategory | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const lightboxImages = lightboxProduct ? productImages(lightboxProduct) : [];

  const [sortBySold, setSortBySold] = useState(false);
  const [soldPeriod, setSoldPeriod] = useState<PeriodValue>({ kind: "month", month: toMonthInputValue(new Date()) });
  const [soldMap, setSoldMap] = useState<Record<string, number>>({});
  const [soldLoading, setSoldLoading] = useState(false);

  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenuId]);

  useEffect(() => {
    fetch("/api/suppliers")
      .then((res) => res.json())
      .then((data) => setSuppliers(data.suppliers ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sortBySold) return;
    let cancelled = false;
    setSoldLoading(true);
    fetch(`/api/sales/summary?${periodToParams(soldPeriod).toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const map: Record<string, number> = {};
        for (const item of (json.items ?? []) as SoldItemRow[]) {
          map[item.productId] = item.qty;
        }
        setSoldMap(map);
      })
      .finally(() => {
        if (!cancelled) setSoldLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sortBySold, soldPeriod]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (deleteTarget) setDeleteTarget(null);
      else if (drawerId) setDrawerId(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [deleteTarget, drawerId]);

  const filtersActive =
    filters.categoryId !== "" ||
    filters.minPrice !== "" ||
    filters.maxPrice !== "" ||
    filters.minStock !== "" ||
    filters.maxStock !== "";
  const anyFilter = filtersActive || status !== "all" || query !== "";

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { all: 0, available: 0, discount: 0, low: 0, out: 0 };
    for (const p of initialProducts) {
      for (const [key] of STATUS_TABS) if (matchesStatus(p, key)) counts[key] += 1;
    }
    return counts;
  }, [initialProducts]);

  const filtered = useMemo(() => {
    return initialProducts.filter((p) => {
      if (!matchesStatus(p, status)) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
      }
      if (filters.categoryId && p.categoryId !== filters.categoryId) return false;
      if (filters.minPrice && p.price < Number(filters.minPrice)) return false;
      if (filters.maxPrice && p.price > Number(filters.maxPrice)) return false;
      if (filters.minStock && p.stock < Number(filters.minStock)) return false;
      if (filters.maxStock && p.stock > Number(filters.maxStock)) return false;
      return true;
    });
  }, [initialProducts, status, query, filters]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortKey === "default") {
      // Same order as Old design: discounted products first, then (optionally) best sellers.
      return list.sort((a, b) => {
        if (a.onSale !== b.onSale) return a.onSale ? -1 : 1;
        if (sortBySold) return (soldMap[b.id] ?? 0) - (soldMap[a.id] ?? 0);
        return 0;
      });
    }
    const [field, dir] = sortKey.split("-") as ["name" | "price" | "stock", "asc" | "desc"];
    const sign = dir === "asc" ? 1 : -1;
    return list.sort((a, b) =>
      field === "name" ? a.name.localeCompare(b.name) * sign : (a[field] - b[field]) * sign
    );
  }, [filtered, sortKey, sortBySold, soldMap]);

  const pageSize = PAGE_SIZE[density];
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeFrom = sorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeTo = Math.min(sorted.length, currentPage * pageSize);

  const drawerProduct = drawerId ? (initialProducts.find((p) => p.id === drawerId) ?? null) : null;

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setFilters(emptyInventoryFilters);
    setPage(1);
  }

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setDrawerId(null);
    setEditing(p);
    setModalOpen(true);
  }

  function openRestock(p: Product) {
    setDrawerId(null);
    setRestockTarget(p);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteError("");
    setDeletingId(id);
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    setDeletingId(null);
    setDeleteTarget(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    setDrawerId((current) => (current === id ? null : current));
    router.refresh();
  }

  const usdSub = usdRateInfo
    ? usdRateInfo.source === "cbu"
      ? ` · CBU kursi: 1$=${usdRateInfo.rate.toLocaleString("en-US")} so'm (${usdRateInfo.date})`
      : usdRateInfo.source === "telegram"
        ? ` · Bozor kursi: 1$=${usdRateInfo.rate.toLocaleString("en-US")} so'm`
        : " · qo'lda kiritilgan kurs"
    : "";

  return (
    <>
      <div className="page-h">
        <div className="ttl">
          <span className="t-overline" style={{ color: "var(--primary-text)" }}>
            Katalog
          </span>
          <h1 className="t-h1">Ombor</h1>
          <p className="t-body-sm">
            Mahsulotlar, narxlar va qoldiq. Jami {initialProducts.length} ta mahsulot.
          </p>
        </div>
        <div className="acts">
          <button type="button" className="btn btn-outline" onClick={() => exportProductsToExcel(filtered)}>
            <FileSpreadsheet className="ic" size={18} />
            Excelga yuklash
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setImportOpen(true)}>
            <Upload className="ic" size={18} />
            Import qilish
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setBarcodeOpen(true)}>
            <Barcode className="ic" size={18} />
            Barcode
          </button>
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            <Plus className="ic" size={18} />
            Mahsulot qo‘shish
          </button>
        </div>
      </div>

      <div className="om-kpis">
        <div className="card kpi om-kpi">
          <span className="ic-tile">
            <Wallet className="ic" size={20} />
          </span>
          <div className="om-kpi-body">
            <span className="kpi-label">Jami tan narx</span>
            <span className="kpi-val">
              {formatSom(totalCostValue)}
              {usdRateInfo && <small>({formatUsd(totalCostValue, usdRateInfo.rate)})</small>}
            </span>
            <span className="kpi-foot">Barcha mahsulotlar bo‘yicha{usdSub}</span>
          </div>
        </div>
        <div className="card kpi om-kpi">
          <span className="ic-tile success">
            <TrendingUp className="ic" size={20} />
          </span>
          <div className="om-kpi-body">
            <span className="kpi-label">Sotuv qiymati</span>
            <span className="kpi-val">{formatSom(totalSaleValue)}</span>
            <span className="kpi-foot">Qoldiq × sotuv narxi; tushum emas</span>
          </div>
        </div>
      </div>

      <div className="card om-card-wrap">
        <div className="tabs om-tabs" role="tablist" aria-label="Holat bo‘yicha">
          {STATUS_TABS.map(([key, label]) => (
            <button
              type="button"
              key={key}
              role="tab"
              aria-selected={status === key}
              className={`tab${status === key ? " is-active" : ""}`}
              onClick={() => {
                setStatus(key);
                setPage(1);
              }}
            >
              {label}
              <span className="count count-soft">{statusCounts[key]}</span>
            </button>
          ))}
        </div>

        <div className="tbl-bar">
          <div className="control control-sm om-search">
            <Search className="ic" size={16} />
            <input
              placeholder="Nom yoki artikul bo‘yicha qidirish…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              aria-label="Mahsulot qidirish"
            />
          </div>
          <div className="control control-sm om-sort">
            <select
              aria-label="Tartiblash"
              value={sortKey}
              onChange={(event) => {
                setSortKey(event.target.value as SortKey);
                setPage(1);
              }}
            >
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown className="ic" size={14} />
          </div>
          <button
            type="button"
            className={`btn btn-outline btn-sm${filtersActive ? " om-active" : ""}`}
            onClick={() => setFilterOpen(true)}
          >
            <SlidersHorizontal className="ic" size={16} />
            Filter
          </button>
          <button
            type="button"
            className={`btn btn-outline btn-sm${sortBySold ? " om-active" : ""}`}
            onClick={() => setSortBySold((value) => !value)}
            aria-pressed={sortBySold}
          >
            <Flame className="ic" size={16} />
            Eng ko‘p sotilgan
            {sortBySold && soldLoading && <Loader2 className="ic om-spin" size={14} />}
          </button>
          {sortBySold && (
            <LegacyScope>
              <PeriodSelect value={soldPeriod} onChange={setSoldPeriod} />
            </LegacyScope>
          )}
          {anyFilter && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>
              <X className="ic" size={14} />
              Tozalash
            </button>
          )}
          <span className="grow" />
          <div className="seg seg-sm" role="group" aria-label="Zichlik">
            <button
              type="button"
              className={density === "comfortable" ? "is-active" : ""}
              onClick={() => {
                setDensity("comfortable");
                setPage(1);
              }}
              aria-label="Oddiy"
              title="Oddiy"
            >
              <LayoutGrid className="ic" size={14} />
            </button>
            <button
              type="button"
              className={density === "compact" ? "is-active" : ""}
              onClick={() => {
                setDensity("compact");
                setPage(1);
              }}
              aria-label="Ixcham"
              title="Ixcham"
            >
              <Rows3 className="ic" size={14} />
            </button>
          </div>
        </div>

        {deleteError && (
          <p className="om-error" role="alert">
            {deleteError}
          </p>
        )}

        {sorted.length === 0 ? (
          <div className="empty">
            <span className="em-ic">
              <Package className="ic" size={28} />
            </span>
            <h4>Mahsulot topilmadi</h4>
            <p>Qidiruv yoki filtrlarni o‘zgartiring.</p>
            {anyFilter && (
              <div className="acts">
                <button type="button" className="btn btn-outline" onClick={resetFilters}>
                  Filtrlarni tozalash
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={`om-grid${density === "compact" ? " is-compact" : ""}`}>
            {pageItems.map((p) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                className="card card-interactive om-product"
                onClick={() => setDrawerId(p.id)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setDrawerId(p.id);
                  }
                }}
              >
                <div className="om-menu-anchor">
                  <button
                    type="button"
                    className="om-menu-btn"
                    aria-label="Amallar"
                    aria-haspopup="menu"
                    aria-expanded={openMenuId === p.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuId(openMenuId === p.id ? null : p.id);
                    }}
                  >
                    <MoreVertical className="ic" size={16} />
                  </button>
                  {openMenuId === p.id && (
                    <div className="menu om-menu" role="menu" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        role="menuitem"
                        className="menu-item"
                        onClick={() => {
                          setOpenMenuId(null);
                          openEdit(p);
                        }}
                      >
                        <Pencil className="ic" size={16} />
                        Tahrirlash
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="menu-item"
                        onClick={() => {
                          setOpenMenuId(null);
                          openRestock(p);
                        }}
                      >
                        <Truck className="ic" size={16} />
                        Tovar kirimi
                      </button>
                      <div className="menu-sep" />
                      <button
                        type="button"
                        role="menuitem"
                        className="menu-item is-danger"
                        disabled={deletingId === p.id}
                        onClick={() => {
                          setOpenMenuId(null);
                          setDeleteTarget(p);
                        }}
                      >
                        <Trash2 className="ic" size={16} />
                        O‘chirish
                      </button>
                    </div>
                  )}
                </div>

                <LegacyScope>
                  <ProductImage src={p.imageUrl} name={p.name} className="om-thumb" />
                </LegacyScope>
                <div className="om-info">
                  <b className="om-name">{p.name}</b>
                  <span className="mono om-sku">{p.sku}</span>
                  {p.category && <span className="om-cat">{p.category.name}</span>}
                </div>
                <div className="om-badges">
                  {stockBadge(p)}
                  {p.onSale && p.salePrice && (
                    <span className="badge badge-accent">
                      <span className="bd" />
                      Chegirma
                    </span>
                  )}
                  {sortBySold && (soldMap[p.id] ?? 0) > 0 && (
                    <span className="badge badge-info">
                      <Flame className="ic" size={10} />
                      {soldMap[p.id]} sotildi
                    </span>
                  )}
                </div>
                {p.onSale && p.salePrice ? (
                  <div className="om-price">
                    <span className="mono strong om-price-sale">{formatSom(p.salePrice)}</span>
                    <span className="mono om-price-old">{formatSom(p.price)}</span>
                  </div>
                ) : (
                  <div className="om-price">
                    <span className="mono strong">{formatSom(p.price)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="tbl-foot">
          <span>
            {sorted.length === 0 ? "0 ta mahsulot" : `${rangeFrom}–${rangeTo} / ${sorted.length} ta mahsulot`}
          </span>
          {pageCount > 1 && (
            <nav className="pager" aria-label="Sahifalar">
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Oldingi sahifa"
              >
                <ChevronLeft className="ic" size={16} />
              </button>
              {pageList(currentPage, pageCount).map((entry, index) =>
                entry === "gap" ? (
                  <span key={`gap-${index}`} className="gap">
                    …
                  </span>
                ) : (
                  <button
                    type="button"
                    key={entry}
                    className={entry === currentPage ? "is-active" : ""}
                    aria-current={entry === currentPage ? "page" : undefined}
                    onClick={() => setPage(entry)}
                  >
                    {entry}
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= pageCount}
                aria-label="Keyingi sahifa"
              >
                <ChevronRight className="ic" size={16} />
              </button>
            </nav>
          )}
        </div>
      </div>

      {drawerProduct && (
        <div className="om-overlay om-overlay-drawer" onClick={() => setDrawerId(null)}>
          <aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Mahsulot tafsilotlari"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-h">
              <span className="ic-tile">
                <Package className="ic" size={20} />
              </span>
              <div className="om-drawer-title">
                <b className="om-name">{drawerProduct.name}</b>
                <span className="mono om-sku">{drawerProduct.sku}</span>
              </div>
              <button type="button" className="x-btn" onClick={() => setDrawerId(null)} aria-label="Yopish">
                <X className="ic" size={18} />
              </button>
            </div>
            <div className="drawer-b">
              <button
                type="button"
                className={`om-drawer-image${productImages(drawerProduct).length ? " is-zoomable" : ""}`}
                onClick={() => {
                  if (!productImages(drawerProduct).length) return;
                  setLightboxProduct(drawerProduct);
                  setLightboxIndex(0);
                }}
                aria-label={
                  productImages(drawerProduct).length ? `${drawerProduct.name} rasmini kattalashtirish` : undefined
                }
              >
                <LegacyScope>
                  <ProductImage src={drawerProduct.imageUrl} name={drawerProduct.name} className="om-drawer-img" />
                </LegacyScope>
              </button>
              <div className="om-badges">
                {stockBadge(drawerProduct)}
                {drawerProduct.onSale && drawerProduct.salePrice && (
                  <span className="badge badge-accent">
                    <span className="bd" />
                    Chegirma
                  </span>
                )}
                {drawerProduct.category && <span className="badge badge-outline">{drawerProduct.category.name}</span>}
              </div>
              <div className="om-drawer-panels">
                <div className="panel">
                  <span className="t-caption">Narx</span>
                  <b className="mono strong om-panel-val">
                    {formatSom(drawerProduct.onSale && drawerProduct.salePrice ? drawerProduct.salePrice : drawerProduct.price)}
                  </b>
                </div>
                <div className="panel">
                  <span className="t-caption">Qoldiq</span>
                  <b className="mono strong om-panel-val">
                    {drawerProduct.stock} {drawerProduct.unit || "dona"}
                  </b>
                </div>
              </div>
              <dl className="dl om-dl">
                <dt>Artikul</dt>
                <dd className="mono">{drawerProduct.sku}</dd>
                <dt>Kategoriya</dt>
                <dd>{drawerProduct.category?.name ?? "—"}</dd>
                <dt>Tan narx</dt>
                <dd className="mono">{formatSom(drawerProduct.costPrice)}</dd>
                <dt>Sotuv narxi</dt>
                <dd className="mono">{formatSom(drawerProduct.price)}</dd>
                {drawerProduct.onSale && drawerProduct.salePrice ? (
                  <>
                    <dt>Chegirma narxi</dt>
                    <dd className="mono">{formatSom(drawerProduct.salePrice)}</dd>
                  </>
                ) : null}
                <dt>Kam qolish chegarasi</dt>
                <dd className="mono">{drawerProduct.lowStockAt}</dd>
                {drawerProduct.barcodePrice ? (
                  <>
                    <dt>Shtrix-kod narxi</dt>
                    <dd className="mono">{formatSom(drawerProduct.barcodePrice)}</dd>
                  </>
                ) : null}
                {drawerProduct.usdRate ? (
                  <>
                    <dt>Dollar kursi</dt>
                    <dd className="mono">1$ = {drawerProduct.usdRate.toLocaleString("en-US")} so‘m</dd>
                  </>
                ) : null}
                <dt>Yangilangan</dt>
                <dd className="mono">{formatDateTime(drawerProduct.updatedAt)}</dd>
              </dl>
            </div>
            <div className="drawer-f">
              <button type="button" className="btn btn-outline om-grow" onClick={() => openRestock(drawerProduct)}>
                <Truck className="ic" size={18} />
                Tovar kirimi
              </button>
              <button type="button" className="btn btn-primary om-grow" onClick={() => openEdit(drawerProduct)}>
                <Pencil className="ic" size={18} />
                Tahrirlash
              </button>
            </div>
          </aside>
        </div>
      )}

      {deleteTarget && (
        <div className="om-overlay om-overlay-modal" onClick={() => setDeleteTarget(null)}>
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="om-delete-title"
            style={{ maxWidth: 440 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-b om-confirm-body">
              <span className="ic-tile lg danger">
                <Trash2 className="ic" size={22} />
              </span>
              <h3 className="t-h3" id="om-delete-title">
                Mahsulotni o‘chirasizmi?
              </h3>
              <p className="t-body-sm">
                «{deleteTarget.name}» ombordan o‘chiriladi. Bu amalni ortga qaytarib bo‘lmaydi.
              </p>
            </div>
            <div className="modal-f">
              <button type="button" className="btn btn-outline" onClick={() => setDeleteTarget(null)}>
                Bekor qilish
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                O‘chirish
              </button>
            </div>
          </div>
        </div>
      )}

      <OmborProductFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => router.refresh()}
        categories={categories}
        product={editing}
      />
      <OmborBarcodeModal open={barcodeOpen} onClose={() => setBarcodeOpen(false)} products={filtered} />
      <OmborImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => router.refresh()}
        categoryNames={categories.map((c) => c.name)}
      />
      <OmborGoodsReceiptModal
        open={!!restockTarget}
        onClose={() => setRestockTarget(null)}
        onSaved={() => router.refresh()}
        suppliers={suppliers}
        products={initialProducts}
        storeUsdRate={usdRate}
        initialProductId={restockTarget?.id}
      />
      <OmborFilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        categories={categories}
        value={filters}
        onApply={(next) => {
          setFilters(next);
          setPage(1);
        }}
      />
      {lightboxProduct && lightboxImages.length > 0 && (
        <LegacyScope>
          <ImageLightbox
            title={lightboxProduct.name}
            images={lightboxImages}
            index={lightboxIndex}
            onIndexChange={setLightboxIndex}
            onClose={() => setLightboxProduct(null)}
          />
        </LegacyScope>
      )}
    </>
  );
}
