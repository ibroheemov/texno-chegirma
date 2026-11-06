"use client";

import { useState } from "react";
import type { Category, Product } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatSom } from "@/lib/format";
import { Printer } from "lucide-react";

type ProductRow = Product & { category: Category | null };

export function BarcodeLabelsModal({
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
            <div class="price">${escapeHtml(formatSom(p.barcodePrice ?? p.price))}</div>
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
            .price { font-size: 13px; font-weight: 700; margin-top: 2px; }
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

  return (
    <Modal open={open} onClose={onClose} title="Shtrix kod etiketkalari">
      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted">Chop etish uchun mahsulotlarni va dona sonini tanlang</p>
        <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2.5 rounded-lg border border-border/60 px-3 py-2"
            >
              <input
                type="checkbox"
                checked={Boolean(selected[p.id])}
                onChange={() => toggle(p.id)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted">{p.sku}</p>
              </div>
              {selected[p.id] ? (
                <input
                  type="number"
                  min={1}
                  value={selected[p.id]}
                  onChange={(e) => setQty(p.id, Number(e.target.value))}
                  className="h-8 w-16 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-accent"
                />
              ) : null}
            </div>
          ))}
          {products.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">Mahsulot topilmadi</p>
          )}
        </div>
        <Button onClick={print} disabled={selectedCount === 0 || printing} className="mt-1">
          <Printer size={16} />
          Chop etish ({selectedCount} dona)
        </Button>
      </div>
    </Modal>
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
