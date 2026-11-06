"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, Clock, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { formatSom } from "@/lib/format";
import { cn } from "@/lib/cn";

type Period = "today" | "week" | "month";

type Row = { id: string; name: string; hours: number; hourlyRate: number; pay: number };

export function OylikTab({ employees }: { employees: { id: string; name: string }[] }) {
  const [period, setPeriod] = useState<Period>("month");
  const [employeeId, setEmployeeId] = useState("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ employeeCount: 0, totalHours: 0, totalPay: 0 });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (employeeId !== "all") params.set("employeeId", employeeId);
    const res = await fetch(`/api/payroll?${params.toString()}`);
    const data = await res.json();
    setRows(data.rows ?? []);
    setTotals(data.totals ?? { employeeCount: 0, totalHours: 0, totalPay: 0 });
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, employeeId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Xodimlar" value={String(totals.employeeCount)} icon={Users} />
        <StatCard label="Jami soatlar" value={totals.totalHours.toFixed(1)} icon={Clock} />
        <StatCard label="Jami oylik (so'm)" value={formatSom(totals.totalPay)} icon={Wallet} />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["today", "Bugun"],
              ["week", "Hafta"],
              ["month", "Oy"],
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
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="ml-auto h-9 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-accent"
          >
            <option value="all">Barcha xodimlar</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-accent" size={24} />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">Ma&apos;lumot topilmadi</p>
          ) : (
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted">
                  <th className="py-2 pr-3 font-medium">Xodim</th>
                  <th className="py-2 pr-3 font-medium">Soatlar</th>
                  <th className="py-2 pr-3 font-medium">Stavka</th>
                  <th className="py-2 pr-3 font-medium">Oylik</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{r.name}</td>
                    <td className="py-2.5 pr-3">{r.hours.toFixed(1)}</td>
                    <td className="py-2.5 pr-3 text-muted">{formatSom(r.hourlyRate)}/soat</td>
                    <td className="py-2.5 pr-3 font-semibold">{formatSom(r.pay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
