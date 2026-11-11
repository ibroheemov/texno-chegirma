"use client";

import { useEffect, useState } from "react";
import { Loader2, Receipt, Wallet, TrendingUp, Eye } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatSom } from "@/lib/format";
import { cn } from "@/lib/cn";
import { SellerSoldItemsModal } from "./SellerSoldItemsModal";

type Period = "today" | "week" | "month" | "all";

type Row = { id: string | null; name: string; receipts: number; revenue: number; profit: number; itemsQty: number };

export function SotuvchilarTab() {
  const [period, setPeriod] = useState<Period>("month");
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ receipts: 0, revenue: 0, profit: 0 });
  const [loading, setLoading] = useState(true);
  const [detailFor, setDetailFor] = useState<Row | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/finance/sellers?period=${period}`);
    const data = await res.json();
    setRows(data.rows ?? []);
    setTotals(data.totals ?? { receipts: 0, revenue: 0, profit: 0 });
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Receipt size={14} className="text-accent" /> Cheklar soni
          </div>
          <p className="mt-1 text-xl font-bold">{totals.receipts}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Wallet size={14} className="text-accent" /> Jami sotuv
          </div>
          <p className="mt-1 text-xl font-bold">{formatSom(totals.revenue)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <TrendingUp size={14} className="text-accent" /> Jami foyda
          </div>
          <p className="mt-1 text-xl font-bold">{formatSom(totals.profit)}</p>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-semibold">Sotuvchilar bo&apos;yicha sotuvlar</h3>
        <div className="mt-3 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16">
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
                  <th className="py-2 pr-3 font-medium">Foyda</th>
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
                    <td className="py-2.5 pr-3 text-accent">{formatSom(r.profit)}</td>
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
                    <td colSpan={6} className="py-8 text-center text-muted">
                      Ma&apos;lumot yo&apos;q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {detailFor && (
        <SellerSoldItemsModal
          open={!!detailFor}
          onClose={() => setDetailFor(null)}
          sellerName={detailFor.name}
          employeeId={detailFor.id}
          period={period}
        />
      )}
    </div>
  );
}
