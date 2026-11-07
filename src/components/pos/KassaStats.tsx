"use client";

import { useEffect, useState } from "react";
import { Receipt, Wallet, ShoppingBag } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { PeriodSelect } from "./PeriodSelect";
import { SalesDetailModal } from "./SalesDetailModal";
import { SoldItemsModal } from "./SoldItemsModal";
import { formatSom } from "@/lib/format";
import { defaultPeriod, periodToParams, periodLabel, type PeriodValue } from "@/lib/period";
import type { ReceiptSettings } from "@/lib/receipt";

type CardSummary = {
  totalSales: number;
  totalProfit: number;
  receipts: number;
  itemsSold: number;
  distinctProducts: number;
};

export function KassaStats({
  initialSummary,
  prevSummary,
  receipt,
}: {
  initialSummary: CardSummary;
  prevSummary: { totalSales: number; totalProfit: number };
  receipt?: ReceiptSettings;
}) {
  const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());
  const [summary, setSummary] = useState<CardSummary>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<null | "sales" | "items">(null);
  const [salesAmountVisible, setSalesAmountVisible] = useState(false);

  useEffect(() => {
    if (period.kind === "today") setSummary(initialSummary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSummary]);

  useEffect(() => {
    if (period.kind === "today") {
      setSummary(initialSummary);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/sales/summary?${periodToParams(period).toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setSummary({
          totalSales: json.totalSales,
          totalProfit: json.totalProfit,
          receipts: json.receipts,
          itemsSold: json.itemsSoldQty,
          distinctProducts: json.distinctProducts,
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  function delta(curr: number, prev: number) {
    if (prev === 0) return curr > 0 ? "Yangi" : "0%";
    const pct = ((curr - prev) / prev) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  }

  const showDelta = period.kind === "today";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">{loading ? "Yuklanmoqda..." : periodLabel(period)}</p>
        <PeriodSelect value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Savdo summasi"
          value={formatSom(summary.totalSales)}
          icon={Wallet}
          onClick={() => setModal("sales")}
          delta={showDelta ? delta(summary.totalSales, prevSummary.totalSales) : undefined}
          deltaLabel={showDelta ? "kechagiga nisbatan" : undefined}
          deltaTone={summary.totalSales >= prevSummary.totalSales ? "accent" : "danger"}
          masked={!salesAmountVisible}
          onToggleMask={() => setSalesAmountVisible((v) => !v)}
        />
        <StatCard
          label="Cheklar"
          value={String(summary.receipts)}
          icon={Receipt}
          onClick={() => setModal("sales")}
          delta="Amaldagi cheklar"
        />
        <StatCard
          label="Sotildi"
          value={`${summary.itemsSold} dona`}
          icon={ShoppingBag}
          onClick={() => setModal("items")}
          delta={`${summary.distinctProducts} xil mahsulot`}
        />
      </div>

      <SalesDetailModal
        open={modal === "sales"}
        onClose={() => setModal(null)}
        initialPeriod={period}
        title="Savdo tafsilotlari"
        receipt={receipt}
      />
      <SoldItemsModal open={modal === "items"} onClose={() => setModal(null)} initialPeriod={period} />
    </div>
  );
}
