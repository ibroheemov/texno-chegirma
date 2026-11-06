"use client";

import { useEffect, useRef, useState } from "react";
import type { Category, Product } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/ui/ProductImage";
import { Loader2, ScanBarcode, Keyboard, ArrowRight, Pencil, Upload, Camera } from "lucide-react";
import { BarcodeScannerModal } from "@/components/pos/BarcodeScannerModal";
import { cn } from "@/lib/cn";

type Supplier = { id: string; name: string; phone: string | null };
type UnitOption = "dona" | "litr" | "kg" | "metr";

export function ProductFormModal({
  open,
  onClose,
  onSaved,
  categories,
  product,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  product?: Product | null;
}) {
  const isEdit = Boolean(product);

  // Step 1 — barcode
  const [step, setStep] = useState<1 | 2>(isEdit ? 2 : 1);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Step 2 — details
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [currency, setCurrency] = useState<"SOM" | "USD">("SOM");
  const [usdRate, setUsdRate] = useState<number | null>(null);
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState<UnitOption>("dona");
  const [lowStockAt, setLowStockAt] = useState("3");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "CREDIT">("CASH");
  const [barcodePrice, setBarcodePrice] = useState("");
  const [onSale, setOnSale] = useState(false);
  const [salePrice, setSalePrice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setStep(isEdit ? 2 : 1);
      setName(product?.name ?? "");
      setSku(product?.sku ?? "");
      setPrice(product ? String(product.price) : "");
      setCostPrice(product ? String(product.costPrice) : "");
      setCurrency("SOM");
      setStock(product ? String(product.stock) : "");
      setUnit((product?.unit as UnitOption) ?? "dona");
      setLowStockAt(product ? String(product.lowStockAt) : "3");
      setCategoryId(product?.categoryId ?? "");
      setImageUrl(product?.imageUrl ?? "");
      setSupplierId("");
      setPaymentMethod("CASH");
      setBarcodePrice(product?.barcodePrice != null ? String(product.barcodePrice) : "");
      setOnSale(product?.onSale ?? false);
      setSalePrice(product?.salePrice != null ? String(product.salePrice) : "");
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d) => setSuppliers(d.suppliers ?? []))
      .catch(() => {});
    fetch("/api/store")
      .then((r) => r.json())
      .then((d) => setUsdRate(d.store?.usdRate ?? null))
      .catch(() => {});
  }, [open]);

  function handleScanned(code: string) {
    setSku(code);
    setScannerOpen(false);
    setStep(2);
  }

  function generateCode() {
    return `AUTO-${Date.now().toString(36).toUpperCase()}`;
  }

  function pickImage(file: File) {
    const reader = new FileReader();
    reader.onload = () => setImageUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  const effectiveCostPrice =
    currency === "USD" && usdRate ? Math.round(Number(costPrice || 0) * usdRate) : Number(costPrice || 0);

  async function save() {
    setError("");
    if (!name || !sku || !price) {
      setError("Nomi, shtrix kod va narxini kiriting");
      return;
    }
    setSaving(true);
    const payload = {
      name,
      sku,
      price,
      costPrice: effectiveCostPrice,
      stock,
      unit,
      lowStockAt,
      categoryId,
      imageUrl,
      barcodePrice: barcodePrice || null,
      onSale,
      salePrice: onSale ? salePrice : null,
      ...(isEdit ? {} : { supplierId: supplierId || undefined, paymentMethod }),
    };
    const res = await fetch(product ? `/api/products/${product.id}` : "/api/products", {
      method: product ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

  if (!isEdit && step === 1) {
    return (
      <Modal open={open} onClose={onClose} title="Yangi tovar — 1-qadam: Shtrix kodni aniqlash">
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setScannerOpen(true)}
            className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8 text-muted hover:border-accent hover:text-accent"
          >
            <ScanBarcode size={28} />
            <span className="text-sm font-medium">Skanerni ishga tushirish</span>
            <span className="text-xs">Kamerani ochish uchun bosing</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="h-px flex-1 bg-border" /> YOKI QO&apos;LDA KIRITING
            <span className="h-px flex-1 bg-border" />
          </div>

          <Field label="Shtrix kod">
            <div className="flex items-center gap-2">
              <Keyboard size={16} className="text-muted" />
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="ISBN / Shtrix kod..." />
            </div>
          </Field>

          <Button onClick={() => setStep(2)} disabled={!sku.trim()}>
            Davom etish <ArrowRight size={16} />
          </Button>
          <button
            onClick={() => {
              setSku(generateCode());
              setStep(2);
            }}
            className="text-center text-xs text-muted hover:text-accent"
          >
            Kodsiz davom etish (avto-kod yaratiladi)
          </button>
        </div>

        <BarcodeScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={handleScanned} />
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Mahsulotni tahrirlash" : "Yangi tovar — 2-qadam: Ma'lumotlarni to'ldirish"}
    >
      <div className="flex flex-col gap-3">
        {!isEdit && (
          <div className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-sm">
            <span className="font-mono">{sku}</span>
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-xs text-accent">
              <Pencil size={12} /> O&apos;zgartirish
            </button>
          </div>
        )}

        <Field label="Rasm">
          <div className="flex items-center gap-2">
            <ProductImage src={imageUrl} name={name || "?"} className="h-12 w-12 shrink-0 rounded-lg" />
            <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> Rasm yuklash
            </Button>
            <Input
              value={imageUrl.startsWith("data:") ? "" : imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="yoki havola (URL)"
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && pickImage(e.target.files[0])}
            />
          </div>
        </Field>

        {isEdit && (
          <Field label="SKU / shtrix kod">
            <Input value={sku} onChange={(e) => setSku(e.target.value)} />
          </Field>
        )}

        <Field label="Tovar nomi">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Dazmol Beltop 3502" />
        </Field>

        <Field label="Kategoriya">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Tanlang</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        {!isEdit && (
          <>
            <Field label="Tovar beruvchi">
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Tanlanmagan</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            {supplierId && (
              <Field label="To'lov usuli">
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ["CASH", "Naqd"],
                      ["CARD", "Karta"],
                      ["CREDIT", "Nasiya"],
                    ] as [typeof paymentMethod, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPaymentMethod(key)}
                      className={cn(
                        "rounded-lg border border-border py-2 text-xs font-medium text-muted",
                        paymentMethod === key && "border-accent bg-accent-soft text-accent"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
            )}
          </>
        )}

        <Field label="Narx valyutasi (tan narxi uchun)">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setCurrency("SOM")}
              className={cn(
                "rounded-lg border border-border py-2 text-xs font-medium text-muted",
                currency === "SOM" && "border-accent bg-accent-soft text-accent"
              )}
            >
              So&apos;m
            </button>
            <button
              type="button"
              onClick={() => setCurrency("USD")}
              disabled={!usdRate}
              className={cn(
                "rounded-lg border border-border py-2 text-xs font-medium text-muted disabled:opacity-40",
                currency === "USD" && "border-accent bg-accent-soft text-accent"
              )}
              title={!usdRate ? "Sozlamalar → Dollar kursini kiriting" : undefined}
            >
              Dollar
            </button>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={currency === "USD" ? "Tan narxi ($)" : "Tan narxi (so'm)"}>
            <Input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
          </Field>
          <Field label="Sotish narxi (so'm)">
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
        </div>
        {currency === "USD" && usdRate && costPrice && (
          <p className="-mt-2 text-xs text-muted">≈ {effectiveCostPrice.toLocaleString("en-US")} so&apos;m</p>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onSale}
            onChange={(e) => setOnSale(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Chegirma qo&apos;llash
        </label>
        {onSale && (
          <Field label="Chegirmali narx (so'm)">
            <Input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
          </Field>
        )}
        <p className="-mt-2 text-xs text-muted">
          Mahsulot aksiyasi. Kassadagi qo&apos;lda chegirma yoki ustama alohida qo&apos;llanadi. Ulgurji va
          etiketka narxi o&apos;zgarmaydi.
        </p>

        <Field label="Barkod narxi (so'm, ixtiyoriy)">
          <Input type="number" value={barcodePrice} onChange={(e) => setBarcodePrice(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Miqdori">
            <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
          </Field>
          <Field label="O'lchov birligi">
            <Select value={unit} onChange={(e) => setUnit(e.target.value as UnitOption)}>
              <option value="dona">Dona</option>
              <option value="litr">Litr</option>
              <option value="kg">Kg</option>
              <option value="metr">Metr</option>
            </Select>
          </Field>
        </div>
        <Field label="Kam qoldi chegarasi">
          <Input type="number" value={lowStockAt} onChange={(e) => setLowStockAt(e.target.value)} />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          {!isEdit && (
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Bekor qilish
            </Button>
          )}
          <Button onClick={save} disabled={saving} className="flex-1">
            {saving && <Loader2 size={16} className="animate-spin" />}
            Saqlash
          </Button>
        </div>
      </div>
    </Modal>
  );
}
