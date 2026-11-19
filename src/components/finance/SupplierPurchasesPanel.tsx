"use client";

import { useEffect, useState } from "react";
import { Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatSom, formatDate, daysBetween } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PaySupplierModal, type PayTarget } from "./PaySupplierModal";

type Period = "today" | "week" | "month" | "all";

type ItemRow = {
  productName: string;
  qty: number;
  totalCost: number;
  usdAmount: number;
  receiptsCount: number;
  cash: number;
  card: number;
  credit: number;
  debt: number;
  debtUsd: number;
  receiptIds: string[];
  lastPurchasedAt: string;
};
type Totals = {
  totalUnits: number;
  totalCost: number;
  totalUsd: number;
  receiptsCount: number;
  distinctProducts: number;
  cash: number;
  card: number;
  credit: number;
};

function daysAgoLabel(date: Date) {
  const days = daysBetween(new Date(), date);
  if (days <= 0) return "Bugun";
  if (days === 1) return "1 kun oldin";
  return `${days} kun oldin`;
}

function formatUsdAmount(amount: number) {
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

const PERIOD_OPTIONS: [Period, string][] = [
  ["today", "Bugun"],
  ["week", "Hafta"],
  ["month", "Oy"],
  ["all", "Barchasi"],
];

export function SupplierPurchasesPanel({
  supplierId,
  supplierName,
  storeUsdRate,
  onPaid,
}: {
  supplierId: string;
  supplierName: string;
  storeUsdRate?: number | null;
  onPaid?: () => void;
}) {
  const [period, setPeriod] = useState<Period>("month");
  const [items, setItems] = useState<ItemRow[] | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/suppliers/${supplierId}/receipts?period=${period}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setItems(json.items ?? []);
        setTotals(json.totals ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supplierId, period, reloadKey]);

  return (
    <div className="flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={cn(
              "rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted",
              period === key && "border-accent bg-accent-soft text-accent"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && !totals ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="animate-spin text-accent" size={24} />
        </div>
      ) : totals ? (
        <>
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-muted p-3 text-center">
            <div>
              <p className="text-xs text-muted">Jami summa</p>
              <p className="text-sm font-bold">
                {formatSom(totals.totalCost)}
                {totals.totalUsd > 0 && (
                  <span className="block text-xs font-semibold text-muted">
                    {formatUsdAmount(totals.totalUsd)}
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Jami birlik</p>
              <p className="text-sm font-bold">{totals.totalUnits} dona</p>
            </div>
            <div>
              <p className="text-xs text-muted">Tovar turi</p>
              <p className="text-sm font-bold text-accent">{totals.distinctProducts}</p>
            </div>
          </div>

          <div className="flex max-h-80 flex-col overflow-auto">
            {!items || items.length === 0 ? (
              <p className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted">
                <Package size={20} className="text-muted" />
                Bu davrda tovar kirimi yo&apos;q
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="whitespace-nowrap pb-2 pr-2 font-medium">Mahsulot</th>
                    <th className="whitespace-nowrap pb-2 pr-2 font-medium">To&apos;lov</th>
                    <th className="whitespace-nowrap pb-2 pr-2 text-right font-medium">Miqdor</th>
                    <th className="whitespace-nowrap pb-2 pr-2 text-right font-medium">Summa</th>
                    <th className="whitespace-nowrap pb-2 pr-2 text-right font-medium">Qarz</th>
                    <th className="whitespace-nowrap pb-2 pr-2 font-medium">Sana</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const lastPurchasedAt = new Date(item.lastPurchasedAt);
                    return (
                      <tr key={idx} className="border-t border-border/60">
                        <td className="whitespace-nowrap py-2 pr-2">{item.productName}</td>
                        <td className="whitespace-nowrap py-2 pr-2">
                          <div className="flex flex-nowrap gap-1">
                            {(() => {
                              const mixed = [item.cash, item.card, item.credit].filter((v) => v > 0).length > 1;
                              return (
                                <>
                                  {item.cash > 0 && (
                                    <Badge tone="accent" className="whitespace-nowrap">
                                      Naqd{mixed ? ` · ${formatSom(item.cash)}` : ""}
                                    </Badge>
                                  )}
                                  {item.card > 0 && (
                                    <Badge tone="info" className="whitespace-nowrap">
                                      Karta{mixed ? ` · ${formatSom(item.card)}` : ""}
                                    </Badge>
                                  )}
                                  {item.credit > 0 && (
                                    <Badge tone="danger" className="whitespace-nowrap">
                                      Nasiya{mixed ? ` · ${formatSom(item.credit)}` : ""}
                                    </Badge>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="whitespace-nowrap py-2 pr-2 text-right text-muted">{item.qty} dona</td>
                        <td className="whitespace-nowrap py-2 pr-2 text-right font-medium">
                          {formatSom(item.totalCost)}
                          {item.usdAmount > 0 && (
                            <span className="ml-1 text-xs font-normal text-muted">
                              ({formatUsdAmount(item.usdAmount)})
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-2 text-right">
                          {item.debt > 0 || item.debtUsd > 0 ? (
                            <span className="text-xs font-semibold text-danger">
                              {item.debtUsd > 0 ? formatUsdAmount(item.debtUsd) : formatSom(item.debt)}
                              {item.debtUsd > 0 && (
                                <span className="block font-normal text-muted">{formatSom(item.debt)}</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-2 text-xs text-muted">
                          {formatDate(lastPurchasedAt)}
                          <span className="block">{daysAgoLabel(lastPurchasedAt)}</span>
                        </td>
                        <td className="whitespace-nowrap py-2 text-right">
                          {(item.debt > 0 || item.debtUsd > 0) && (
                            <Button
                              size="sm"
                              onClick={() =>
                                setPayTarget({
                                  id: supplierId,
                                  name: supplierName,
                                  debt: item.debt,
                                  receiptIds: item.receiptIds,
                                  title: `${item.productName} — qarz to'lash`,
                                })
                              }
                            >
                              To&apos;lash
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : null}

      <PaySupplierModal
        target={payTarget}
        onClose={() => setPayTarget(null)}
        onPaid={() => {
          setReloadKey((k) => k + 1);
          onPaid?.();
        }}
        storeUsdRate={storeUsdRate}
      />
    </div>
  );
}
