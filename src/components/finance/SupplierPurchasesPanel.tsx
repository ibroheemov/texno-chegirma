"use client";

import { Fragment, useEffect, useState } from "react";
import { Loader2, Package, History } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatSom, formatDate, formatDateTime, daysBetween } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PaySupplierModal, type PayTarget } from "./PaySupplierModal";

type PaymentEntry = {
  id: string;
  amount: number;
  method: "CASH" | "CARD";
  paidUsd: number | null;
  createdAt: string;
};

type Period = "today" | "week" | "month" | "all";

type ProductEntry = {
  productName: string;
  qty: number;
  totalCost: number;
  usdAmount: number;
  cash: number;
  card: number;
  credit: number;
  debt: number;
  debtUsd: number;
};
type DateGroup = {
  date: string;
  products: ProductEntry[];
  totalCost: number;
  debt: number;
  debtUsd: number;
  receiptIds: string[];
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
  const [groups, setGroups] = useState<DateGroup[] | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);
  const [openHistory, setOpenHistory] = useState<string | null>(null);
  const [historyCache, setHistoryCache] = useState<Record<string, PaymentEntry[]>>({});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/suppliers/${supplierId}/receipts?period=${period}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setGroups(json.groups ?? []);
        setTotals(json.totals ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    setOpenHistory(null);
    setHistoryCache({});
    return () => {
      cancelled = true;
    };
  }, [supplierId, period, reloadKey]);

  async function toggleHistory(key: string, receiptIds: string[]) {
    if (openHistory === key) {
      setOpenHistory(null);
      return;
    }
    setOpenHistory(key);
    if (!historyCache[key]) {
      setHistoryLoading(key);
      const res = await fetch(`/api/suppliers/${supplierId}/payments?receiptIds=${receiptIds.join(",")}`);
      const data = await res.json();
      setHistoryCache((prev) => ({ ...prev, [key]: data.payments ?? [] }));
      setHistoryLoading(null);
    }
  }

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
            {!groups || groups.length === 0 ? (
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
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group, gIdx) => {
                    const date = new Date(group.date);
                    const historyKey = group.receiptIds.join(",") || `g-${gIdx}`;
                    const historyOpen = openHistory === historyKey;
                    const history = historyCache[historyKey];
                    return (
                      <Fragment key={gIdx}>
                        <tr className="border-t border-border bg-surface-muted">
                          <td colSpan={3} className="py-2.5 pr-2">
                            <span className="text-sm font-bold text-muted">{formatDate(date)}</span>
                            <span className="ml-1.5 text-xs text-muted">{daysAgoLabel(date)}</span>
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-2 text-right">
                            {group.debt > 0 || group.debtUsd > 0 ? (
                              <span className="text-xs font-semibold text-danger">
                                <span className="font-normal text-muted">Qarz: </span>
                                {group.debtUsd > 0 ? formatUsdAmount(group.debtUsd) : formatSom(group.debt)}
                                {group.debtUsd > 0 && (
                                  <span className="block font-normal text-muted">{formatSom(group.debt)}</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-xs text-muted">To&apos;liq to&apos;langan</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {group.receiptIds.length > 0 && (
                                <button
                                  onClick={() => toggleHistory(historyKey, group.receiptIds)}
                                  className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-lg bg-background text-muted hover:text-accent",
                                    historyOpen && "text-accent"
                                  )}
                                  title="To'lov tarixi"
                                  aria-label="To'lov tarixi"
                                >
                                  <History size={13} />
                                </button>
                              )}
                              {(group.debt > 0 || group.debtUsd > 0) && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setPayTarget({
                                      id: supplierId,
                                      name: supplierName,
                                      debt: group.debt,
                                      receiptIds: group.receiptIds,
                                      title: `${formatDate(date)} — qarz to'lash`,
                                    })
                                  }
                                >
                                  To&apos;lash
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {historyOpen && (
                          <tr className="border-t border-border/60 bg-surface-muted/40">
                            <td colSpan={5} className="py-2 pr-2">
                              {historyLoading === historyKey ? (
                                <div className="flex items-center gap-2 py-1 text-xs text-muted">
                                  <Loader2 size={12} className="animate-spin" /> Yuklanmoqda...
                                </div>
                              ) : !history || history.length === 0 ? (
                                <p className="py-1 text-xs text-muted">To&apos;lov tarixi yo&apos;q</p>
                              ) : (
                                <div className="flex flex-col gap-1.5">
                                  {history.map((p) => (
                                    <div key={p.id} className="flex items-center justify-between text-xs">
                                      <span className="text-muted">
                                        {formatDateTime(p.createdAt)} · {p.method === "CARD" ? "karta" : "naqd"}
                                      </span>
                                      <span className="font-semibold text-accent">
                                        {p.paidUsd ? formatUsdAmount(p.paidUsd) : formatSom(p.amount)}
                                        {p.paidUsd ? (
                                          <span className="ml-1 font-normal text-muted">
                                            ({formatSom(p.amount)})
                                          </span>
                                        ) : null}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                        {group.products.map((item, idx) => (
                          <tr key={`${gIdx}-${idx}`} className="border-t border-border/60">
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
                          </tr>
                        ))}
                      </Fragment>
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
