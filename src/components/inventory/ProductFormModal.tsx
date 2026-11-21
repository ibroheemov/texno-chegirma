"use client";

import { useEffect, useRef, useState } from "react";
import type { Category, Product } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProductImage } from "@/components/ui/ProductImage";
import { Loader2, ScanBarcode, Keyboard, ArrowRight, Pencil, Upload, Camera, Plus, X } from "lucide-react";
import { BarcodeScannerModal } from "@/components/pos/BarcodeScannerModal";
import { CameraCaptureModal } from "./CameraCaptureModal";
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
  const [usdRateInput, setUsdRateInput] = useState("");
  const [usdRateHint, setUsdRateHint] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState<UnitOption>("dona");
  const [lowStockAt, setLowStockAt] = useState("3");
  const [categoryId, setCategoryId] = useState("");
  const [categoryList, setCategoryList] = useState<Category[]>(categories);
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [newSupplierModalOpen, setNewSupplierModalOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [savingSupplier, setSavingSupplier] = useState(false);
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
      setUsdRateInput("");
      setStock(product ? String(product.stock) : "");
      setUnit((product?.unit as UnitOption) ?? "dona");
      setLowStockAt(product ? String(product.lowStockAt) : "3");
      setCategoryId(product?.categoryId ?? "");
      setCategoryList(categories);
      setNewCategoryModalOpen(false);
      setNewCategoryName("");
      setImages(
        Array.isArray(product?.images) && product.images.length
          ? (product.images as string[])
          : product?.imageUrl
            ? [product.imageUrl]
            : []
      );
      setCameraOpen(false);
      setSupplierId("");
      setNewSupplierModalOpen(false);
      setNewSupplierName("");
      setNewSupplierPhone("");
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
    // Live CBU rate (falls back to the store's manual rate).
    fetch("/api/usd-rate")
      .then((r) => r.json())
      .then((d) => {
        const info = d.rate as { rate: number; source: "telegram" | "cbu" | "manual"; date?: string } | null;
        if (!info) return;
        setUsdRateInput((prev) => prev || String(info.rate));
        setUsdRateHint(
          info.source === "cbu"
            ? `CBU kursi (${info.date})`
            : info.source === "telegram"
              ? "Bozor kursi (Telegram)"
              : "Qo'lda kiritilgan kurs"
        );
      })
      .catch(() => {});
  }, [open]);

  function handleScanned(code: string) {
    setSku(code);
    setScannerOpen(false);
    setStep(2);
  }

  function generateCode() {
    return String(Date.now());
  }

  function pickImages(files: FileList) {
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setImages((prev) => [...prev, String(reader.result)]);
      reader.readAsDataURL(file);
    });
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function addCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setSavingCategory(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    const data = await res.json();
    setSavingCategory(false);
    if (!res.ok) {
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    setCategoryList((prev) => [...prev, data.category].sort((a, b) => a.name.localeCompare(b.name)));
    setCategoryId(data.category.id);
    setNewCategoryName("");
    setNewCategoryModalOpen(false);
  }

  async function addSupplier() {
    const trimmed = newSupplierName.trim();
    if (!trimmed) return;
    setSavingSupplier(true);
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed, phone: newSupplierPhone.trim() || undefined }),
    });
    const data = await res.json();
    setSavingSupplier(false);
    if (!res.ok) {
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    setSuppliers((prev) => [...prev, data.supplier].sort((a, b) => a.name.localeCompare(b.name)));
    setSupplierId(data.supplier.id);
    setNewSupplierName("");
    setNewSupplierPhone("");
    setNewSupplierModalOpen(false);
  }

  const parsedUsdRate = Number(usdRateInput || 0);
  const effectiveCostPrice =
    currency === "USD" && parsedUsdRate > 0
      ? Math.round(Number(costPrice || 0) * parsedUsdRate)
      : Number(costPrice || 0);

  const discountPercent =
    onSale && Number(price) > 0 && Number(salePrice) > 0 && Number(salePrice) < Number(price)
      ? Math.round(((Number(price) - Number(salePrice)) / Number(price)) * 100)
      : null;

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
      images,
      barcodePrice: barcodePrice || null,
      onSale,
      salePrice: onSale ? salePrice : null,
      ...(isEdit
        ? {}
        : {
            supplierId: supplierId || undefined,
            paymentMethod,
            currency: currency === "USD" ? "usd" : "som",
            costUsd: currency === "USD" ? Number(costPrice || 0) : undefined,
            usdRate: currency === "USD" ? parsedUsdRate : undefined,
          }),
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
              <Input
                value={sku}
                onChange={(e) => setSku(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="Masalan: 010102000226"
              />
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
    <>
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

        <Field label="Rasmlar">
          <div className="flex flex-wrap gap-2">
            {images.map((img, idx) => (
              <div key={idx} className="group relative h-16 w-16 shrink-0">
                <ProductImage src={img} name={name || "?"} className="h-16 w-16 rounded-lg" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted hover:border-accent hover:text-accent"
            >
              <Upload size={16} />
              <span className="text-[10px]">Yuklash</span>
            </button>
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted hover:border-accent hover:text-accent"
            >
              <Camera size={16} />
              <span className="text-[10px]">Kamera</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) pickImages(e.target.files);
                e.target.value = "";
              }}
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
          <div className="flex items-center gap-2">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full flex-1">
              <option value="">Tanlang</option>
              {categoryList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Button type="button" size="sm" variant="secondary" onClick={() => setNewCategoryModalOpen(true)}>
              <Plus size={14} />
            </Button>
          </div>
        </Field>

        {!isEdit && (
          <>
            <Field label="Tovar beruvchi">
              <div className="flex items-center gap-2">
                <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full flex-1">
                  <option value="">Tanlanmagan</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <Button type="button" size="sm" variant="secondary" onClick={() => setNewSupplierModalOpen(true)}>
                  <Plus size={14} />
                </Button>
              </div>
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
              className={cn(
                "rounded-lg border border-border py-2 text-xs font-medium text-muted",
                currency === "USD" && "border-accent bg-accent-soft text-accent"
              )}
            >
              Dollar
            </button>
          </div>
        </Field>

        {currency === "USD" ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Narx ($)">
                <Input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
              </Field>
              <Field label="Kurs (1$=?so'm)">
                <Input type="number" step="any" value={usdRateInput} onChange={(e) => setUsdRateInput(e.target.value)} />
                {usdRateHint && <p className="mt-1 text-[10px] text-muted">{usdRateHint}</p>}
              </Field>
              <Field label="Jami (so'm)">
                <Input
                  type="text"
                  value={effectiveCostPrice ? effectiveCostPrice.toLocaleString("en-US") : ""}
                  readOnly
                  disabled
                />
              </Field>
            </div>
            <Field label="Sotish narxi (so'm)">
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tan narxi (so'm)">
              <Input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
            </Field>
            <Field label="Sotish narxi (so'm)">
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
          </div>
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
            {discountPercent !== null && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-muted line-through">{Number(price).toLocaleString("en-US")} so&apos;m</span>
                <span className="font-semibold text-accent">{Number(salePrice).toLocaleString("en-US")} so&apos;m</span>
                <Badge tone="danger">-{discountPercent}%</Badge>
              </div>
            )}
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

    <Modal open={newCategoryModalOpen} onClose={() => setNewCategoryModalOpen(false)} title="Yangi kategoriya">
      <div className="flex flex-col gap-3">
        <Input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="Kategoriya nomi..."
          autoFocus
        />
        <Button onClick={addCategory} disabled={savingCategory || !newCategoryName.trim()}>
          {savingCategory && <Loader2 size={16} className="animate-spin" />}
          Qo&apos;shish
        </Button>
      </div>
    </Modal>

    <Modal open={newSupplierModalOpen} onClose={() => setNewSupplierModalOpen(false)} title="Yangi tovar beruvchi">
      <div className="flex flex-col gap-3">
        <Input
          value={newSupplierName}
          onChange={(e) => setNewSupplierName(e.target.value)}
          placeholder="Nomi"
          autoFocus
        />
        <Input
          value={newSupplierPhone}
          onChange={(e) => setNewSupplierPhone(e.target.value)}
          placeholder="Telefon (ixtiyoriy)"
        />
        <Button onClick={addSupplier} disabled={savingSupplier || !newSupplierName.trim()}>
          {savingSupplier && <Loader2 size={16} className="animate-spin" />}
          Qo&apos;shish
        </Button>
      </div>
    </Modal>

    <CameraCaptureModal
      open={cameraOpen}
      onClose={() => setCameraOpen(false)}
      onCapture={(dataUrl) => setImages((prev) => [...prev, dataUrl])}
    />
    </>
  );
}
