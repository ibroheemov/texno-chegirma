"use client";

import { useEffect, useState } from "react";
import { Receipt, TrendingUp, Wallet, Package } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { PeriodSelect } from "./PeriodSelect";
import { SalesDetailModal } from "./SalesDetailModal";
import { InventoryStatusModal } from "./InventoryStatusModal";
import { formatSom } from "@/lib/format";
import { defaultPeriod, periodToParams, periodLabel, type PeriodValue } from "@/lib/period";

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
  totalProducts,
  available,
  low,
  out,
}: {
  initialSummary: CardSummary;
  prevSummary: { totalSales: number; totalProfit: number };
  totalProducts: number;
  available: number;
  low: number;
  out: number;
}) {
  const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());
  const [summary, setSummary] = useState<CardSummary>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<null | "sales" | "inventory">(null);

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Savdo summasi"
          value={formatSom(summary.totalSales)}
          icon={Wallet}
          onClick={() => setModal("sales")}
          delta={showDelta ? delta(summary.totalSales, prevSummary.totalSales) : undefined}
          deltaLabel={showDelta ? "kechagiga nisbatan" : undefined}
          deltaTone={summary.totalSales >= prevSummary.totalSales ? "accent" : "danger"}
        />
        <StatCard
          label="Daromad"
          value={formatSom(summary.totalProfit)}
          icon={TrendingUp}
          onClick={() => setModal("sales")}
          delta={showDelta ? delta(summary.totalProfit, prevSummary.totalProfit) : undefined}
          deltaLabel={showDelta ? "kechagiga nisbatan" : undefined}
          deltaTone={summary.totalProfit >= prevSummary.totalProfit ? "accent" : "danger"}
        />
        <StatCard
          label="Cheklar"
          value={String(summary.receipts)}
          icon={Receipt}
          onClick={() => setModal("sales")}
          delta={`${summary.itemsSold} dona`}
          deltaLabel={`${summary.distinctProducts} xil mahsulot`}
        />
        <StatCard
          label="Jami tovarlar"
          value={String(totalProducts)}
          icon={Package}
          onClick={() => setModal("inventory")}
          delta="Ombor"
          deltaLabel="joriy holat"
        />
      </div>

      <SalesDetailModal
        open={modal === "sales"}
        onClose={() => setModal(null)}
        initialPeriod={period}
        title="Savdo tafsilotlari"
      />
      <InventoryStatusModal
        open={modal === "inventory"}
        onClose={() => setModal(null)}
        total={totalProducts}
        available={available}
        low={low}
        out={out}
      />
    </div>
  );
}
