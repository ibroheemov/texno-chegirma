"use client";

import { useEffect, useState } from "react";
import { Loader2, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PeriodSelect } from "@/components/pos/PeriodSelect";
import type { PeriodValue } from "@/lib/period";
import { periodToParams, toMonthInputValue } from "@/lib/period";

type ItemRow = { name: string; qty: number; amount: number };

const TOP_COUNT = 5;

export function TopSellingProducts() {
  const [period, setPeriod] = useState<PeriodValue>({ kind: "month", month: toMonthInputValue(new Date()) });
  const [items, setItems] = useState<ItemRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/sales/summary?${periodToParams(period).toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const sorted = [...((json.items ?? []) as ItemRow[])].sort((a, b) => b.qty - a.qty).slice(0, TOP_COUNT);
        setItems(sorted);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const maxQty = items && items.length ? items[0].qty : 0;

  return (
    <Card>
      <CardHeader className="flex-wrap gap-y-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-accent">
            <Flame size={16} />
          </span>
          <CardTitle>Eng ko&apos;p sotilgan mahsulotlar</CardTitle>
        </div>
        <PeriodSelect value={period} onChange={setPeriod} />
      </CardHeader>
      <CardContent>
        {loading && !items ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-accent" size={20} />
          </div>
        ) : items && items.length ? (
          <div className="flex flex-col gap-3">
            {items.map((item, idx) => (
              <div key={`${item.name}-${idx}`} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-muted">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="whitespace-nowrap text-sm font-semibold text-accent">{item.qty} dona</p>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${maxQty ? Math.max(6, (item.qty / maxQty) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted">Bu davrda sotuv yo&apos;q</p>
        )}
      </CardContent>
    </Card>
  );
}
