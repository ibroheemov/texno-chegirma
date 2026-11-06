"use client";

import { useEffect, useState } from "react";
import { Loader2, Clock, CheckCircle2, ListChecks, MapPin, MapPinOff } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

type Period = "today" | "week" | "month";

type Record = {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  checkIn: string | null;
  checkOut: string | null;
  withinRange: boolean | null;
  employee: { id: string; name: string };
};

const STATUS_LABEL: Record<string, string> = { PRESENT: "Keldi", ABSENT: "Kelmadi", LATE: "Kech qoldi" };
const STATUS_TONE: Record<string, "accent" | "danger" | "warning"> = {
  PRESENT: "accent",
  ABSENT: "danger",
  LATE: "warning",
};

export function DavomatTab({ employees }: { employees: { id: string; name: string }[] }) {
  const [period, setPeriod] = useState<Period>("today");
  const [employeeId, setEmployeeId] = useState("all");
  const [records, setRecords] = useState<Record[]>([]);
  const [stats, setStats] = useState<{ total: number; presentToday: number; avgMinutes: number | null }>({
    total: 0,
    presentToday: 0,
    avgMinutes: null,
  });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (employeeId !== "all") params.set("employeeId", employeeId);
    const res = await fetch(`/api/attendance?${params.toString()}`);
    const data = await res.json();
    setRecords(data.records ?? []);
    setStats(data.stats ?? { total: 0, presentToday: 0, avgMinutes: null });
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, employeeId]);

  function avgLabel() {
    if (stats.avgMinutes == null) return "—";
    const h = Math.floor(stats.avgMinutes / 60);
    const m = Math.round(stats.avgMinutes % 60);
    return `${h} soat ${m} daq`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="O'rtacha ishlash" value={avgLabel()} icon={Clock} />
        <StatCard label="Bugun kelgan" value={String(stats.presentToday)} icon={CheckCircle2} />
        <StatCard label="Jami yozuvlar" value={String(stats.total)} icon={ListChecks} />
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

        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-accent" size={24} />
            </div>
          ) : records.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">Davomat yozuvlari topilmadi</p>
          ) : (
            <div className="flex flex-col divide-y divide-border/60">
              {records.map((r) => (
                <div key={r.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">{r.employee.name}</p>
                    <p className="text-xs text-muted">{formatDate(r.date)}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    {r.checkIn && <span>Keldi: {formatDateTime(r.checkIn)}</span>}
                    {r.checkOut && <span>Ketdi: {formatDateTime(r.checkOut)}</span>}
                    {r.withinRange != null &&
                      (r.withinRange ? (
                        <span className="flex items-center gap-1 text-accent">
                          <MapPin size={11} /> Joyida
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-danger">
                          <MapPinOff size={11} /> Joydan tashqari
                        </span>
                      ))}
                    <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
