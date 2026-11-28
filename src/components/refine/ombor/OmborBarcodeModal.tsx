"use client";

import { useState } from "react";
import type { Category, Product } from "@prisma/client";
import { Barcode, Check, PackageSearch, Printer, Search } from "lucide-react";
import { RfModal } from "../RfModal";
import "./ombor-modals.css";

type ProductRow = Product & { category: Category | null };

// New design version of the Old BarcodeLabelsModal. Labels print the product name and barcode only (no price).
export function OmborBarcodeModal({
  open,
  onClose,
  products,
}: {
  open: boolean;
  onClose: () => void;
  products: ProductRow[];
}) {
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [printing, setPrinting] = useState(false);
  const [query, setQuery] = useState("");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return next;
    });
  }

  function setQty(id: string, qty: number) {
    setSelected((prev) => ({ ...prev, [id]: Math.max(1, qty) }));
  }

  async function print() {
    const chosen = products.filter((p) => selected[p.id]);
    if (chosen.length === 0) return;
    setPrinting(true);

    const JsBarcode = (await import("jsbarcode")).default;
    const svgNs = "http://www.w3.org/2000/svg";
    const labels: string[] = [];

    for (const p of chosen) {
      const qty = selected[p.id] ?? 1;
      const svgEl = document.createElementNS(svgNs, "svg");
      try {
        JsBarcode(svgEl, p.sku, { format: "CODE128", width: 2, height: 40, fontSize: 12, margin: 4 });
      } catch {
        continue;
      }
      const svgMarkup = new XMLSerializer().serializeToString(svgEl);
      for (let i = 0; i < qty; i++) {
        labels.push(`
          <div class="label">
            <div class="name">${escapeHtml(p.name)}</div>
            ${svgMarkup}
          </div>
        `);
      }
    }

    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) {
      setPrinting(false);
      return;
    }
    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Shtrix kod etiketkalari</title>
          <style>
            body { font-family: sans-serif; margin: 0; padding: 12px; }
            .grid { display: flex; flex-wrap: wrap; gap: 8px; }
            .label {
              width: 190px;
              border: 1px dashed #999;
              border-radius: 6px;
              padding: 8px;
              text-align: center;
              page-break-inside: avoid;
            }
            .name { font-size: 11px; font-weight: 600; margin-bottom: 4px; line-height: 1.2; min-height: 26px; }
            svg { max-width: 100%; }
          </style>
        </head>
        <body>
          <div class="grid">${labels.join("")}</div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    win.document.close();
    setPrinting(false);
  }

  const selectedCount = Object.values(selected).reduce((a, b) => a + b, 0);
  const productCount = Object.keys(selected).length;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredProducts = normalizedQuery
    ? products.filter(
        (p) => p.name.toLowerCase().includes(normalizedQuery) || p.sku.toLowerCase().includes(normalizedQuery)
      )
    : products;

  function handleClose() {
    setQuery("");
    onClose();
  }

  return (
    <RfModal
      open={open}
      onClose={handleClose}
      title="Shtrix kod etiketkalari"
      description="Chop etish uchun mahsulotlarni va dona sonini tanlang."
      icon={<Barcode className="ic" size={20} />}
      width={600}
      footer={
        <>
          <span className="t-body-sm rfm-f-start om-bc-summary">
            {productCount > 0 ? `${productCount} ta mahsulot tanlandi` : "Hech narsa tanlanmagan"}
          </span>
          <button type="button" className="btn btn-outline" onClick={handleClose}>
            Bekor qilish
          </button>
          <button
            type="button"
            className={`btn btn-primary${printing ? " is-loading" : ""}`}
            onClick={print}
            disabled={selectedCount === 0 || printing}
          >
            <Printer className="ic" size={18} />
            Chop etish ({selectedCount} dona)
          </button>
        </>
      }
    >
      <div className="control">
        <Search className="ic" size={16} />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nomi yoki shtrix kod bo‘yicha qidirish…"
          aria-label="Mahsulot qidirish"
        />
      </div>
      <div className="om-bc-list">
        {filteredProducts.map((p) => {
          const isOn = Boolean(selected[p.id]);
          return (
            <div key={p.id} className={`om-bc-row${isOn ? " is-on" : ""}`}>
              <label className="check om-bc-check">
                <input type="checkbox" checked={isOn} onChange={() => toggle(p.id)} />
                <span className="box">
                  <Check className="ic" size={14} strokeWidth={3} />
                </span>
                <span className="om-bc-meta">
                  <b>{p.name}</b>
                  <span className="mono">{p.sku}</span>
                </span>
              </label>
              {isOn ? (
                <span className="control control-sm om-bc-qty">
                  <input
                    type="number"
                    min={1}
                    value={selected[p.id]}
                    onChange={(event) => setQty(p.id, Number(event.target.value))}
                    aria-label={`${p.name} etiketka soni`}
                  />
                  <span className="addon">dona</span>
                </span>
              ) : null}
            </div>
          );
        })}
        {filteredProducts.length === 0 && (
          <div className="empty om-bc-empty">
            <span className="em-ic">
              <PackageSearch className="ic" size={24} />
            </span>
            <h4>Mahsulot topilmadi</h4>
          </div>
        )}
      </div>
    </RfModal>
  );
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
