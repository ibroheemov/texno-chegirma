"use client";

import { useMemo, useState } from "react";
import type { Category, Product } from "@prisma/client";
import { useRouter } from "next/navigation";
import { Search, Plus, Pencil, Trash2, FileSpreadsheet, Barcode, SlidersHorizontal } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/ui/ProductImage";
import { formatSom } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ProductFormModal } from "./ProductFormModal";
import { BarcodeLabelsModal } from "./BarcodeLabelsModal";
import { InventoryFilterModal, emptyInventoryFilters, type InventoryFilters } from "./InventoryFilterModal";
import { exportProductsToExcel } from "@/lib/exportExcel";

type ProductWithCategory = Product & { category: Category | null };
type StatusFilter = "all" | "available" | "low" | "out";

function stockBadge(p: Product) {
  if (p.stock <= 0) return <Badge tone="danger">Tugagan</Badge>;
  if (p.stock <= p.lowStockAt) return <Badge tone="warning">Kam qoldi</Badge>;
  return <Badge tone="accent">Mavjud</Badge>;
}

export function InventoryTable({
  initialProducts,
  categories,
}: {
  initialProducts: ProductWithCategory[];
  categories: Category[];
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
      </div>

      {deleteError && <p className="mt-3 text-sm text-danger">{deleteError}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted">
              <th className="py-2 pr-3 font-medium">Mahsulot</th>
              <th className="py-2 pr-3 font-medium">Kategoriya</th>
              <th className="py-2 pr-3 font-medium">Narx</th>
              <th className="py-2 pr-3 font-medium">Zaxira</th>
              <th className="py-2 pr-3 font-medium">Holat</th>
              <th className="py-2 pr-3 font-medium text-right">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0">
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2.5">
                    <ProductImage src={p.imageUrl} name={p.name} className="h-10 w-10 shrink-0 rounded-lg text-sm" />
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted">{p.sku}</div>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-muted">{p.category?.name ?? "—"}</td>
                <td className="py-2.5 pr-3 font-medium">{formatSom(p.price)}</td>
                <td className="py-2.5 pr-3">{p.stock} dona</td>
                <td className="py-2.5 pr-3">{stockBadge(p)}</td>
                <td className="py-2.5 pr-3">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => openEdit(p)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted text-foreground hover:text-accent"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => remove(p.id)}
                      disabled={deletingId === p.id}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted text-foreground hover:text-danger disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">Hech narsa topilmadi</p>
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
      <InventoryFilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        categories={categories}
        value={filters}
        onApply={setFilters}
      />
    </Card>
  );
}
