"use client";

import { useEffect, useState } from "react";
import { Loader2, Package, Clock, CheckCircle2, XCircle, Phone, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { formatSom, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

type OrderStatus = "PENDING" | "CONFIRMED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELED" | "FAILED";
type Period = "today" | "week" | "month" | "all";

type Order = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  total: number;
  status: OrderStatus;
  createdAt: string;
  courierId: string | null;
};

type Stats = { total: number; pending: number; delivered: number; failed: number; awaitingDelivery: number };

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

export function XodimlarYetkazishTab({ couriers }: { couriers: { id: string; name: string }[] }) {
  const [period, setPeriod] = useState<Period>("today");
  const [courierId, setCourierId] = useState("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, delivered: 0, failed: 0, awaitingDelivery: 0 });
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (period !== "all") params.set("period", period);
    if (courierId !== "all") params.set("courierId", courierId);
    const res = await fetch(`/api/orders?${params.toString()}`);
    const data = await res.json();
    setOrders(data.orders ?? []);
    setStats(data.stats ?? stats);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, courierId]);

  async function assignCourier(orderId: string, newCourierId: string) {
    setActingId(orderId);
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courierId: newCourierId || null }),
    });
    setActingId(null);
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jami" value={String(stats.total)} icon={Package} />
        <StatCard label="Kutilmoqda" value={String(stats.awaitingDelivery)} icon={Clock} />
        <StatCard label="Yetkazildi" value={String(stats.delivered)} icon={CheckCircle2} />
        <StatCard label="Muvaffaqiyatsiz" value={String(stats.failed)} icon={XCircle} deltaTone="danger" />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["today", "Bugun"],
              ["week", "Hafta"],
              ["month", "Oy"],
              ["all", "Hammasi"],
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
            value={courierId}
            onChange={(e) => setCourierId(e.target.value)}
            className="ml-auto h-9 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-accent"
          >
            <option value="all">Barcha kuriyerlar</option>
            {couriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-accent" size={24} />
            </div>
          ) : orders.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">Yetkazib berishlar topilmadi</p>
          ) : (
            <div className="flex flex-col divide-y divide-border/60">
              {orders.map((o) => (
                <div key={o.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{o.customerName}</p>
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <Phone size={11} /> {o.customerPhone}
                      {o.customerAddress && (
                        <>
                          {" "}
                          · <MapPin size={11} /> {o.customerAddress}
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted">{formatDateTime(o.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{formatSom(o.total)}</span>
                    <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                    <select
                      value={o.courierId ?? ""}
                      disabled={actingId === o.id}
                      onChange={(e) => assignCourier(o.id, e.target.value)}
                      className="h-8 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-accent"
                    >
                      <option value="">Kuriyer tayinlanmagan</option>
                      {couriers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
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
