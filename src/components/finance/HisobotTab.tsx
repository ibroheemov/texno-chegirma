"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, Package, Eye, ArrowDownLeft, ArrowUpRight, Ban } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatSom, formatDateTime } from "@/lib/format";
import { resolveMethodLabel } from "@/lib/receipt";
import { cn } from "@/lib/cn";
import { SellerSoldItemsModal } from "./SellerSoldItemsModal";

type Period = "today" | "week" | "month" | "all";

type Report = {
  revenue: number;
  cogs: number;
  expense: number;
  netProfit: number;
  paymentBreakdown: { method: string; amount: number; pct: number }[];
  expenseByCategory: { category: string; amount: number }[];
  dailyBreakdown: { date: string; revenue: number; expense: number; netProfit: number }[];
};

type ExpenseEntry = { id: string; amount: number; category: string | null; note: string | null; createdAt: string };

type LedgerEntry = {
  id: string;
  direction: "IN" | "OUT";
  amount: number;
  method: string;
  note: string | null;
  createdAt: string;
  sale: {
    canceled: boolean;
    customer: { name: string } | null;
    customAmounts: Record<string, number> | null;
  } | null;
};

function LedgerTransactionsSection({ period }: { period: Period }) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loadedPeriod, setLoadedPeriod] = useState<Period | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/ledger?period=${period}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setEntries(data.entries ?? []);
        setLoadedPeriod(period);
      });
    return () => {
      active = false;
    };
  }, [period]);
  const loading = loadedPeriod !== period;

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold">Kirim / Sotuv / Chiqim harakatlari</h3>
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-accent" size={24} />
        </div>
      ) : entries.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Harakatlar topilmadi</p>
      ) : (
        <div className="mt-3 flex flex-col divide-y divide-border/60">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={cn("flex items-center gap-3 py-2.5", entry.sale?.canceled && "opacity-50")}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full",
                  entry.direction === "IN" ? "bg-accent-soft text-accent" : "bg-danger-soft text-danger"
                )}
              >
                {entry.direction === "IN" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {entry.sale
                    ? `Sotuv${entry.sale.customer ? ` · ${entry.sale.customer.name}` : ""}`
                    : entry.direction === "OUT"
                      ? "Chiqim"
                      : "Kirim"}
                </p>
                {entry.note && <p className="truncate text-xs text-muted">{entry.note}</p>}
                <p className="text-xs text-muted">
                  {formatDateTime(entry.createdAt)} ·{" "}
                  {entry.method === "CASH"
                    ? "naqd"
                    : entry.method === "CARD"
                      ? "karta"
                      : resolveMethodLabel(entry.method, entry.sale?.customAmounts).toLowerCase()}
                </p>
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-sm font-semibold",
                  entry.direction === "IN" ? "text-accent" : "text-danger"
                )}
              >
                {entry.direction === "IN" ? "+" : "-"}
                {formatSom(entry.amount)}
              </span>
              {entry.sale?.canceled && (
                <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-danger-soft px-2 py-1 text-xs text-danger">
                  <Ban size={11} /> Bekor qilingan
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ExpensesListSection({ period }: { period: Period }) {
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/finance/breakdown?direction=OUT&period=${period}`)
      .then((res) => res.json())
      .then((json) => setEntries(json.entries ?? []))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold">Xarajatlar ro&apos;yxati</h3>
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-accent" size={24} />
        </div>
      ) : entries.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Xarajat topilmadi</p>
      ) : (
        <div className="mt-3 flex flex-col divide-y divide-border/60">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium">{e.note || e.category || "Qo'lda kiritilgan"}</p>
                <p className="text-xs text-muted">
                  {e.category && <>{e.category} · </>}
                  {formatDateTime(e.createdAt)}
                </p>
              </div>
              <span className="text-sm font-semibold text-danger">-{formatSom(e.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

type SellerRow = { id: string | null; name: string; receipts: number; revenue: number; itemsQty: number };

function SellerSalesSection({ period }: { period: Period }) {
  const [rows, setRows] = useState<SellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailFor, setDetailFor] = useState<SellerRow | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/finance/sellers?period=${period}`)
      .then((res) => res.json())
      .then((json) => setRows(json.rows ?? []))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold">Sotuvchilar bo&apos;yicha sotuvlar</h3>
      <div className="mt-3 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-accent" size={24} />
          </div>
        ) : (
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted">
                <th className="py-2 pr-3 font-medium">Sotuvchi</th>
                <th className="py-2 pr-3 font-medium">Cheklar</th>
                <th className="py-2 pr-3 font-medium">Sotilgan dona</th>
                <th className="py-2 pr-3 font-medium">Sotuv summasi</th>
                <th className="py-2 pr-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id ?? "unassigned"} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{r.name}</td>
                  <td className="py-2.5 pr-3">{r.receipts}</td>
                  <td className="py-2.5 pr-3">{r.itemsQty}</td>
                  <td className="py-2.5 pr-3 font-semibold">{formatSom(r.revenue)}</td>
                  <td className="py-2.5 pr-3 text-right">
                    <button
                      onClick={() => setDetailFor(r)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted text-foreground hover:text-accent"
                      aria-label="Batafsil"
                      title="Sotilgan mahsulotlarni ko'rish"
                    >
                      <Eye size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">
                    Ma&apos;lumot yo&apos;q
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {detailFor && (
        <SellerSoldItemsModal
          open={!!detailFor}
          onClose={() => setDetailFor(null)}
          sellerName={detailFor.name}
          employeeId={detailFor.id}
          period={period}
        />
      )}
    </Card>
  );
}

export function HisobotTab() {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/finance/report?period=${period}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["today", "Bugun"],
              ["week", "Hafta"],
              ["month", "Oy"],
              ["all", "Barchasi"],
            ] as [Period, string][]
          ).map(([key, label]) => (
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
      </Card>

      {loading || !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-accent" size={24} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                <TrendingUp size={14} className="text-accent" /> Tushum
              </div>
              <p className="mt-1 text-xl font-bold">{formatSom(data.revenue)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                <Package size={14} className="text-warning" /> Tannarx
              </div>
              <p className="mt-1 text-xl font-bold">{formatSom(data.cogs)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                <TrendingDown size={14} className="text-danger" /> Xarajat
              </div>
              <p className="mt-1 text-xl font-bold">{formatSom(data.expense)}</p>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="text-sm font-semibold">Sof foyda hisobi</h3>
            <div className="mt-3 flex flex-col divide-y divide-border/60 text-sm">
              <div className="flex items-center justify-between py-2">
                <span className="text-muted">Tushum</span>
                <span className="font-semibold text-accent">+{formatSom(data.revenue)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted">Sotilgan tovar tannarxi</span>
                <span className="font-semibold text-danger">-{formatSom(data.cogs)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted">Xarajat</span>
                <span className="font-semibold text-danger">-{formatSom(data.expense)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 text-base">
                <span className="font-semibold">Sof foyda</span>
                <span className={cn("font-bold", data.netProfit >= 0 ? "text-accent" : "text-danger")}>
                  {formatSom(data.netProfit)}
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted">
              Ta&apos;minotchiga tovar xaridi uchun to&apos;lov pul hisobidan ayriladi, lekin xarajat sifatida
              qayta ayirilmaydi — tannarx sotuv orqali hisoblanadi.
            </p>
          </Card>

          <LedgerTransactionsSection period={period} />
          <ExpensesListSection period={period} />
          <SellerSalesSection period={period} />

          {data.paymentBreakdown.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold">To&apos;lov usullari</h3>
              <div className="mt-3 flex flex-col gap-2">
                {data.paymentBreakdown.map((p) => (
                  <div key={p.method} className="flex items-center gap-3 text-sm">
                    <span className="w-20 shrink-0 truncate text-muted" title={p.method}>
                      {p.method}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${p.pct}%` }} />
                    </div>
                    <span className="w-12 shrink-0 text-right text-xs text-muted">{p.pct}%</span>
                    <span className="shrink-0 whitespace-nowrap text-right font-semibold">
                      {formatSom(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

        </>
      )}
    </div>
  );
}
