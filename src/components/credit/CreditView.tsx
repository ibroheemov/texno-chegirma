"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Phone, AlertTriangle, Clock, CheckCircle2, FileSpreadsheet, History } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { formatSom, formatDate, formatDateTime, daysBetween } from "@/lib/format";
import { exportCreditLedgersToExcel } from "@/lib/exportExcel";
import { Landmark, Users, AlertCircle, CheckCircle } from "lucide-react";

type Ledger = {
  id: string;
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
  createdAt: string;
  customer: { id: string; name: string; phone: string | null };
};

type EmployeeOption = { id: string; name: string };

export function CreditView() {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [payTarget, setPayTarget] = useState<Ledger | null>(null);
  const [historyTarget, setHistoryTarget] = useState<{ id: string; name: string } | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/credit");
    const data = await res.json();
    setLedgers(data.ledgers ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data) => setEmployees(data.employees ?? []))
      .catch(() => {});
  }, []);

  const now = new Date();
  const overdue = ledgers.filter((l) => l.paidAmount < l.totalAmount && new Date(l.dueDate) < now);
  const upcoming = ledgers.filter((l) => l.paidAmount < l.totalAmount && new Date(l.dueDate) >= now);
  const paid = ledgers.filter((l) => l.paidAmount >= l.totalAmount);

  const totalDebt = useMemo(
    () => ledgers.reduce((s, l) => s + Math.max(0, l.totalAmount - l.paidAmount), 0),
    [ledgers]
  );
  const overdueDebt = useMemo(
    () => overdue.reduce((s, l) => s + Math.max(0, l.totalAmount - l.paidAmount), 0),
    [overdue]
  );
  const totalPaid = useMemo(() => ledgers.reduce((s, l) => s + l.paidAmount, 0), [ledgers]);
  const debtorCount = new Set(
    ledgers.filter((l) => l.paidAmount < l.totalAmount).map((l) => l.customer.id)
  ).size;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Nasiyadagi summa" value={formatSom(totalDebt)} icon={Landmark} />
        <StatCard label="To'langan" value={formatSom(totalPaid)} icon={CheckCircle} />
        <StatCard label="Muddati o'tgan" value={formatSom(overdueDebt)} icon={AlertCircle} deltaTone="danger" />
        <StatCard label="Qarzdorlar" value={String(debtorCount)} icon={Users} />
      </div>

      {ledgers.length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={() => exportCreditLedgersToExcel(ledgers)}>
            <FileSpreadsheet size={16} /> Excel
          </Button>
        </div>
      )}

      {overdue.length > 0 && (
        <CreditGroup
          title="Muddati tugagan"
          icon={<AlertTriangle size={16} className="text-danger" />}
          items={overdue}
          onPay={setPayTarget}
          onHistory={setHistoryTarget}
          overdueStyle
        />
      )}
      {upcoming.length > 0 && (
        <CreditGroup
          title="Muddati bor"
          icon={<Clock size={16} className="text-warning" />}
          items={upcoming}
          onPay={setPayTarget}
          onHistory={setHistoryTarget}
        />
      )}
      {paid.length > 0 && (
        <CreditGroup
          title="To'liq to'langan"
          icon={<CheckCircle2 size={16} className="text-accent" />}
          items={paid}
          onPay={setPayTarget}
          onHistory={setHistoryTarget}
          readOnly
        />
      )}
      {ledgers.length === 0 && (
        <Card className="p-10 text-center text-sm text-muted">Nasiya yozuvlari mavjud emas</Card>
      )}

      <PayModal
        ledger={payTarget}
        employees={employees}
        onClose={() => setPayTarget(null)}
        onPaid={() => {
          setPayTarget(null);
          load();
        }}
      />

      <CustomerPaymentHistoryModal target={historyTarget} onClose={() => setHistoryTarget(null)} />
    </div>
  );
}

