"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Upload, CheckCircle2, ArrowLeft } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { formatSom } from "@/lib/format";
import { cn } from "@/lib/cn";

type TargetField =
  | "name"
  | "sku"
  | "price"
  | "costPrice"
  | "barcodePrice"
  | "stock"
  | "category"
  | "unit"
  | "lowStockAt"
  | "salePrice";

const TARGET_FIELDS: { key: TargetField; label: string; required?: boolean }[] = [
  { key: "name", label: "Nomi", required: true },
  { key: "price", label: "Sotuv narxi", required: true },
  { key: "costPrice", label: "Tan narx" },
  { key: "barcodePrice", label: "Barkod narxi" },
  { key: "salePrice", label: "Chegirmali narx" },
  { key: "sku", label: "Shtrix kod" },
  { key: "stock", label: "Miqdor" },
  { key: "lowStockAt", label: "Kam qoldi chegarasi" },
  { key: "category", label: "Kategoriya" },
  { key: "unit", label: "O'lchov birligi" },
];

// Checked in order — more specific patterns (tan narx, barkod narxi, chegirmali
// narx) must come before the generic "narx" one so headers like "Tan narx" or
// "Chegirmali narx" don't get guessed as the plain sale price.
const GUESS_PATTERNS: [TargetField, RegExp][] = [
  ["sku", /shtrix|barcode|\bsku\b|\bkod\b/i],
  ["costPrice", /tan\s*narx|cost/i],
  ["barcodePrice", /barkod.*narx/i],
  ["salePrice", /chegirma.*narx|chegirmali|sale\s*price|aksiya.*narx/i],
  ["price", /narx|price|baho/i],
  ["lowStockAt", /kam\s*qol.*chegara|minimal|min\s*qoldiq|low\s*stock/i],
  ["stock", /miqdor|qoldiq|soni|stock|qty/i],
  ["category", /kategoriya|turkum|\bturi\b|category/i],
  ["unit", /birlik|o'lcham|o'lchov|unit/i],
  ["name", /nom|name|mahsulot|tovar/i],
];

function guessField(header: string): TargetField | null {
  for (const [field, pattern] of GUESS_PATTERNS) {
    if (pattern.test(header)) return field;
  }
  return null;
}

function parseNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

type RawRow = Record<string, unknown>;
type MappedRow = {
  name: string;
  sku: string;
  price: number;
  costPrice: number;
  barcodePrice: number | null;
  stock: number;
  category: string;
  unit: string;
  lowStockAt: number | null;
  salePrice: number | null;
  onSale: boolean;
};

type ImportResult = {
  created: number;
  updated: number;
  skipped: { row: number; reason: string }[];
};

type Step = "upload" | "map" | "result";

