"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  MapPin,
  Package,
  Phone,
  Truck,
  XCircle,
} from "lucide-react";
import { formatDateTime, formatSom } from "@/lib/format";
import { googleMapsUrl, yandexMapsUrl } from "@/lib/mapLinks";

type Variant = "orders" | "delivery";
type OrderStatus = "PENDING" | "CONFIRMED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELED" | "FAILED";
type PaymentFilter = "all" | "CASH" | "CARD" | "CREDIT" | "MIXED";
type Period = "all" | "today" | "week" | "month";
type BadgeTone = "badge-info" | "badge-warning" | "badge-success" | "badge-danger";

type Order = {
  id: string;
  number: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  customerLat: number | null;
  customerLng: number | null;
  items: { name: string; qty: number; price: number }[];
  total: number;
  paymentMethod: string;
  status: OrderStatus;
  source: string;
  deliveryDate: string | null;
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

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  PENDING: "badge-info",
  CONFIRMED: "badge-warning",
  OUT_FOR_DELIVERY: "badge-warning",
  DELIVERED: "badge-success",
  CANCELED: "badge-danger",
  FAILED: "badge-danger",
};

const PAYMENT_LABEL: Record<string, string> = { CASH: "Naqd", CARD: "Karta", CREDIT: "Nasiya", MIXED: "Aralash" };

const emptyStats: Stats = { total: 0, pending: 0, outForDelivery: 0, delivered: 0, failed: 0, awaitingDelivery: 0 };

export function OrdersPanel({ variant }: { variant: Variant }) {
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

  const kpis =
    variant === "orders"
      ? [
          { label: "Jami", value: stats.total, icon: Package, tone: "" },
          { label: "Yangi", value: stats.pending, icon: Clock, tone: "info" },
          { label: "Yetkazilayotgan", value: stats.outForDelivery, icon: Truck, tone: "warning" },
          { label: "Yetkazilgan", value: stats.delivered, icon: CheckCircle2, tone: "success" },
        ]
      : [
          { label: "Jami", value: stats.total, icon: Package, tone: "" },
          { label: "Kutilmoqda", value: stats.awaitingDelivery, icon: Clock, tone: "warning" },
          { label: "Yetkazildi", value: stats.delivered, icon: CheckCircle2, tone: "success" },
          { label: "Muvaffaqiyatsiz", value: stats.failed, icon: XCircle, tone: "danger" },
        ];

  const emptyTitle = variant === "orders" ? "Buyurtmalar topilmadi" : "Yetkazib berishlar topilmadi";

  return (
    <>
      <div className="bo-kpis">
        {kpis.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="card kpi bo-kpi">
            <span className={`ic-tile${tone ? ` ${tone}` : ""}`}>
              <Icon className="ic" size={20} />
            </span>
            <div className="bo-kpi-body">
              <span className="kpi-label">{label}</span>
              <span className="kpi-val">{value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card bo-card">
        <div className="tbl-bar">
          <div className="seg seg-sm" role="group" aria-label="Davr">
            {periodOptions.map(([key, label]) => (
              <button
                type="button"
                key={key}
                className={period === key ? "is-active" : ""}
                onClick={() => setPeriod(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="grow" />
          {variant === "orders" && (
            <>
              <div className="control control-sm bo-select">
                <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="all">Barcha status</option>
                  {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="ic" size={14} />
              </div>
              <div className="control control-sm bo-select">
                <select
                  aria-label="To‘lov"
                  value={payment}
                  onChange={(event) => setPayment(event.target.value as PaymentFilter)}
                >
                  <option value="all">Barcha to‘lov</option>
                  <option value="CASH">Naqd</option>
                  <option value="CARD">Karta</option>
                </select>
                <ChevronDown className="ic" size={14} />
              </div>
            </>
          )}
        </div>

        {loading ? (
          <div className="bo-loading">
            <span className="spinner spinner-lg" role="status" aria-label="Yuklanmoqda" />
          </div>
        ) : orders.length === 0 ? (
          <div className="empty">
            <span className="em-ic">
              {variant === "orders" ? <Package className="ic" size={28} /> : <Truck className="ic" size={28} />}
            </span>
            <h4>{emptyTitle}</h4>
            <p>Davr yoki filtrlarni o‘zgartiring.</p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl bo-tbl bo-tbl-tight">
              <thead>
                <tr>
                  <th>#ID</th>
                  <th>Mijoz</th>
                  <th>Manzil</th>
                  <th className="r">Summa</th>
                  <th>To‘lov</th>
                  <th>Status</th>
                  <th>Yetkazish sanasi</th>
                  <th>Sana</th>
                  <th className="r">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="mono bo-muted">#{o.number}</td>
                    <td>
                      <div className="bo-person">
                        <div>
                          <b>
                            {o.customerName}
                            {o.source === "POS" && (
                              <>
                                {" "}
                                <span className="badge badge-info badge-sm">Do‘kondan</span>
                              </>
                            )}
                          </b>
                          <small>
                            <span className="bo-inline mono">
                              <Phone className="ic" size={12} />
                              {o.customerPhone}
                            </span>
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className="bo-muted bo-wrap">
                      {o.customerAddress ? (
                        <span className="bo-inline">
                          <MapPin className="ic" size={13} />
                          {o.customerAddress}
                        </span>
                      ) : o.customerLat == null || o.customerLng == null ? (
                        "—"
                      ) : null}
                      {o.customerLat != null && o.customerLng != null && (
                        <span className="bo-map-links">
                          <a href={yandexMapsUrl(o.customerLat, o.customerLng)} target="_blank" rel="noopener noreferrer">
                            Yandex
                          </a>
                          <a href={googleMapsUrl(o.customerLat, o.customerLng)} target="_blank" rel="noopener noreferrer">
                            Google
                          </a>
                        </span>
                      )}
                    </td>
                    <td className="r mono strong">{formatSom(o.total)}</td>
                    <td className="bo-muted">{PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}</td>
                    <td>
                      <span className={`badge ${STATUS_TONE[o.status]}`}>
                        <span className="bd" />
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td className="bo-muted mono">{o.deliveryDate ? formatDateTime(o.deliveryDate) : "—"}</td>
                    <td className="bo-muted mono">{formatDateTime(o.createdAt)}</td>
                    <td>
                      <div className="bo-order-actions">
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
          </div>
        )}

        <div className="tbl-foot">
          <span>{loading ? "Yuklanmoqda…" : `${orders.length} ta ${variant === "orders" ? "buyurtma" : "yetkazish"}`}</span>
        </div>
      </div>
    </>
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
  const primary = (label: string, next: OrderStatus) => (
    <button type="button" className="btn btn-primary btn-sm" disabled={disabled} onClick={() => onAct(next)}>
      {label}
    </button>
  );
  const secondary = (label: string, next: OrderStatus) => (
    <button type="button" className="btn btn-outline btn-sm" disabled={disabled} onClick={() => onAct(next)}>
      {label}
    </button>
  );

  if (status === "PENDING") {
    return (
      <>
        {primary("Tasdiqlash", "CONFIRMED")}
        {secondary("Bekor qilish", "CANCELED")}
      </>
    );
  }
  if (status === "CONFIRMED") {
    return (
      <>
        {primary("Yetkazishga chiqarish", "OUT_FOR_DELIVERY")}
        {secondary("Bekor qilish", "CANCELED")}
      </>
    );
  }
  if (status === "OUT_FOR_DELIVERY") {
    return (
      <>
        {primary("Yetkazildi", "DELIVERED")}
        {secondary("Muvaffaqiyatsiz", "FAILED")}
      </>
    );
  }
  return null;
}
