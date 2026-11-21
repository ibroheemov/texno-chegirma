"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category, Product } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Barcode,
  SlidersHorizontal,
  Flame,
  Loader2,
  MoreVertical,
  Truck,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/ui/ProductImage";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { PeriodSelect } from "@/components/pos/PeriodSelect";
import type { PeriodValue } from "@/lib/period";
import { periodToParams, toMonthInputValue } from "@/lib/period";
import { formatSom } from "@/lib/format";
import { productImages } from "@/lib/productImages";
import { cn } from "@/lib/cn";
import { ProductFormModal } from "./ProductFormModal";
import { BarcodeLabelsModal } from "./BarcodeLabelsModal";
import { InventoryFilterModal, emptyInventoryFilters, type InventoryFilters } from "./InventoryFilterModal";
import { GoodsReceiptModal, type SupplierOption } from "./GoodsReceiptModal";
import { exportProductsToExcel } from "@/lib/exportExcel";

type ProductWithCategory = Product & { category: Category | null };
type StatusFilter = "all" | "available" | "low" | "out" | "discount";
type SoldItemRow = { productId: string; qty: number };

function stockBadge(p: Product) {
  if (p.stock <= 0) return <Badge tone="danger">Tugagan</Badge>;
  if (p.stock <= p.lowStockAt) return <Badge tone="warning">Kam qoldi · {p.stock}</Badge>;
  return <Badge tone="accent">{p.stock} dona</Badge>;
}

export function InventoryTable({
  initialProducts,
  categories,
  usdRate,
}: {
  initialProducts: ProductWithCategory[];
  categories: Category[];
  usdRate?: number | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<InventoryFilters>(emptyInventoryFilters);
  const [lightboxProduct, setLightboxProduct] = useState<ProductWithCategory | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const lightboxImages = lightboxProduct ? productImages(lightboxProduct) : [];

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [restockTarget, setRestockTarget] = useState<Product | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

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

  const [sortBySold, setSortBySold] = useState(false);
  const [soldPeriod, setSoldPeriod] = useState<PeriodValue>({ kind: "month", month: toMonthInputValue(new Date()) });
  const [soldMap, setSoldMap] = useState<Record<string, number>>({});
  const [soldLoading, setSoldLoading] = useState(false);

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

  const filtersActive =
    filters.categoryId !== "" ||
    filters.minPrice !== "" ||
    filters.maxPrice !== "" ||
    filters.minStock !== "" ||
    filters.maxStock !== "";

  const filtered = useMemo(() => {
    return initialProducts.filter((p) => {
      if (status === "available" && p.stock <= 0) return false;
      if (status === "low" && !(p.stock > 0 && p.stock <= p.lowStockAt)) return false;
      if (status === "out" && p.stock > 0) return false;
      if (status === "discount" && !p.onSale) return false;
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
    return [...filtered].sort((a, b) => {
      if (a.onSale !== b.onSale) return a.onSale ? -1 : 1;
      if (sortBySold) return (soldMap[b.id] ?? 0) - (soldMap[a.id] ?? 0);
      return 0;
    });
  }, [filtered, sortBySold, soldMap]);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setModalOpen(true);
  }

  async function remove(id: string) {
    setDeleteError("");
    setDeletingId(id);
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    router.refresh();
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Qidirish..."
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => exportProductsToExcel(filtered)} size="sm" variant="secondary">
            <FileSpreadsheet size={16} /> Excelga yuklash
          </Button>
          <Button onClick={() => setBarcodeOpen(true)} size="sm" variant="secondary">
            <Barcode size={16} /> Barcode
          </Button>
          <Button
            onClick={() => setFilterOpen(true)}
            size="sm"
            variant="secondary"
            className={cn(filtersActive && "border-accent text-accent")}
          >
            <SlidersHorizontal size={16} /> Filter
          </Button>
          <Button onClick={openAdd} size="sm">
            <Plus size={16} /> Mahsulot qo&apos;shish
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
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
        <button
          onClick={() => setSortBySold((v) => !v)}
          className={cn(
            "flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted",
            sortBySold && "border-accent bg-accent-soft text-accent"
          )}
        >
          <Flame size={12} /> Eng ko&apos;p sotilgan
          {sortBySold && soldLoading && <Loader2 size={12} className="animate-spin" />}
        </button>
        {sortBySold && <PeriodSelect value={soldPeriod} onChange={setSoldPeriod} />}
      </div>

      {deleteError && <p className="mt-3 text-sm text-danger">{deleteError}</p>}

      <div className="mt-4">
        {sorted.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Hech narsa topilmadi</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sorted.map((p) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => openEdit(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openEdit(p);
                  }
                }}
                className="relative flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-accent"
              >
                <div className="absolute right-2 top-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === p.id ? null : p.id);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted/90 text-foreground backdrop-blur hover:text-accent"
                    aria-label="Amallar"
                  >
                    <MoreVertical size={14} />
                  </button>
                  {openMenuId === p.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-8 z-10 w-44 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
                    >
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          openEdit(p);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-surface-muted"
                      >
                        <Pencil size={13} /> Tahrirlash
                      </button>
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          setRestockTarget(p);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-surface-muted"
                      >
                        <Truck size={13} /> Tovar kirimi
                      </button>
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          remove(p.id);
                        }}
                        disabled={deletingId === p.id}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-danger hover:bg-surface-muted disabled:opacity-50"
                      >
                        <Trash2 size={13} /> O&apos;chirish
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!productImages(p).length) return;
                    setLightboxProduct(p);
                    setLightboxIndex(0);
                  }}
                  className={cn("w-full", productImages(p).length ? "cursor-zoom-in" : "cursor-default")}
                  aria-label={productImages(p).length ? `${p.name} rasmini kattalashtirish` : undefined}
                >
                  <ProductImage src={p.imageUrl} name={p.name} className="aspect-square w-full rounded-lg text-xl" />
                </button>
                <span className="line-clamp-2 text-sm font-semibold leading-snug">{p.name}</span>
                <span className="text-xs text-muted">{p.sku}</span>
                {p.category && <span className="text-xs text-muted">{p.category.name}</span>}
                <div className="flex flex-wrap items-center gap-1">
                  {stockBadge(p)}
                  {p.onSale && p.salePrice && <Badge tone="danger">Chegirma</Badge>}
                  {sortBySold && (soldMap[p.id] ?? 0) > 0 && (
                    <Badge tone="info">
                      <Flame size={10} /> {soldMap[p.id]} sotildi
                    </Badge>
                  )}
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

      <ProductFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => router.refresh()}
        categories={categories}
        product={editing}
      />
      <BarcodeLabelsModal open={barcodeOpen} onClose={() => setBarcodeOpen(false)} products={filtered} />
      <GoodsReceiptModal
        open={!!restockTarget}
        onClose={() => setRestockTarget(null)}
        onSaved={() => router.refresh()}
        suppliers={suppliers}
        products={initialProducts}
        storeUsdRate={usdRate}
        initialProductId={restockTarget?.id}
      />
      <InventoryFilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        categories={categories}
        value={filters}
        onApply={setFilters}
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
    </Card>
  );
}