function CreditGroup({
  title,
  icon,
  items,
  onPay,
  onHistory,
  overdueStyle,
  readOnly,
}: {
  title: string;
  icon: React.ReactNode;
  items: Ledger[];
  onPay: (l: Ledger) => void;
  onHistory: (c: { id: string; name: string }) => void;
  overdueStyle?: boolean;
  readOnly?: boolean;
}) {
  const now = new Date();
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold">
          {title} ({items.length})
        </h3>
      </div>
      <div className="flex flex-col divide-y divide-border/60">
        {items.map((l) => {
          const remaining = l.totalAmount - l.paidAmount;
          const days = Math.abs(daysBetween(new Date(l.dueDate), now));
          return (
            <div key={l.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
                  {l.customer.name.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-semibold">{l.customer.name}</p>
                  {l.customer.phone && (
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <Phone size={11} /> {l.customer.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatSom(remaining)} <span className="text-xs font-normal text-muted">/ {formatSom(l.totalAmount)}</span>
                  </p>
                  <p className="text-xs text-muted">Muddat: {formatDate(l.dueDate)}</p>
                </div>
                {!readOnly && (
                  overdueStyle ? (
                    <Badge tone="danger">{days} kun o&apos;tgan</Badge>
                  ) : (
                    <Badge tone="warning">{days} kun qoldi</Badge>
                  )
                )}
                <button
                  onClick={() => onHistory({ id: l.customer.id, name: l.customer.name })}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-accent"
                  aria-label="To'lovlar tarixi"
                  title="To'lovlar tarixi"
                >
                  <History size={14} />
                </button>
                {readOnly ? (
                  <Badge tone="accent">To&apos;langan</Badge>
                ) : (
                  <Button size="sm" onClick={() => onPay(l)}>
                    To&apos;lash
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function PayModal({
  ledger,
  employees,
  onClose,
  onPaid,
}: {
  ledger: Ledger | null;
  employees: EmployeeOption[];
  onClose: () => void;
  onPaid: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (ledger) {
      setAmount(String(ledger.totalAmount - ledger.paidAmount));
      setEmployeeId("");
      setNote("");
      setError("");
    }
  }, [ledger]);

  if (!ledger) return null;
  const remaining = ledger.totalAmount - ledger.paidAmount;

  async function submit() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/credit/${ledger!.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), employeeId: employeeId || undefined, note }),
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
    <Modal open={!!ledger} onClose={onClose} title={`${ledger.customer.name} — to'lov`}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Qoldiq qarz: <span className="font-semibold text-foreground">{formatSom(remaining)}</span>
        </p>
        <Field label="To'lov summasi (so'm)">
          <Input type="number" value={amount} max={remaining} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        {employees.length > 0 && (
          <Field label="To'lovni qabul qilgan xodim (ixtiyoriy)">
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">Tanlanmagan</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Izoh (ixtiyoriy)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Qo'shimcha izoh" />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button onClick={submit} disabled={saving} className="mt-2">
          {saving && <Loader2 size={16} className="animate-spin" />}
          Tasdiqlash
        </Button>
      </div>
    </Modal>
  );
}

type PaymentHistoryRow = {
  id: string;
  amount: number;
  note: string | null;
  employeeName: string | null;
  createdAt: string;
};

type LedgerDetail = {
  id: string;
  createdAt: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  overdue: boolean;
  items: { name: string; qty: number; price: number }[];
  payments: PaymentHistoryRow[];
};

type CustomerHistoryData = {
  customer: { name: string; phone: string | null };
  ledgers: LedgerDetail[];
  totals: { totalDebt: number; totalPaid: number; totalRemaining: number; paymentsCount: number };
};

function CustomerPaymentHistoryModal({
  target,
  onClose,
}: {
  target: { id: string; name: string } | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<CustomerHistoryData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setLoading(true);
    setData(null);
    fetch(`/api/credit/customers/${target.id}/payments`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [target]);

  if (!target) return null;

  const now = new Date();

  return (
    <Modal open={!!target} onClose={onClose} title={`To'lovlar tarixi — ${target.name}`}>
      <div className="flex flex-col gap-3">
        {loading || !data ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin text-accent" size={24} />
          </div>
        ) : (
          <>
            {data.customer.phone && (
              <p className="flex items-center gap-1 text-xs text-muted">
                <Phone size={11} /> {data.customer.phone}
              </p>
            )}
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-muted p-3 text-center">
              <div>
                <p className="text-xs text-muted">Jami qarz</p>
                <p className="text-sm font-bold">{formatSom(data.totals.totalDebt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">To&apos;langan</p>
                <p className="text-sm font-bold text-accent">{formatSom(data.totals.totalPaid)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Qoldiq</p>
                <p className="text-sm font-bold">{formatSom(data.totals.totalRemaining)}</p>
              </div>
            </div>

            <div className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto">
              {data.ledgers.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted">Bu mijozning nasiya yozuvi yo&apos;q</p>
              ) : (
                data.ledgers.map((l) => {
                  const fullyPaid = l.remaining <= 0;
                  const days = Math.abs(daysBetween(new Date(l.dueDate), now));
                  return (
                    <div key={l.id} className="rounded-lg border border-border/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-muted">
                          Olingan: <span className="text-foreground">{formatDate(l.createdAt)}</span> · Muddat:{" "}
                          <span className="text-foreground">{formatDate(l.dueDate)}</span>
                        </div>
                        {fullyPaid ? (
                          <Badge tone="accent">To&apos;langan</Badge>
                        ) : l.overdue ? (
                          <Badge tone="danger">{days} kun o&apos;tgan</Badge>
                        ) : (
                          <Badge tone="warning">{days} kun qoldi</Badge>
                        )}
                      </div>

                      {data.ledgers.length > 1 && (
                        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                          <div>
                            <p className="text-muted">Jami</p>
                            <p className="font-semibold">{formatSom(l.totalAmount)}</p>
                          </div>
                          <div>
                            <p className="text-muted">To&apos;langan</p>
                            <p className="font-semibold text-accent">{formatSom(l.paidAmount)}</p>
                          </div>
                          <div>
                            <p className="text-muted">Qoldiq</p>
                            <p className="font-semibold">{formatSom(l.remaining)}</p>
                          </div>
                        </div>
                      )}

                      {l.items.length > 0 && (
                        <div className="mt-3 border-t border-dashed border-border/60 pt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                            Olingan tovarlar
                          </p>
                          <div className="mt-2 flex flex-col gap-1.5">
                            {l.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="truncate">
                                  {item.name} <span className="text-muted">× {item.qty}</span>
                                </span>
                                <span className="whitespace-nowrap font-medium">
                                  {formatSom(item.price * item.qty)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 border-t border-dashed border-border/60 pt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          To&apos;lovlar tarixi
                        </p>
                        {l.payments.length === 0 ? (
                          <p className="mt-2 text-xs text-muted">Hali to&apos;lov qilinmagan</p>
                        ) : (
                          <div className="mt-2 flex flex-col gap-1.5">
                            {l.payments.map((p) => (
                              <div key={p.id} className="rounded-md bg-surface-muted px-2.5 py-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs text-muted">{formatDateTime(p.createdAt)}</p>
                                  <span className="text-xs font-semibold text-accent">{formatSom(p.amount)}</span>
                                </div>
                                {(p.employeeName || p.note) && (
                                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                                    {p.employeeName && <span>Qabul qildi: {p.employeeName}</span>}
                                    {p.note && <span>Izoh: {p.note}</span>}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
