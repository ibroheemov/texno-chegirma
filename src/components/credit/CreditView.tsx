"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Phone, AlertTriangle, Clock, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { formatSom, formatDate, daysBetween } from "@/lib/format";
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

export function CreditView() {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);
  const [payTarget, setPayTarget] = useState<Ledger | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/credit");
    const data = await res.json();
    setLedgers(data.ledgers ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const now = new Date();
  const overdue = ledgers.filter((l) => l.paidAmount < l.totalAmount && new Date(l.dueDate) < now);
  const upcoming = ledgers.filter((l) => l.paidAmount < l.totalAmount && new Date(l.dueDate) >= now);
  const paid = ledgers.filter((l) => l.paidAmount >= l.totalAmount);

  const totalDebt = useMemo(
    () => ledgers.reduce((s, l) => s + Math.max(0, l.totalAmount - l.paidAmount), 0),
    [ledgers]
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
        <StatCard label="Jami qarz" value={formatSom(totalDebt)} icon={Landmark} />
        <StatCard label="To'langan" value={formatSom(totalPaid)} icon={CheckCircle} />
        <StatCard label="Muddati o'tgan" value={String(overdue.length)} icon={AlertCircle} deltaTone="danger" />
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
          overdueStyle
        />
      )}
      {upcoming.length > 0 && (
        <CreditGroup
          title="Muddati bor"
          icon={<Clock size={16} className="text-warning" />}
          items={upcoming}
          onPay={setPayTarget}
        />
      )}
      {paid.length > 0 && (
        <CreditGroup
          title="To'liq to'langan"
          icon={<CheckCircle2 size={16} className="text-accent" />}
          items={paid}
          onPay={setPayTarget}
          readOnly
        />
      )}
      {ledgers.length === 0 && (
        <Card className="p-10 text-center text-sm text-muted">Nasiya yozuvlari mavjud emas</Card>
      )}

      <PayModal
        ledger={payTarget}
        onClose={() => setPayTarget(null)}
        onPaid={() => {
          setPayTarget(null);
          load();
        }}
      />
    </div>
  );
}

function CreditGroup({
  title,
  icon,
  items,
  onPay,
  overdueStyle,
  readOnly,
}: {
  title: string;
  icon: React.ReactNode;
  items: Ledger[];
  onPay: (l: Ledger) => void;
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
  onClose,
  onPaid,
}: {
  ledger: Ledger | null;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (ledger) {
      setAmount(String(ledger.totalAmount - ledger.paidAmount));
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
      body: JSON.stringify({ amount: Number(amount) }),
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
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button onClick={submit} disabled={saving} className="mt-2">
          {saving && <Loader2 size={16} className="animate-spin" />}
          Tasdiqlash
        </Button>
      </div>
    </Modal>
  );
}
