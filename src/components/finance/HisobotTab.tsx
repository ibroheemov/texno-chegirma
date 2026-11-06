"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, Package, Printer } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatSom } from "@/lib/format";
import { cn } from "@/lib/cn";

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

  function print() {
    window.print();
  }

  const maxDaily = data ? Math.max(1, ...data.dailyBreakdown.map((d) => Math.max(d.revenue, d.expense))) : 1;

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

          {data.paymentBreakdown.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold">To&apos;lov usullari</h3>
              <div className="mt-3 flex flex-col gap-2">
                {data.paymentBreakdown.map((p) => (
                  <div key={p.method} className="flex items-center gap-3 text-sm">
                    <span className="w-16 shrink-0 text-muted">{p.method}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${p.pct}%` }} />
                    </div>
                    <span className="w-12 shrink-0 text-right text-xs text-muted">{p.pct}%</span>
                    <span className="w-28 shrink-0 text-right font-semibold">{formatSom(p.amount)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {data.dailyBreakdown.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold">Tushum vs Xarajat</h3>
              <div className="mt-3 flex h-32 items-end gap-1 overflow-x-auto">
                {data.dailyBreakdown.map((d) => (
                  <div key={d.date} className="flex flex-1 min-w-[6px] flex-col items-center justify-end gap-0.5">
                    <div
                      className="w-full rounded-t bg-accent"
                      style={{ height: `${Math.max(2, (d.revenue / maxDaily) * 100)}%` }}
                      title={`${d.date}: +${formatSom(d.revenue)}`}
                    />
                    {d.expense > 0 && (
                      <div
                        className="w-full rounded-b bg-danger"
                        style={{ height: `${Math.max(2, (d.expense / maxDaily) * 60)}%` }}
                        title={`${d.date}: -${formatSom(d.expense)}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Kunlik hisobot</h3>
              <Button size="sm" variant="secondary" onClick={print}>
                <Printer size={14} /> Chop etish
              </Button>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted">
                    <th className="py-2 pr-3 font-medium">Sana</th>
                    <th className="py-2 pr-3 font-medium">Tushum</th>
                    <th className="py-2 pr-3 font-medium">Xarajat</th>
                    <th className="py-2 pr-3 font-medium">Sof foyda</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailyBreakdown.map((d) => (
                    <tr key={d.date} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3">{d.date}</td>
                      <td className="py-2 pr-3 text-accent">{formatSom(d.revenue)}</td>
                      <td className="py-2 pr-3 text-danger">{formatSom(d.expense)}</td>
                      <td className="py-2 pr-3 font-semibold">{formatSom(d.netProfit)}</td>
                    </tr>
                  ))}
                  {data.dailyBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted">
                        Ma&apos;lumot yo&apos;q
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