export function ImportProductsModal({
  open,
  onClose,
  onImported,
  categoryNames,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  categoryNames: string[];
}) {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<TargetField, string>>>({});
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  // Tan narx (cost price) column's currency — a spreadsheet may list costs in
  // dollars at a fixed exchange rate rather than so'm.
  const [costCurrency, setCostCurrency] = useState<"SOM" | "USD">("SOM");
  const [usdRateInput, setUsdRateInput] = useState("");
  const [usdRateHint, setUsdRateHint] = useState("");

  useEffect(() => {
    if (!open) return;
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

  function reset() {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setParseError("");
    setResult(null);
    setCostCurrency("SOM");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    setParseError("");
    setFileName(file.name);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });
      if (json.length === 0) {
        setParseError("Fayl bo'sh yoki o'qib bo'lmadi");
        return;
      }
      const detectedHeaders = Object.keys(json[0]);
      const guessed: Partial<Record<TargetField, string>> = {};
      for (const h of detectedHeaders) {
        const field = guessField(h);
        if (field && !guessed[field]) guessed[field] = h;
      }
      setHeaders(detectedHeaders);
      setRawRows(json);
      setMapping(guessed);
      setStep("map");
    } catch {
      setParseError("Faylni o'qib bo'lmadi — .xlsx formatida ekanligiga ishonch hosil qiling");
    }
  }

  const parsedUsdRate = Number(usdRateInput || 0);
  const costNeedsRate = !!mapping.costPrice && costCurrency === "USD" && !(parsedUsdRate > 0);

  const mappedRows: MappedRow[] = useMemo(
    () =>
      rawRows.map((r) => {
        const salePrice = mapping.salePrice ? parseNumber(r[mapping.salePrice]) || null : null;
        const rawCostPrice = mapping.costPrice ? parseNumber(r[mapping.costPrice]) : 0;
        return {
          name: mapping.name ? String(r[mapping.name] ?? "").trim() : "",
          sku: mapping.sku ? String(r[mapping.sku] ?? "").trim() : "",
          price: mapping.price ? parseNumber(r[mapping.price]) : 0,
          costPrice:
            costCurrency === "USD" && parsedUsdRate > 0 ? Math.round(rawCostPrice * parsedUsdRate) : rawCostPrice,
          barcodePrice: mapping.barcodePrice ? parseNumber(r[mapping.barcodePrice]) || null : null,
          stock: mapping.stock ? parseNumber(r[mapping.stock]) : 0,
          category: mapping.category ? String(r[mapping.category] ?? "").trim() : "",
          unit: mapping.unit ? String(r[mapping.unit] ?? "").trim() : "",
          lowStockAt: mapping.lowStockAt ? parseNumber(r[mapping.lowStockAt]) : null,
          salePrice,
          // A row is treated as "on sale" whenever a valid discount price is given —
          // there's no separate on/off column in a spreadsheet, so the discount
          // price column itself doubles as the toggle.
          onSale: salePrice != null && salePrice > 0,
        };
      }),
    [rawRows, mapping, costCurrency, parsedUsdRate]
  );

  const invalidCount = mappedRows.filter((r) => !r.name || !(r.price > 0)).length;
  const canImport = !!mapping.name && !!mapping.price && mappedRows.length - invalidCount > 0 && !costNeedsRate;
  const existingCategorySet = useMemo(
    () => new Set(categoryNames.map((c) => c.toLowerCase())),
    [categoryNames]
  );

  async function doImport() {
    setImporting(true);
    const res = await fetch("/api/products/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: mappedRows,
        // Which target fields actually had a source column chosen — when
        // updating an existing product (matched by SKU), unmapped fields are
        // left untouched instead of being overwritten with defaults (0/null).
        mappedFields: TARGET_FIELDS.map((f) => f.key).filter((k) => !!mapping[k]),
        // Cost price has already been converted to so'm above; the rate is
        // also sent so dollar-priced products stay pegged to it and rescale
        // automatically as the live USD rate moves, like a manually added one.
        costCurrencyUsd: costCurrency === "USD",
        usdRate: parsedUsdRate,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setImporting(false);
    if (!res.ok) {
      setParseError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    setResult(data);
    setStep("result");
    if ((data.created ?? 0) + (data.updated ?? 0) > 0) onImported();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Excel'dan mahsulot import qilish">
      {step === "upload" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            .xlsx faylni yuklang. Ustun nomlari istalgancha bo&apos;lishi mumkin — keyingi qadamda har bir
            ustunni mos maydonga o&apos;zingiz bog&apos;laysiz.
          </p>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-muted hover:border-accent hover:text-accent">
            <Upload size={24} />
            <span className="text-sm font-medium">Faylni tanlash</span>
            <span className="text-xs">.xlsx</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </label>
          {parseError && <p className="text-sm text-danger">{parseError}</p>}
        </div>
      )}

      {step === "map" && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted">
            {fileName} — {rawRows.length} ta qator topildi. Har bir maydon qaysi ustundan olinishini tekshiring.
          </p>

          <div className="flex flex-col gap-2">
            {TARGET_FIELDS.map((f) => (
              <div key={f.key}>
                <div className="grid grid-cols-2 items-center gap-2">
                  <label className="text-sm">
                    {f.label}
                    {f.required && <span className="text-danger"> *</span>}
                  </label>
                  <Select
                    value={mapping[f.key] ?? ""}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [f.key]: e.target.value || undefined }))
                    }
                  >
                    <option value="">— tanlanmagan —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </div>
                {f.key === "costPrice" && mapping.costPrice && (
                  <div className="mt-1.5 flex items-center gap-2 pl-0">
                    <div className="flex rounded-lg border border-border p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setCostCurrency("SOM")}
                        className={cn(
                          "rounded-md px-2 py-1 font-medium",
                          costCurrency === "SOM" ? "bg-accent text-accent-foreground" : "text-muted"
                        )}
                      >
                        so&apos;m
                      </button>
                      <button
                        type="button"
                        onClick={() => setCostCurrency("USD")}
                        className={cn(
                          "rounded-md px-2 py-1 font-medium",
                          costCurrency === "USD" ? "bg-accent text-accent-foreground" : "text-muted"
                        )}
                      >
                        USD
                      </button>
                    </div>
                    {costCurrency === "USD" && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-muted">Kurs (1$=</span>
                        <input
                          type="number"
                          step="any"
                          value={usdRateInput}
                          onChange={(e) => setUsdRateInput(e.target.value)}
                          className="h-7 w-24 rounded-md border border-border bg-surface px-1.5 text-right outline-none focus:border-accent"
                        />
                        <span className="text-muted">so&apos;m)</span>
                      </div>
                    )}
                  </div>
                )}
                {f.key === "costPrice" && mapping.costPrice && costCurrency === "USD" && usdRateHint && (
                  <p className="pl-0 text-[10px] text-muted">{usdRateHint}</p>
                )}
              </div>
            ))}
          </div>

          {!canImport && (
            <p className="text-xs text-danger">
              {costNeedsRate
                ? "Tan narx USD tanlandi — kursni kiriting."
                : "\"Nomi\" va \"Sotuv narxi\" uchun ustun tanlang."}
            </p>
          )}
          {canImport && invalidCount > 0 && (
            <p className="text-xs text-warning">
              {invalidCount} ta qatorda nomi yoki narxi yo&apos;q — ular o&apos;tkazib yuboriladi.
            </p>
          )}

          <div className="max-h-56 overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[960px] text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-2 py-1.5 font-medium">Nomi</th>
                  <th className="px-2 py-1.5 font-medium">Shtrix kod</th>
                  <th className="px-2 py-1.5 text-right font-medium">Sotuv narxi</th>
                  <th className="px-2 py-1.5 text-right font-medium">Tan narx</th>
                  <th className="px-2 py-1.5 text-right font-medium">Barkod narxi</th>
                  <th className="px-2 py-1.5 text-right font-medium">Chegirmali narx</th>
                  <th className="px-2 py-1.5 text-right font-medium">Miqdor</th>
                  <th className="px-2 py-1.5 text-right font-medium">Kam qoldi chegarasi</th>
                  <th className="px-2 py-1.5 font-medium">O&apos;lchov</th>
                  <th className="px-2 py-1.5 font-medium">Kategoriya</th>
                </tr>
              </thead>
              <tbody>
                {mappedRows.slice(0, 10).map((r, i) => {
                  const invalid = !r.name || !(r.price > 0);
                  return (
                    <tr key={i} className={cnRow(invalid)}>
                      <td className="truncate px-2 py-1.5">{r.name || "—"}</td>
                      <td className="px-2 py-1.5">{r.sku || "(avto)"}</td>
                      <td className="px-2 py-1.5 text-right">{r.price ? formatSom(r.price) : "—"}</td>
                      <td className="px-2 py-1.5 text-right">{r.costPrice ? formatSom(r.costPrice) : "—"}</td>
                      <td className="px-2 py-1.5 text-right">{r.barcodePrice ? formatSom(r.barcodePrice) : "—"}</td>
                      <td className="px-2 py-1.5 text-right">
                        {r.onSale && r.salePrice ? (
                          <span className="flex items-center justify-end gap-1">
                            {formatSom(r.salePrice)}
                            <Badge tone="danger" className="px-1.5 py-0 text-[10px]">
                              aksiya
                            </Badge>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right">{r.stock}</td>
                      <td className="px-2 py-1.5 text-right">{r.lowStockAt ?? "—"}</td>
                      <td className="px-2 py-1.5">{r.unit || "—"}</td>
                      <td className="px-2 py-1.5">
                        {r.category ? (
                          <span className="flex items-center gap-1">
                            {r.category}
                            {!existingCategorySet.has(r.category.toLowerCase()) && (
                              <Badge tone="accent" className="px-1.5 py-0 text-[10px]">
                                yangi
                              </Badge>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {mappedRows.length > 10 && (
              <p className="border-t border-border px-2 py-1.5 text-center text-[11px] text-muted">
                ... va yana {mappedRows.length - 10} ta qator
              </p>
            )}
          </div>

          {parseError && <p className="text-sm text-danger">{parseError}</p>}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep("upload")}
              className="flex items-center gap-1 text-xs font-medium text-muted hover:text-accent"
            >
              <ArrowLeft size={14} /> Boshqa fayl
            </button>
            <Button onClick={doImport} disabled={!canImport || importing}>
              {importing && <Loader2 size={16} className="animate-spin" />}
              {mappedRows.length - invalidCount} ta mahsulotni import qilish
            </Button>
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 size={36} className="text-accent" />
          <p className="text-sm font-semibold">
            {result.created} ta qo&apos;shildi, {result.updated} ta yangilandi
          </p>
          {result.skipped.length > 0 && (
            <div className="w-full rounded-lg bg-surface-muted p-3 text-left text-xs">
              <p className="mb-1.5 font-medium text-muted">
                {result.skipped.length} ta qator o&apos;tkazib yuborildi:
              </p>
              <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
                {result.skipped.map((s, i) => (
                  <p key={i} className="text-muted">
                    {s.row}-qator: {s.reason}
                  </p>
                ))}
              </div>
            </div>
          )}
          <Button onClick={handleClose} className="mt-2">
            Yopish
          </Button>
        </div>
      )}
    </Modal>
  );
}

function cnRow(invalid: boolean) {
  return `border-b border-border/60 last:border-0 ${invalid ? "text-danger" : ""}`;
}
