"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PeriodSelect } from "./PeriodSelect";
import { formatSom } from "@/lib/format";
import type { PeriodValue } from "@/lib/period";
import { periodToParams } from "@/lib/period";

type ItemRow = { name: string; qty: number; amount: number };

type SummaryData = {
  totalSales: number;
  costTotal: number;
  totalProfit: number;
  items: ItemRow[];
};

export function SoldItemsModal({
  open,
  onClose,
  initialPeriod,
}: {
  open: boolean;
  onClose: () => void;
  initialPeriod: PeriodValue;
}) {
  const [period, setPeriod] = useState<PeriodValue>(initialPeriod);
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);

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
    <Modal open={open} onClose={onClose} title="Sotilgan mahsulotlar">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-muted">
          Bekor qilingan va qaytarilgan savdolar ko&apos;rsatkichlarga kirmaydi.
        </p>
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
                <p className="text-xs text-muted">Yalpi foyda</p>
                <p className="text-sm font-bold text-accent">{formatSom(data.totalProfit)}</p>
              </div>
            </div>

            <div className="flex max-h-72 flex-col overflow-y-auto">
              {data.items.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">Bu davrda sotuv yo&apos;q</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted">
                      <th className="pb-2 font-medium">Mahsulot</th>
                      <th className="pb-2 text-right font-medium">Miqdor</th>
                      <th className="pb-2 text-right font-medium">Savdo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, idx) => (
                      <tr key={idx} className="border-t border-border/60">
                        <td className="py-2 pr-2">{item.name}</td>
                        <td className="whitespace-nowrap py-2 text-right text-muted">{item.qty} dona</td>
                        <td className="whitespace-nowrap py-2 text-right font-medium">{formatSom(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
