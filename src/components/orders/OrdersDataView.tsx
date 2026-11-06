"use client";

import { useEffect, useState } from "react";
import { Loader2, Package, Clock, Truck, CheckCircle2, XCircle, Phone, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { formatSom, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

type OrderStatus = "PENDING" | "CONFIRMED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELED" | "FAILED";
type PaymentFilter = "all" | "CASH" | "CARD" | "CREDIT" | "MIXED";
type Period = "all" | "today" | "week" | "month";

type OrderItem = { name: string; qty: number; price: number };
type Order = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  items: OrderItem[];
  total: number;
  paymentMethod: string;
  status: OrderStatus;
  createdAt: string;
};

type Stats = {
  total: number;
  pending: number;
  outForDelivery: number;
  delivered: number;
  failed: number;
  awaitingDelivery: number;
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Yangi",
  CONFIRMED: "Tasdiqlangan",
  OUT_FOR_DELIVERY: "Yetkazilmoqda",
  DELIVERED: "Yetkazildi",
  CANCELED: "Bekor qilindi",
  FAILED: "Muvaffaqiyatsiz",
};

const STATUS_TONE: Record<OrderStatus, "neutral" | "accent" | "danger" | "warning" | "info"> = {
  PENDING: "info",
  CONFIRMED: "warning",
  OUT_FOR_DELIVERY: "warning",
  DELIVERED: "accent",
  CANCELED: "danger",
  FAILED: "danger",
};

const PAYMENT_LABEL: Record<string, string> = { CASH: "Naqd", CARD: "Karta", CREDIT: "Nasiya", MIXED: "Aralash" };

const emptyStats: Stats = { total: 0, pending: 0, outForDelivery: 0, delivered: 0, failed: 0, awaitingDelivery: 0 };

export function OrdersDataView({ variant }: { variant: "orders" | "delivery" }) {
  const [period, setPeriod] = useState<Period>(variant === "delivery" ? "today" : "all");
  const [status, setStatus] = useState<string>("all");
  const [payment, setPayment] = useState<PaymentFilter>("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (period !== "all") params.set("period", period);
    if (status !== "all") params.set("status", status);
    if (payment !== "all") params.set("payment", payment);
    const res = await fetch(`/api/orders?${params.toString()}`);
    const data = await res.json();
    setOrders(data.orders ?? []);
    setStats(data.stats ?? emptyStats);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, status, payment]);

  async function setOrderStatus(id: string, next: OrderStatus) {
    setActingId(id);
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setActingId(null);
    load();
  }

  const periodOptions: [Period, string][] =
    variant === "orders"
      ? [
          ["all", "Barchasi"],
          ["today", "Bugun"],
          ["week", "Hafta"],
          ["month", "Oy"],
        ]
      : [
          ["today", "Bugun"],
          ["week", "Hafta"],
          ["month", "Oy"],
          ["all", "Hammasi"],
        ];

  const emptyMessage = variant === "orders" ? "Buyurtmalar topilmadi" : "Yetkazib berishlar topilmadi";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {variant === "orders" ? (
          <>
            <StatCard label="Jami" value={String(stats.total)} icon={Package} />
            <StatCard label="Yangi" value={String(stats.pending)} icon={Clock} />
            <StatCard label="Yetkazilayotgan" value={String(stats.outForDelivery)} icon={Truck} />
            <StatCard label="Yetkazilgan" value={String(stats.delivered)} icon={CheckCircle2} />
          </>
        ) : (
          <>
            <StatCard label="Jami" value={String(stats.total)} icon={Package} />
            <StatCard label="Kutilmoqda" value={String(stats.awaitingDelivery)} icon={Clock} />
            <StatCard label="Yetkazildi" value={String(stats.delivered)} icon={CheckCircle2} />
            <StatCard label="Muvaffaqiyatsiz" value={String(stats.failed)} icon={XCircle} deltaTone="danger" />
          </>
        )}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {periodOptions.map(([key, label]) => (
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

          {variant === "orders" && (
            <>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="ml-auto h-9 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-accent"
              >
                <option value="all">Barcha status</option>
                {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <select
                value={payment}
                onChange={(e) => setPayment(e.target.value as PaymentFilter)}
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-accent"
              >
                <option value="all">Barcha to&apos;lov</option>
                <option value="CASH">Naqd</option>
                <option value="CARD">Karta</option>
              </select>
            </>
          )}
        </div>

        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-accent" size={24} />
            </div>
          ) : orders.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">{emptyMessage}</p>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted">
                  <th className="py-2 pr-3 font-medium">#ID</th>
                  <th className="py-2 pr-3 font-medium">Mijoz</th>
                  <th className="py-2 pr-3 font-medium">Manzil</th>
                  <th className="py-2 pr-3 font-medium">Summa</th>
                  <th className="py-2 pr-3 font-medium">To&apos;lov</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Sana</th>
                  <th className="py-2 pr-3 font-medium text-right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-3 font-mono text-xs text-muted">#{o.id.slice(-6).toUpperCase()}</td>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium">{o.customerName}</p>
                      <p className="flex items-center gap-1 text-xs text-muted">
                        <Phone size={11} /> {o.customerPhone}
                      </p>
                    </td>
                    <td className="max-w-[180px] py-2.5 pr-3 text-xs text-muted">
                      {o.customerAddress ? (
                        <span className="flex items-start gap-1">
                          <MapPin size={11} className="mt-0.5 shrink-0" /> {o.customerAddress}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 pr-3 font-semibold">{formatSom(o.total)}</td>
                    <td className="py-2.5 pr-3 text-xs text-muted">{PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}</td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-muted">{formatDateTime(o.createdAt)}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex justify-end gap-1.5">
                        <OrderActions
                          status={o.status}
                          disabled={actingId === o.id}
                          onAct={(next) => setOrderStatus(o.id, next)}
                        />
                      </div>
                    </td>
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

function OrderActions({
  status,
  disabled,
  onAct,
}: {
  status: OrderStatus;
  disabled: boolean;
  onAct: (next: OrderStatus) => void;
}) {
  if (status === "PENDING") {
    return (
      <>
        <Button size="sm" disabled={disabled} onClick={() => onAct("CONFIRMED")}>
          Tasdiqlash
        </Button>
        <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onAct("CANCELED")}>
          Bekor qilish
        </Button>
      </>
    );
  }
  if (status === "CONFIRMED") {
    return (
      <>
        <Button size="sm" disabled={disabled} onClick={() => onAct("OUT_FOR_DELIVERY")}>
          Yetkazishga chiqarish
        </Button>
        <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onAct("CANCELED")}>
          Bekor qilish
        </Button>
      </>
    );
  }
  if (status === "OUT_FOR_DELIVERY") {
    return (
      <>
        <Button size="sm" disabled={disabled} onClick={() => onAct("DELIVERED")}>
          Yetkazildi
        </Button>
        <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onAct("FAILED")}>
          Muvaffaqiyatsiz
        </Button>
      </>
    );
  }
  return null;
}
