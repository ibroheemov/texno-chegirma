"use client";

import { useMemo, useState } from "react";
import { Loader2, Upload, CheckCircle2, ArrowLeft } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { formatSom } from "@/lib/format";

type TargetField = "name" | "sku" | "price" | "costPrice" | "barcodePrice" | "stock" | "category" | "unit";

const TARGET_FIELDS: { key: TargetField; label: string; required?: boolean }[] = [
  { key: "name", label: "Nomi", required: true },
  { key: "price", label: "Sotuv narxi", required: true },
  { key: "costPrice", label: "Tan narx" },
  { key: "barcodePrice", label: "Barkod narxi" },
  { key: "sku", label: "Shtrix kod" },
  { key: "stock", label: "Miqdor" },
  { key: "category", label: "Kategoriya" },
  { key: "unit", label: "O'lchov birligi" },
];

// Checked in order — more specific patterns (tan narx, barkod narxi) must come
// before the generic "narx" one so a header like "Tan narx" doesn't get
// guessed as the sale price.
const GUESS_PATTERNS: [TargetField, RegExp][] = [
  ["sku", /shtrix|barcode|\bsku\b|\bkod\b/i],
  ["costPrice", /tan\s*narx|cost/i],
  ["barcodePrice", /barkod.*narx/i],
  ["price", /narx|price|baho/i],
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

  function reset() {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setParseError("");
    setResult(null);
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

  const mappedRows: MappedRow[] = useMemo(
    () =>
      rawRows.map((r) => ({
        name: mapping.name ? String(r[mapping.name] ?? "").trim() : "",
        sku: mapping.sku ? String(r[mapping.sku] ?? "").trim() : "",
        price: mapping.price ? parseNumber(r[mapping.price]) : 0,
        costPrice: mapping.costPrice ? parseNumber(r[mapping.costPrice]) : 0,
        barcodePrice: mapping.barcodePrice ? parseNumber(r[mapping.barcodePrice]) || null : null,
        stock: mapping.stock ? parseNumber(r[mapping.stock]) : 0,
        category: mapping.category ? String(r[mapping.category] ?? "").trim() : "",
        unit: mapping.unit ? String(r[mapping.unit] ?? "").trim() : "",
      })),
    [rawRows, mapping]
  );

  const invalidCount = mappedRows.filter((r) => !r.name || !(r.price > 0)).length;
  const canImport = !!mapping.name && !!mapping.price && mappedRows.length - invalidCount > 0;
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
              <div key={f.key} className="grid grid-cols-2 items-center gap-2">
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
            ))}
          </div>

          {!canImport && (
            <p className="text-xs text-danger">
              &quot;Nomi&quot; va &quot;Sotuv narxi&quot; uchun ustun tanlang.
            </p>
          )}
          {canImport && invalidCount > 0 && (
            <p className="text-xs text-warning">
              {invalidCount} ta qatorda nomi yoki narxi yo&apos;q — ular o&apos;tkazib yuboriladi.
            </p>
          )}

          <div className="max-h-56 overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[520px] text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-2 py-1.5 font-medium">Nomi</th>
                  <th className="px-2 py-1.5 font-medium">Kod</th>
                  <th className="px-2 py-1.5 text-right font-medium">Narx</th>
                  <th className="px-2 py-1.5 text-right font-medium">Miqdor</th>
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
                      <td className="px-2 py-1.5 text-right">{r.stock}</td>
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
