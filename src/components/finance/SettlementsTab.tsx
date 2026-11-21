"use client";

import { useEffect, useState } from "react";
import { Loader2, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatSom, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

type Period = "today" | "week" | "month" | "all";

type PendingRow = {
  id: string;
  saleId: string;
  customerName: string | null;
  methodName: string;
  amount: number;
  expectedDate: string;
  note: string | null;
  overdue: boolean;
  createdAt: string;
};

type ReceivedRow = {
  id: string;
  saleId: string;
  customerName: string | null;
  methodName: string;
  amount: number;
  note: string | null;
  receivedAt: string;
  receivedMethod: "CASH" | "CARD" | null;
};

type Data = {
  pending: PendingRow[];
  received: ReceivedRow[];
  totals: { pendingTotal: number; pendingCount: number; overdueCount: number; receivedTotal: number };
};

export function SettlementsTab() {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiveTarget, setReceiveTarget] = useState<PendingRow | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/finance/settlements?period=${period}`);
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Clock size={14} className="text-accent" /> Kutilmoqda
          </div>
          <p className="mt-1 text-xl font-bold">{formatSom(data?.totals.pendingTotal ?? 0)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <AlertTriangle size={14} className="text-danger" /> Muddati o&apos;tgan
          </div>
          <p className="mt-1 text-xl font-bold text-danger">{data?.totals.overdueCount ?? 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <CheckCircle2 size={14} className="text-accent" /> Qabul qilingan (davr)
          </div>
          <p className="mt-1 text-xl font-bold">{formatSom(data?.totals.receivedTotal ?? 0)}</p>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-semibold">Kutilayotgan to&apos;lovlar</h3>
        <div className="mt-3 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-accent" size={24} />
            </div>
          ) : (
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted">
                  <th className="py-2 pr-3 font-medium">Mijoz</th>
                  <th className="py-2 pr-3 font-medium">Usul</th>
                  <th className="py-2 pr-3 font-medium">Summa</th>
                  <th className="py-2 pr-3 font-medium">Kutilayotgan sana</th>
                  <th className="py-2 pr-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {(data?.pending ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">
                      {r.customerName ?? "—"}
                      {r.note && <p className="mt-0.5 text-xs font-normal text-muted">{r.note}</p>}
                    </td>
                    <td className="py-2.5 pr-3">{r.methodName}</td>
                    <td className="py-2.5 pr-3 font-semibold">{formatSom(r.amount)}</td>
                    <td className={cn("py-2.5 pr-3", r.overdue && "text-danger")}>
                      {formatDate(r.expectedDate)}
                      {r.overdue && " · muddati o'tgan"}
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      <Button size="sm" onClick={() => setReceiveTarget(r)}>
                        Qabul qilindi
                      </Button>
                    </td>
                  </tr>
                ))}
                {(data?.pending.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted">
                      Kutilayotgan to&apos;lovlar yo&apos;q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold">Qabul qilingan to&apos;lovlar</h3>
        <div className="mt-3 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-accent" size={24} />
            </div>
          ) : (
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted">
                  <th className="py-2 pr-3 font-medium">Mijoz</th>
                  <th className="py-2 pr-3 font-medium">Usul</th>
                  <th className="py-2 pr-3 font-medium">Summa</th>
                  <th className="py-2 pr-3 font-medium">Qabul qilindi</th>
                </tr>
              </thead>
              <tbody>
                {(data?.received ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">
                      {r.customerName ?? "—"}
                      {r.note && <p className="mt-0.5 text-xs font-normal text-muted">{r.note}</p>}
                    </td>
                    <td className="py-2.5 pr-3">{r.methodName}</td>
                    <td className="py-2.5 pr-3 font-semibold">{formatSom(r.amount)}</td>
                    <td className="py-2.5 pr-3 text-muted">
                      {r.receivedAt && formatDate(r.receivedAt)} ·{" "}
                      {r.receivedMethod === "CARD" ? "karta" : "naqd"}
                    </td>
                  </tr>
                ))}
                {(data?.received.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted">
                      Bu davrda qabul qilingan to&apos;lov yo&apos;q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {receiveTarget && (
        <ReceiveSettlementModal
          row={receiveTarget}
          onClose={() => setReceiveTarget(null)}
          onReceived={() => {
            setReceiveTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ReceiveSettlementModal({
  row,
  onClose,
  onReceived,
}: {
  row: PendingRow;
  onClose: () => void;
  onReceived: () => void;
}) {
  const [method, setMethod] = useState<"CASH" | "CARD">("CASH");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/finance/settlements/${row.id}/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method }),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Xatolik yuz berdi");
      return;
    }
    onReceived();
  }

  return (
    <Modal open onClose={onClose} title={`To'lovni qabul qilish — ${row.methodName}`}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          {row.customerName ?? "Mijoz"} uchun <strong className="text-foreground">{formatSom(row.amount)}</strong>{" "}
          summasi {row.methodName} tomonidan to&apos;landimi?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMethod("CASH")}
            className={cn(
              "rounded-lg border border-border py-2 text-sm font-medium",
              method === "CASH" && "border-accent bg-accent-soft text-accent"
            )}
          >
            Naqd
          </button>
          <button
            onClick={() => setMethod("CARD")}
            className={cn(
              "rounded-lg border border-border py-2 text-sm font-medium",
              method === "CARD" && "border-accent bg-accent-soft text-accent"
            )}
          >
            Karta
          </button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button onClick={confirm} disabled={saving} className="mt-1">
          {saving && <Loader2 size={16} className="animate-spin" />}
          Tasdiqlash
        </Button>
      </div>
    </Modal>
  );
}
