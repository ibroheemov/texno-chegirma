"use client";

import { useEffect, useState } from "react";
import { Loader2, ShoppingBag } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { formatSom, formatDateTime } from "@/lib/format";
import { resolveMethodLabel } from "@/lib/receipt";

type SaleRow = {
  id: string;
  createdAt: string;
  paymentMethod: string;
  customAmounts: Record<string, number> | null;
  total: number;
  canceled: boolean;
  items: { name: string; qty: number; price: number }[];
};

type ResponseData = {
  sales: SaleRow[];
  totals: { ordersCount: number; totalSpent: number };
};

export function CustomerPurchasesModal({
  open,
  onClose,
  customerId,
  customerName,
}: {
  open: boolean;
  onClose: () => void;
  customerId: string | null;
  customerName: string;
}) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !customerId) return;
    let cancelled = false;
    setData(null);
    setLoading(true);
    fetch(`/api/customers/${customerId}/sales`)
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
  }, [open, customerId]);

  return (
    <Modal open={open} onClose={onClose} title={`Xaridlar tarixi — ${customerName}`}>
      <div className="flex flex-col gap-4">
        {loading && !data ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin text-accent" size={24} />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-muted p-3 text-center">
              <div>
                <p className="text-xs text-muted">Buyurtmalar</p>
                <p className="text-sm font-bold">{data.totals.ordersCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Jami xaridlar</p>
                <p className="text-sm font-bold text-accent">{formatSom(data.totals.totalSpent)}</p>
              </div>
            </div>

            <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
              {data.sales.length === 0 ? (
                <p className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted">
                  <ShoppingBag size={20} className="text-muted" />
                  Bu mijoz hali xarid qilmagan
                </p>
              ) : (
                data.sales.map((s) => (
                  <div key={s.id} className="rounded-lg border border-border/60 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span>{formatDateTime(new Date(s.createdAt))}</span>
                        <span>·</span>
                        <span>{resolveMethodLabel(s.paymentMethod, s.customAmounts)}</span>
                        {s.canceled && <Badge tone="danger">Bekor qilingan</Badge>}
                      </div>
                      <span className={`text-sm font-semibold ${s.canceled ? "text-muted line-through" : ""}`}>
                        {formatSom(s.total)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-col gap-0.5">
                      {s.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs text-muted">
                          <span className="truncate">
                            {item.name} <span className="text-muted/70">× {item.qty}</span>
                          </span>
                          <span className="whitespace-nowrap pl-2">{formatSom(item.price * item.qty)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
