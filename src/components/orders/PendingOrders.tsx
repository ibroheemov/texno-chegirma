"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatSom, formatDateTime } from "@/lib/format";
import { PackageOpen, Phone } from "lucide-react";

type Item = { name: string; qty: number; price: number };
type Order = {
  id: string;
  customerName: string;
  customerPhone: string;
  items: Item[];
  total: number;
  createdAt: string;
};

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // audio not available in this environment
  }
}

export function PendingOrders({ soundAlert = true }: { soundAlert?: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);
  const prevCount = useRef<number | null>(null);

  async function load() {
    const res = await fetch("/api/orders?status=PENDING");
    const data = await res.json();
    const next: Order[] = data.orders ?? [];
    if (soundAlert && prevCount.current != null && next.length > prevCount.current) {
      beep();
    }
    prevCount.current = next.length;
    setOrders(next);
    setLoaded(true);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(id: string, status: "CONFIRMED" | "CANCELED") {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  if (!loaded || orders.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <PackageOpen size={16} className="text-accent" />
        <h2 className="text-sm font-semibold">
          Yangi onlayn buyurtmalar <Badge tone="accent">{orders.length}</Badge>
        </h2>
      </div>
      <div className="flex flex-col divide-y divide-border/60">
        {orders.map((o) => (
          <div key={o.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">{o.customerName}</p>
              <p className="flex items-center gap-1 text-xs text-muted">
                <Phone size={11} /> {o.customerPhone} · {formatDateTime(o.createdAt)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-accent">{formatSom(o.total)}</span>
              <Button size="sm" onClick={() => act(o.id, "CONFIRMED")}>
                Qabul qilish
              </Button>
              <Button size="sm" variant="secondary" onClick={() => act(o.id, "CANCELED")}>
                Bekor qilish
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
