"use client";

import { useEffect, useRef, useState } from "react";
import type { Category, Product } from "@prisma/client";
import {
  ArrowRight,
  Camera,
  Check,
  Keyboard,
  PackagePlus,
  Pencil,
  Plus,
  ScanBarcode,
  Tag,
  Truck,
  Upload,
  X,
} from "lucide-react";
import { ProductImage } from "@/components/ui/ProductImage";
import { BarcodeScannerModal } from "@/components/pos/BarcodeScannerModal";
import { CameraCaptureModal } from "@/components/inventory/CameraCaptureModal";
import { LegacyScope } from "../LegacyScope";
import { RfField, RfModal, RfSegment, RfSelect } from "../RfModal";
import "./ombor-modals.css";

type Supplier = { id: string; name: string; phone: string | null };
type UnitOption = "dona" | "litr" | "kg" | "metr";
type PaymentMethod = "CASH" | "CARD" | "CREDIT";

// New design version of the Old ProductFormModal. Same two steps for a new product
// (barcode, then details), same validation and the same /api/products payloads.
// The camera barcode scanner and photo capture stay the Old full-screen camera views.
export function OmborProductFormModal({
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
  // Mounted only while open, so every opening starts with fresh state.
  if (!open) return null;
  return (
    <ProductForm
      key={product?.id ?? "new"}
      onClose={onClose}
      onSaved={onSaved}
      categories={categories}
      product={product}
    />
  );
}

function ProductForm({
  onClose,
  onSaved,
  categories,
  product,
}: {
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  product?: Product | null;
}) {
  const isEdit = Boolean(product);
  // A dollar-pegged product (usdRate set) shows its cost back in USD, so editing keeps the peg.
  const pegRate = product?.usdRate ?? null;

  const [step, setStep] = useState<1 | 2>(isEdit ? 2 : 1);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [costPrice, setCostPrice] = useState(
    pegRate && product
      ? String(Math.round((product.costPrice / pegRate) * 100) / 100)
      : product
        ? String(product.costPrice)
        : ""
  );
  const [currency, setCurrency] = useState<"SOM" | "USD">(pegRate ? "USD" : "SOM");
  const [usdRateInput, setUsdRateInput] = useState(pegRate ? String(pegRate) : "");
  const [usdRateHint, setUsdRateHint] = useState("");
  const [stock, setStock] = useState(product ? String(product.stock) : "");
  const [unit, setUnit] = useState<UnitOption>((product?.unit as UnitOption) ?? "dona");
  const [lowStockAt, setLowStockAt] = useState(product ? String(product.lowStockAt) : "3");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [categoryList, setCategoryList] = useState<Category[]>(categories);
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [images, setImages] = useState<string[]>(() =>
    Array.isArray(product?.images) && product.images.length
      ? (product.images as string[])
      : product?.imageUrl
        ? [product.imageUrl]
        : []
  );
  const [cameraOpen, setCameraOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [newSupplierModalOpen, setNewSupplierModalOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [supplierError, setSupplierError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [barcodePrice, setBarcodePrice] = useState(product?.barcodePrice != null ? String(product.barcodePrice) : "");
  const [onSale, setOnSale] = useState(product?.onSale ?? false);
  const [salePrice, setSalePrice] = useState(product?.salePrice != null ? String(product.salePrice) : "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
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
  }, []);

  function handleScanned(code: string) {
    setSku(code);
    setScannerOpen(false);
    setStep(2);
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
    setCategoryError("");
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingCategory(false);
    if (!res.ok) {
      setCategoryError(data.error ?? "Xatolik yuz berdi");
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
    setSupplierError("");
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed, phone: newSupplierPhone.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingSupplier(false);
    if (!res.ok) {
      setSupplierError(data.error ?? "Xatolik yuz berdi");
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
      // Sent on create and edit, so switching a product into or out of Dollar mode takes effect.
      currency: currency === "USD" ? "usd" : "som",
      usdRate: currency === "USD" ? parsedUsdRate : null,
      ...(isEdit
        ? {}
        : {
            supplierId: supplierId || undefined,
            paymentMethod,
            costUsd: currency === "USD" ? Number(costPrice || 0) : undefined,
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

  function num(value: string, set: (v: string) => void, addon?: string, extra?: { step?: string }) {
    return (
      <span className="control">
        <input
          type="number"
          inputMode="decimal"
          step={extra?.step}
          value={value}
          onChange={(event) => set(event.target.value)}
        />
        {addon && <span className="addon">{addon}</span>}
      </span>
    );
  }

  const stepper = !isEdit && (
    <div className="steps om-pf-steps" aria-label="Qadamlar">
      <div className={`step${step === 1 ? " current" : " done"}`}>
        <div className="step-top">
          <span className="step-n">{step === 1 ? 1 : <Check className="ic" size={16} strokeWidth={3} />}</span>
          <span className="step-line" />
        </div>
        <span className="step-t">Shtrix kod</span>
      </div>
      <div className={`step${step === 2 ? " current" : ""}`}>
        <div className="step-top">
          <span className="step-n">2</span>
        </div>
        <span className="step-t">Ma’lumotlar</span>
      </div>
    </div>
  );

  const barcodeStep = (
    <RfModal
      open
      onClose={onClose}
      busy={scannerOpen}
      onSubmit={() => sku.trim() && setStep(2)}
      title="Yangi tovar"
      description="1-qadam: shtrix kodni aniqlang."
      icon={<PackagePlus className="ic" size={20} />}
      width={520}
      footer={
        <>
          <button
            type="button"
            className="btn btn-link rfm-f-start"
            onClick={() => {
              setSku(String(Date.now()));
              setStep(2);
            }}
          >
            Kodsiz davom etish (avto-kod)
          </button>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Bekor qilish
          </button>
          <button type="submit" className="btn btn-primary" disabled={!sku.trim()}>
            Davom etish
            <ArrowRight className="ic" size={18} />
          </button>
        </>
      }
    >
      {stepper}
      <button type="button" className="upload om-pf-scan" onClick={() => setScannerOpen(true)}>
        <span className="up-ic">
          <ScanBarcode className="ic" size={22} />
        </span>
        <b className="t-label">Skanerni ishga tushirish</b>
        <span className="t-caption">Kamerani ochish uchun bosing</span>
      </button>
      <div className="om-pf-or">
        <span>yoki qo‘lda kiriting</span>
      </div>
      <RfField label="Shtrix kod">
        <span className="control">
          <Keyboard className="ic" size={16} />
          <input
            className="mono"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            placeholder="Masalan: 010102000226"
          />
        </span>
      </RfField>
    </RfModal>
  );

  const detailsStep = (
    <RfModal
      open
      onClose={onClose}
      busy={saving || cameraOpen}
      onSubmit={save}
      title={isEdit ? "Mahsulotni tahrirlash" : "Yangi tovar"}
      description={isEdit ? `«${product?.name}» ma’lumotlarini o‘zgartiring.` : "2-qadam: ma’lumotlarni to‘ldiring."}
      icon={isEdit ? <Pencil className="ic" size={20} /> : <PackagePlus className="ic" size={20} />}
      width={600}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Bekor qilish
          </button>
          <button type="submit" className={`btn btn-primary${saving ? " is-loading" : ""}`} disabled={saving}>
            Saqlash
          </button>
        </>
      }
    >
      {stepper}
      {!isEdit && (
        <div className="panel om-pf-sku">
          <ScanBarcode className="ic" size={18} />
          <span className="mono strong">{sku}</span>
          <button type="button" className="btn btn-link btn-sm" onClick={() => setStep(1)}>
            <Pencil className="ic" size={14} />
            O‘zgartirish
          </button>
        </div>
      )}

      <RfField label="Rasmlar" group>
        <div className="om-pf-images">
          {images.map((img, idx) => (
            <div key={idx} className="om-pf-thumb">
              <LegacyScope>
                <ProductImage src={img} name={name || "?"} className="om-pf-thumb-img" />
              </LegacyScope>
              <button
                type="button"
                className="om-pf-thumb-x"
                onClick={() => removeImage(idx)}
                aria-label={`${idx + 1}-rasmni olib tashlash`}
              >
                <X className="ic" size={12} strokeWidth={3} />
              </button>
            </div>
          ))}
          <button type="button" className="om-pf-tile" onClick={() => fileRef.current?.click()}>
            <Upload className="ic" size={18} />
            <span>Yuklash</span>
          </button>
          <button type="button" className="om-pf-tile" onClick={() => setCameraOpen(true)}>
            <Camera className="ic" size={18} />
            <span>Kamera</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="sr"
            tabIndex={-1}
            onChange={(event) => {
              if (event.target.files?.length) pickImages(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      </RfField>

      {isEdit && (
        <RfField label="SKU / shtrix kod" required>
          <span className="control">
            <input className="mono" value={sku} onChange={(event) => setSku(event.target.value)} />
          </span>
        </RfField>
      )}

      <RfField label="Tovar nomi" required>
        <span className="control">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Masalan: Dazmol Beltop 3502"
          />
        </span>
      </RfField>

      <RfField label="Kategoriya" group>
        <div className="rfm-inline">
          <RfSelect value={categoryId} onChange={setCategoryId} ariaLabel="Kategoriya">
            <option value="">Tanlang</option>
            {categoryList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </RfSelect>
          <button
            type="button"
            className="btn btn-outline btn-icon"
            onClick={() => setNewCategoryModalOpen(true)}
            aria-label="Yangi kategoriya"
            title="Yangi kategoriya"
          >
            <Plus className="ic" size={18} />
          </button>
        </div>
      </RfField>

      {!isEdit && (
        <>
          <RfField label="Tovar beruvchi" group>
            <div className="rfm-inline">
              <RfSelect value={supplierId} onChange={setSupplierId} ariaLabel="Tovar beruvchi">
                <option value="">Tanlanmagan</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </RfSelect>
              <button
                type="button"
                className="btn btn-outline btn-icon"
                onClick={() => setNewSupplierModalOpen(true)}
                aria-label="Yangi tovar beruvchi"
                title="Yangi tovar beruvchi"
              >
                <Plus className="ic" size={18} />
              </button>
            </div>
          </RfField>
          {supplierId && (
            <RfField label="To‘lov usuli" group>
              <RfSegment
                value={paymentMethod}
                onChange={setPaymentMethod}
                ariaLabel="To‘lov usuli"
                options={[
                  ["CASH", "Naqd"],
                  ["CARD", "Karta"],
                  ["CREDIT", "Nasiya"],
                ]}
              />
            </RfField>
          )}
        </>
      )}

      <div className="om-pf-section">
        <span className="t-overline">Narx</span>
      </div>

      <RfField label="Narx valyutasi (tan narxi uchun)" group>
        <RfSegment
          value={currency}
          onChange={setCurrency}
          ariaLabel="Narx valyutasi"
          options={[
            ["SOM", "So‘m"],
            ["USD", "Dollar"],
          ]}
        />
      </RfField>

      {currency === "USD" ? (
        <>
          <div className="rfm-grid-3">
            <RfField label="Narx ($)">
              <span className="control">
                <span className="addon">$</span>
                <input
                  type="number"
                  step="any"
                  value={costPrice}
                  onChange={(event) => setCostPrice(event.target.value)}
                />
              </span>
            </RfField>
            <RfField label="Kurs (1$ = ? so‘m)" help={usdRateHint || undefined}>
              {num(usdRateInput, setUsdRateInput, undefined, { step: "any" })}
            </RfField>
            <RfField label="Jami (so‘m)">
              <span className="control is-disabled">
                <input
                  className="mono"
                  type="text"
                  value={effectiveCostPrice ? effectiveCostPrice.toLocaleString("en-US") : ""}
                  readOnly
                  disabled
                />
              </span>
            </RfField>
          </div>
          <RfField label="Sotish narxi" required>
            {num(price, setPrice, "so‘m")}
          </RfField>
        </>
      ) : (
        <div className="rfm-grid-2">
          <RfField label="Tan narxi">{num(costPrice, setCostPrice, "so‘m")}</RfField>
          <RfField label="Sotish narxi" required>
            {num(price, setPrice, "so‘m")}
          </RfField>
        </div>
      )}

      <div className="om-pf-sale">
        <label className="check">
          <input type="checkbox" checked={onSale} onChange={(event) => setOnSale(event.target.checked)} />
          <span className="box">
            <Check className="ic" size={14} strokeWidth={3} />
          </span>
          <span>
            <b className="t-label">Chegirma qo‘llash</b>
            <span className="opt-desc">
              Mahsulot aksiyasi. Kassadagi qo‘lda chegirma yoki ustama alohida qo‘llanadi. Ulgurji va etiketka narxi
              o‘zgarmaydi.
            </span>
          </span>
        </label>
        {onSale && (
          <RfField label="Chegirmali narx">
            {num(salePrice, setSalePrice, "so‘m")}
            {discountPercent !== null && (
              <span className="om-pf-discount">
                <span className="mono om-price-old">{Number(price).toLocaleString("en-US")} so‘m</span>
                <span className="mono strong om-price-sale">{Number(salePrice).toLocaleString("en-US")} so‘m</span>
                <span className="badge badge-danger">−{discountPercent}%</span>
              </span>
            )}
          </RfField>
        )}
      </div>

      <RfField label="Barkod narxi" optional help="Etiketkada shu narx chiqadi; bo‘sh bo‘lsa sotish narxi.">
        {num(barcodePrice, setBarcodePrice, "so‘m")}
      </RfField>

      <div className="om-pf-section">
        <span className="t-overline">Qoldiq</span>
      </div>

      <div className="rfm-grid-2">
        <RfField label="Miqdori">{num(stock, setStock)}</RfField>
        <RfField label="O‘lchov birligi">
          <RfSelect value={unit} onChange={(next) => setUnit(next as UnitOption)}>
            <option value="dona">Dona</option>
            <option value="litr">Litr</option>
            <option value="kg">Kg</option>
            <option value="metr">Metr</option>
          </RfSelect>
        </RfField>
      </div>
      <RfField label="Kam qoldi chegarasi" help="Qoldiq shu songa tushganda “Kam qolgan” deb belgilanadi.">
        {num(lowStockAt, setLowStockAt)}
      </RfField>

      {error && (
        <div className="alert alert-danger rfm-alert" role="alert">
          <p>{error}</p>
        </div>
      )}
    </RfModal>
  );

  return (
    <>
      {!isEdit && step === 1 ? barcodeStep : detailsStep}

      <RfModal
        open={newCategoryModalOpen}
        onClose={() => setNewCategoryModalOpen(false)}
        nested
        busy={savingCategory}
        onSubmit={addCategory}
        title="Yangi kategoriya"
        icon={<Tag className="ic" size={20} />}
        width={440}
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setNewCategoryModalOpen(false)}
              disabled={savingCategory}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className={`btn btn-primary${savingCategory ? " is-loading" : ""}`}
              disabled={savingCategory || !newCategoryName.trim()}
            >
              Qo‘shish
            </button>
          </>
        }
      >
        <RfField label="Kategoriya nomi" required error={categoryError || undefined}>
          <span className={`control${categoryError ? " is-error" : ""}`}>
            <input
              autoFocus
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="Masalan: Telefonlar"
            />
          </span>
        </RfField>
      </RfModal>

      <RfModal
        open={newSupplierModalOpen}
        onClose={() => setNewSupplierModalOpen(false)}
        nested
        busy={savingSupplier}
        onSubmit={addSupplier}
        title="Yangi tovar beruvchi"
        icon={<Truck className="ic" size={20} />}
        width={440}
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setNewSupplierModalOpen(false)}
              disabled={savingSupplier}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className={`btn btn-primary${savingSupplier ? " is-loading" : ""}`}
              disabled={savingSupplier || !newSupplierName.trim()}
            >
              Qo‘shish
            </button>
          </>
        }
      >
        <RfField label="Nomi" required>
          <span className="control">
            <input autoFocus value={newSupplierName} onChange={(event) => setNewSupplierName(event.target.value)} />
          </span>
        </RfField>
        <RfField label="Telefon" optional error={supplierError || undefined}>
          <span className="control">
            <input
              type="tel"
              value={newSupplierPhone}
              onChange={(event) => setNewSupplierPhone(event.target.value)}
              placeholder="+998"
            />
          </span>
        </RfField>
      </RfModal>

      <LegacyScope>
        <BarcodeScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={handleScanned} />
        <CameraCaptureModal
          open={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onCapture={(dataUrl) => setImages((prev) => [...prev, dataUrl])}
        />
      </LegacyScope>
    </>
  );
}
