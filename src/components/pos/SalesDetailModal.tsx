"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { PeriodSelect } from "./PeriodSelect";
import { formatSom, formatDateTime } from "@/lib/format";
import type { PeriodValue } from "@/lib/period";
import { periodToParams } from "@/lib/period";
import { Loader2, Printer } from "lucide-react";
import { METHOD_LABEL, type ReceiptSettings, type ReceiptSale } from "@/lib/receipt";
import { ReceiptModal } from "./ReceiptModal";

type SaleRow = {
  id: string;
  createdAt: string;
  paymentMethod: string;
  total: number;
  customerName: string | null;
  items: { name: string; qty: number; price: number }[];
};

type SummaryData = {
  totalSales: number;
  costTotal: number;
  totalProfit: number;
  receipts: number;
  itemsSoldQty: number;
  distinctProducts: number;
  payments: { cash: number; card: number; credit: number };
  sales: SaleRow[];
};

export function SalesDetailModal({
  open,
  onClose,
  initialPeriod,
  title,
  receipt,
}: {
  open: boolean;
  onClose: () => void;
  initialPeriod: PeriodValue;
  title: string;
  receipt?: ReceiptSettings;
}) {
  const [period, setPeriod] = useState<PeriodValue>(initialPeriod);
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewSale, setPreviewSale] = useState<ReceiptSale | null>(null);

  useEffect(() => {
    if (open) setPeriod(initialPeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/sales/summary?${periodToParams(period).toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, period]);

  return (
    <>
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <PeriodSelect value={period} onChange={setPeriod} />

        {loading && !data ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin text-accent" size={24} />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-muted p-3 text-center">
              <div>
                <p className="text-xs text-muted">Jami savdo</p>
                <p className="text-sm font-bold">{formatSom(data.totalSales)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Tannarx</p>
                <p className="text-sm font-bold">{formatSom(data.costTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Daromad</p>
                <p className="text-sm font-bold text-accent">{formatSom(data.totalProfit)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-surface-muted px-2.5 py-1">
                Naqd: <strong>{formatSom(data.payments.cash)}</strong>
              </span>
              <span className="rounded-full bg-surface-muted px-2.5 py-1">
                Karta: <strong>{formatSom(data.payments.card)}</strong>
              </span>
              <span className="rounded-full bg-surface-muted px-2.5 py-1">
                Nasiya: <strong>{formatSom(data.payments.credit)}</strong>
              </span>
              <span className="rounded-full bg-surface-muted px-2.5 py-1">
                {data.receipts} chek · {data.itemsSoldQty} dona
              </span>
            </div>

            <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
              {data.sales.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">Bu davrda savdo yo&apos;q</p>
              ) : (
                data.sales.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="text-xs text-muted">{formatDateTime(new Date(s.createdAt))}</p>
                      <p className="text-xs text-muted">{METHOD_LABEL[s.paymentMethod] ?? s.paymentMethod}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{formatSom(s.total)}</span>
                      {receipt && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewSale({
                              items: s.items,
                              total: s.total,
                              method: s.paymentMethod,
                              customerName: s.customerName,
                              createdAt: s.createdAt,
                            })
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-accent"
                          aria-label="Chekni ko'rish"
                          title="Chekni ko'rish"
                        >
                          <Printer size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}
      </div>
    </Modal>
    {receipt && (
      <ReceiptModal
        open={!!previewSale}
        onClose={() => setPreviewSale(null)}
        sale={previewSale}
        settings={receipt}
      />
    )}
    </>
  );
}
