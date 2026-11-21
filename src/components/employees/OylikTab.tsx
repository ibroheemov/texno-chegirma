"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, UserX, Wallet, Banknote, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { formatSom } from "@/lib/format";
import { cn } from "@/lib/cn";

type Period = "today" | "week" | "month";

type Row = {
  id: string;
  name: string;
  salaryType: "MONTHLY" | "DAILY";
  salary: number;
  presentDays: number;
  absentDays: number;
  deduction: number;
  partialDays: number;
  partialDeduction: number;
  pay: number;
  paid: number;
  remaining: number;
};

export function OylikTab({ employees }: { employees: { id: string; name: string }[] }) {
  const [period, setPeriod] = useState<Period>("month");
  const [employeeId, setEmployeeId] = useState("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ employeeCount: 0, totalAbsentDays: 0, totalPay: 0, totalPaid: 0 });
  const [loading, setLoading] = useState(true);
  const [payTarget, setPayTarget] = useState<Row | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (employeeId !== "all") params.set("employeeId", employeeId);
    const res = await fetch(`/api/payroll?${params.toString()}`);
    const data = await res.json();
    setRows(data.rows ?? []);
    setTotals(data.totals ?? { employeeCount: 0, totalAbsentDays: 0, totalPay: 0, totalPaid: 0 });
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, employeeId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Xodimlar" value={String(totals.employeeCount)} icon={Users} />
        <StatCard label="Jami kelmagan kunlar" value={String(totals.totalAbsentDays)} icon={UserX} />
        <StatCard label="Jami oylik (so'm)" value={formatSom(totals.totalPay)} icon={Wallet} />
        <StatCard label="To'langan" value={formatSom(totals.totalPaid)} icon={CheckCircle2} />
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
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted">
                  <th className="py-2 pr-3 font-medium">Xodim</th>
                  <th className="py-2 pr-3 font-medium">Ishlagan kunlar</th>
                  <th className="py-2 pr-3 font-medium">Kelmagan kunlar</th>
                  <th className="py-2 pr-3 font-medium">Kech/erta ketgan</th>
                  <th className="py-2 pr-3 font-medium">Oylik</th>
                  <th className="py-2 pr-3 font-medium">To&apos;langan</th>
                  <th className="py-2 pl-3 text-right font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{r.name}</td>
                    <td className="py-2.5 pr-3">{r.presentDays}</td>
                    <td className="py-2.5 pr-3 text-muted">
                      {r.absentDays > 0 ? (
                        <span className="text-danger">
                          {r.absentDays} · −{formatSom(r.deduction)}
                        </span>
                      ) : (
                        "0"
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-muted">
                      {r.partialDays > 0 ? (
                        <span className="text-warning">
                          {r.partialDays} · −{formatSom(r.partialDeduction)}
                        </span>
                      ) : (
                        "0"
                      )}
                    </td>
                    <td className="py-2.5 pr-3 font-semibold">{formatSom(r.pay)}</td>
                    <td className="py-2.5 pr-3">
                      {r.pay > 0 && r.remaining === 0 ? (
                        <Badge tone="accent">To&apos;langan</Badge>
                      ) : r.paid > 0 ? (
                        <span className="text-xs">
                          {formatSom(r.paid)} <span className="text-muted">· qoldiq {formatSom(r.remaining)}</span>
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <Button
                        size="sm"
                        variant={r.remaining > 0 ? "primary" : "secondary"}
                        onClick={() => setPayTarget(r)}
                      >
                        <Banknote size={14} /> To&apos;lash
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <PaySalaryModal
        row={payTarget}
        onClose={() => setPayTarget(null)}
        onPaid={() => {
          setPayTarget(null);
          load();
        }}
      />
    </div>
  );
}

function PaySalaryModal({
  row,
  onClose,
  onPaid,
}: {
  row: Row | null;
  onClose: () => void;
  onPaid: () => void;
}) {
  // Mounted per row so the form starts fresh each time it opens.
  if (!row) return null;
  return <PaySalaryForm key={row.id} row={row} onClose={onClose} onPaid={onPaid} />;
}

function PaySalaryForm({ row, onClose, onPaid }: { row: Row; onClose: () => void; onPaid: () => void }) {
  const [amount, setAmount] = useState(row.remaining > 0 ? String(row.remaining) : "");
  const [method, setMethod] = useState<"CASH" | "CARD">("CASH");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    if (!(Number(amount) > 0)) {
      setError("Summani kiriting");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/payroll/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: row.id, amount: Number(amount), method, note }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    onPaid();
  }

  return (
    <Modal open onClose={onClose} title={`Oylik to'lash — ${row.name}`}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-muted p-3 text-center text-xs">
          <div>
            <p className="text-muted">Hisoblangan</p>
            <p className="mt-0.5 font-semibold">{formatSom(row.pay)}</p>
          </div>
          <div>
            <p className="text-muted">To&apos;langan</p>
            <p className="mt-0.5 font-semibold">{formatSom(row.paid)}</p>
          </div>
          <div>
            <p className="text-muted">Qoldiq</p>
            <p className="mt-0.5 font-semibold text-accent">{formatSom(row.remaining)}</p>
          </div>
        </div>

        <Field label="Summa (so'm)">
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>

        <Field label="To'lov turi">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["CASH", "Naqd"],
                ["CARD", "Karta"],
              ] as ["CASH" | "CARD", string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMethod(key)}
                className={cn(
                  "rounded-lg border border-border py-2 text-xs font-medium text-muted",
                  method === key && "border-accent bg-accent-soft text-accent"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Izoh (ixtiyoriy)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Masalan: avans" />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button onClick={pay} disabled={saving}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          To&apos;lash
        </Button>
        <p className="text-center text-[11px] text-muted">
          To&apos;lov Moliya &rarr; Chiqim bo&apos;limiga &quot;Oylik&quot; toifasida yoziladi.
        </p>
      </div>
    </Modal>
  );
}
