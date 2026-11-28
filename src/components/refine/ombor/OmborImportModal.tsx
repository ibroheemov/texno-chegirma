"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { formatSom } from "@/lib/format";
import { RfModal, RfSegment, RfSelect } from "../RfModal";
import "./ombor-modals.css";

// New design version of the Old ImportProductsModal: same column guessing, mapping and
// /api/products/import payload.

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

// Checked in order: specific patterns (tan narx, barkod narxi, chegirmali narx) before the generic "narx".
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

export function OmborImportModal({
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
  const [dragging, setDragging] = useState(false);
  // A spreadsheet may list cost prices in dollars at a fixed exchange rate.
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
          // No on/off column in a spreadsheet: a valid discount price marks the row as on sale.
          onSale: salePrice != null && salePrice > 0,
        };
      }),
    [rawRows, mapping, costCurrency, parsedUsdRate]
  );

  const invalidCount = mappedRows.filter((r) => !r.name || !(r.price > 0)).length;
  const validCount = mappedRows.length - invalidCount;
  const canImport = !!mapping.name && !!mapping.price && validCount > 0 && !costNeedsRate;
  const existingCategorySet = useMemo(() => new Set(categoryNames.map((c) => c.toLowerCase())), [categoryNames]);

  async function doImport() {
    setImporting(true);
    const res = await fetch("/api/products/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: mappedRows,
        // Unmapped fields are left untouched when an existing product (matched by SKU) is updated.
        mappedFields: TARGET_FIELDS.map((f) => f.key).filter((k) => !!mapping[k]),
        // Cost price is already in so'm; the rate keeps dollar-priced products pegged to it.
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

  const footer =
    step === "upload" ? (
      <button type="button" className="btn btn-outline" onClick={handleClose}>
        Bekor qilish
      </button>
    ) : step === "map" ? (
      <>
        <button type="button" className="btn btn-ghost rfm-f-start" onClick={() => setStep("upload")} disabled={importing}>
          <ArrowLeft className="ic" size={16} />
          Boshqa fayl
        </button>
        <button type="button" className="btn btn-outline" onClick={handleClose} disabled={importing}>
          Bekor qilish
        </button>
        <button
          type="button"
          className={`btn btn-primary${importing ? " is-loading" : ""}`}
          onClick={doImport}
          disabled={!canImport || importing}
        >
          {validCount} ta mahsulotni import qilish
        </button>
      </>
    ) : (
      <button type="button" className="btn btn-primary" onClick={handleClose}>
        Yopish
      </button>
    );

  return (
    <RfModal
      open={open}
      onClose={handleClose}
      busy={importing}
      title="Excel’dan mahsulot import qilish"
      description={
        step === "map"
          ? `${fileName} — ${rawRows.length} ta qator topildi. Har bir maydon qaysi ustundan olinishini tekshiring.`
          : step === "upload"
            ? "Ustun nomlari istalgancha bo‘lishi mumkin: keyingi qadamda har bir ustunni mos maydonga bog‘laysiz."
            : undefined
      }
      icon={<FileSpreadsheet className="ic" size={20} />}
      width={step === "map" ? 820 : 560}
      footer={footer}
    >
      <div className="steps om-im-steps" aria-label="Qadamlar">
        {(
          [
            ["upload", "Fayl"],
            ["map", "Ustunlar"],
            ["result", "Natija"],
          ] as [Step, string][]
        ).map(([key, label], index, all) => {
          const current = all.findIndex(([k]) => k === step);
          const cls = index < current ? " done" : index === current ? " current" : "";
          return (
            <div key={key} className={`step${cls}`}>
              <div className="step-top">
                <span className="step-n">{index + 1}</span>
                {index < all.length - 1 && <span className="step-line" />}
              </div>
              <span className="step-t">{label}</span>
            </div>
          );
        })}
      </div>

      {step === "upload" && (
        <>
          <label
            className={`upload om-im-drop${dragging ? " is-drag" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
          >
            <span className="up-ic">
              <Upload className="ic" size={20} />
            </span>
            <b className="t-label">Faylni tanlash yoki shu yerga tashlash</b>
            <span className="t-caption">.xlsx, .xls</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="sr"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleFile(file);
                event.target.value = "";
              }}
            />
          </label>
          {parseError && (
            <div className="alert alert-danger rfm-alert" role="alert">
              <p>{parseError}</p>
            </div>
          )}
        </>
      )}

      {step === "map" && (
        <>
          <div className="om-im-map">
            {TARGET_FIELDS.map((f) => (
              <div key={f.key} className="om-im-map-row">
                <span className="label">
                  {f.label}
                  {f.required && <span className="req">*</span>}
                </span>
                <div className="om-im-map-ctl">
                  <RfSelect
                    size="sm"
                    ariaLabel={f.label}
                    value={mapping[f.key] ?? ""}
                    onChange={(next) => setMapping((prev) => ({ ...prev, [f.key]: next || undefined }))}
                  >
                    <option value="">— tanlanmagan —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </RfSelect>
                  {f.key === "costPrice" && mapping.costPrice && (
                    <div className="om-im-cost">
                      <div className="om-im-cost-seg">
                        <RfSegment
                          value={costCurrency}
                          onChange={setCostCurrency}
                          ariaLabel="Tan narx valyutasi"
                          options={[
                            ["SOM", "so‘m"],
                            ["USD", "USD"],
                          ]}
                        />
                      </div>
                      {costCurrency === "USD" && (
                        <span className="control control-sm om-im-rate">
                          <span className="addon">1$ =</span>
                          <input
                            type="number"
                            step="any"
                            value={usdRateInput}
                            onChange={(event) => setUsdRateInput(event.target.value)}
                            aria-label="Dollar kursi"
                          />
                          <span className="addon">so‘m</span>
                        </span>
                      )}
                    </div>
                  )}
                  {f.key === "costPrice" && mapping.costPrice && costCurrency === "USD" && usdRateHint && (
                    <span className="help">{usdRateHint}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!canImport && (
            <div className="alert alert-danger rfm-alert" role="alert">
              <AlertTriangle className="ic a-ic" size={18} />
              <p>
                {costNeedsRate
                  ? "Tan narx USD tanlandi — kursni kiriting."
                  : "“Nomi” va “Sotuv narxi” uchun ustun tanlang."}
              </p>
            </div>
          )}
          {canImport && invalidCount > 0 && (
            <div className="alert alert-warning rfm-alert">
              <AlertTriangle className="ic a-ic" size={18} />
              <p>{invalidCount} ta qatorda nomi yoki narxi yo‘q — ular o‘tkazib yuboriladi.</p>
            </div>
          )}

          <div className="om-im-preview">
            <div className="tbl-wrap">
              <table className="tbl tbl-compact">
                <thead>
                  <tr>
                    <th>Nomi</th>
                    <th>Shtrix kod</th>
                    <th className="r">Sotuv narxi</th>
                    <th className="r">Tan narx</th>
                    <th className="r">Barkod narxi</th>
                    <th className="r">Chegirmali narx</th>
                    <th className="r">Miqdor</th>
                    <th className="r">Kam qoldi chegarasi</th>
                    <th>O‘lchov</th>
                    <th>Kategoriya</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedRows.slice(0, 10).map((r, i) => {
                    const invalid = !r.name || !(r.price > 0);
                    return (
                      <tr key={i} className={invalid ? "om-im-invalid" : undefined}>
                        <td className="om-im-name">{r.name || "—"}</td>
                        <td className="mono">{r.sku || "(avto)"}</td>
                        <td className="r mono">{r.price ? formatSom(r.price) : "—"}</td>
                        <td className="r mono">{r.costPrice ? formatSom(r.costPrice) : "—"}</td>
                        <td className="r mono">{r.barcodePrice ? formatSom(r.barcodePrice) : "—"}</td>
                        <td className="r mono">
                          {r.onSale && r.salePrice ? (
                            <span className="om-im-inline">
                              {formatSom(r.salePrice)}
                              <span className="badge badge-danger badge-sm">aksiya</span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="r mono">{r.stock}</td>
                        <td className="r mono">{r.lowStockAt ?? "—"}</td>
                        <td>{r.unit || "—"}</td>
                        <td>
                          {r.category ? (
                            <span className="om-im-inline">
                              {r.category}
                              {!existingCategorySet.has(r.category.toLowerCase()) && (
                                <span className="badge badge-primary badge-sm">yangi</span>
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
            </div>
            {mappedRows.length > 10 && (
              <p className="om-im-more">… va yana {mappedRows.length - 10} ta qator</p>
            )}
          </div>

          {parseError && (
            <div className="alert alert-danger rfm-alert" role="alert">
              <p>{parseError}</p>
            </div>
          )}
        </>
      )}

      {step === "result" && result && (
        <div className="empty om-im-result">
          <span className="em-ic om-im-success">
            <CheckCircle2 className="ic" size={28} />
          </span>
          <h4>
            {result.created} ta qo‘shildi, {result.updated} ta yangilandi
          </h4>
          {result.skipped.length > 0 && (
            <div className="panel om-im-skipped">
              <span className="t-label">{result.skipped.length} ta qator o‘tkazib yuborildi:</span>
              <ul>
                {result.skipped.map((s, i) => (
                  <li key={i}>
                    {s.row}-qator: {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </RfModal>
  );
}
