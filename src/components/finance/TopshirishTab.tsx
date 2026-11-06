"use client";

import { useEffect, useState } from "react";
import { Loader2, HandCoins, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { Field, Input } from "@/components/ui/Field";
import { formatSom, formatDateTime } from "@/lib/format";

type Period = "today" | "week" | "month" | "all";

type Balances = { cash: number; card: number; creditOutstanding: number; totalOut: number };

type Handover = {
  id: string;
  handedOverBy: string;
  receivedBy: string;
  note: string | null;
  cashAmount: number;
  cardAmount: number;
  creditAmount: number;
  totalAmount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

const STATUS_LABEL: Record<Handover["status"], string> = {
  PENDING: "Kutilmoqda",
  APPROVED: "Tasdiqlangan",
  REJECTED: "Rad etilgan",
};
const STATUS_TONE: Record<Handover["status"], "neutral" | "accent" | "danger" | "warning"> = {
  PENDING: "warning",
  APPROVED: "accent",
  REJECTED: "danger",
};

export function TopshirishTab() {
  const [period] = useState<Period>("month");
  const [balances, setBalances] = useState<Balances | null>(null);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);

  const [handedOverBy, setHandedOverBy] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [ledgerRes, handoverRes] = await Promise.all([
      fetch(`/api/ledger?period=${period}`),
      fetch("/api/handovers"),
    ]);
    const ledgerData = await ledgerRes.json();
    const handoverData = await handoverRes.json();
    setBalances(ledgerData.balances ?? null);
    setHandovers(handoverData.handovers ?? []);
    setStats(handoverData.stats ?? { total: 0, pending: 0, approved: 0, rejected: 0 });
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createHandover() {
    if (!handedOverBy.trim() || !receivedBy.trim()) {
      setError("Topshiruvchi va qabul qiluvchini kiriting");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/handovers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handedOverBy,
        receivedBy,
        note,
        cashAmount: balances?.cash ?? 0,
        cardAmount: balances?.card ?? 0,
        creditAmount: 0,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    setHandedOverBy("");
    setReceivedBy("");
    setNote("");
    load();
  }

  async function decide(id: string, status: "APPROVED" | "REJECTED") {
    setActingId(id);
    await fetch(`/api/handovers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setActingId(null);
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-accent" size={24} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold">Smena topshirish</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-surface-muted p-3 text-center">
            <p className="text-xs text-muted">Naqd</p>
            <p className="text-sm font-bold">{formatSom(balances?.cash ?? 0)}</p>
          </div>
          <div className="rounded-lg bg-surface-muted p-3 text-center">
            <p className="text-xs text-muted">Karta</p>
            <p className="text-sm font-bold">{formatSom(balances?.card ?? 0)}</p>
          </div>
          <div className="rounded-lg bg-surface-muted p-3 text-center">
            <p className="text-xs text-muted">Nasiya</p>
            <p className="text-sm font-bold">{formatSom(balances?.creditOutstanding ?? 0)}</p>
          </div>
          <div className="rounded-lg bg-surface-muted p-3 text-center">
            <p className="text-xs text-muted">Chiqimlar</p>
            <p className="text-sm font-bold">{formatSom(balances?.totalOut ?? 0)}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Topshiruvchi">
            <Input value={handedOverBy} onChange={(e) => setHandedOverBy(e.target.value)} placeholder="Ism" />
          </Field>
          <Field label="Qabul qiluvchi">
            <Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} placeholder="Ism" />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Izoh (ixtiyoriy)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <Button onClick={createHandover} disabled={saving} className="mt-3">
          {saving && <Loader2 size={16} className="animate-spin" />}
          <HandCoins size={16} /> Topshirish yaratish
        </Button>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jami" value={String(stats.total)} icon={HandCoins} />
        <StatCard label="Kutilmoqda" value={String(stats.pending)} icon={Clock} />
        <StatCard label="Tasdiqlangan" value={String(stats.approved)} icon={CheckCircle2} />
        <StatCard label="Rad etilgan" value={String(stats.rejected)} icon={XCircle} deltaTone="danger" />
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-semibold">Topshirishlar tarixi</h3>
        {handovers.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Hali topshirish yo&apos;q</p>
        ) : (
          <div className="mt-3 flex flex-col divide-y divide-border/60">
            {handovers.map((h) => (
              <div key={h.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {h.handedOverBy} → {h.receivedBy}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDateTime(h.createdAt)} · Naqd {formatSom(h.cashAmount)}
                    {h.cardAmount > 0 && <> · Karta {formatSom(h.cardAmount)}</>}
                  </p>
                  {h.note && <p className="text-xs text-muted">{h.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{formatSom(h.totalAmount)}</span>
                  <Badge tone={STATUS_TONE[h.status]}>{STATUS_LABEL[h.status]}</Badge>
                  {h.status === "PENDING" && (
                    <>
                      <Button size="sm" disabled={actingId === h.id} onClick={() => decide(h.id, "APPROVED")}>
                        Tasdiqlash
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={actingId === h.id}
                        onClick={() => decide(h.id, "REJECTED")}
                      >
                        Rad etish
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
