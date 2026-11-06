"use client";

import { useEffect, useState } from "react";
import { Loader2, Truck, Phone, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { EmployeeFormModal } from "./EmployeeFormModal";

type Courier = {
  id: string;
  name: string;
  phone: string | null;
  photoUrl: string | null;
  delivered: number;
  pending: number;
  failed: number;
};

export function KuriyerlarTab() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/couriers");
    const data = await res.json();
    setCouriers(data.couriers ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-accent" size={24} />
      </div>
    );
  }

  const totalDelivered = couriers.reduce((s, c) => s + c.delivered, 0);
  const totalPending = couriers.reduce((s, c) => s + c.pending, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Jami kuriyerlar" value={String(couriers.length)} icon={Truck} />
        <StatCard label="Yetkazilgan" value={String(totalDelivered)} icon={CheckCircle2} />
        <StatCard label="Kutilmoqda" value={String(totalPending)} icon={Clock} />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Kuriyerlar ro&apos;yxati</h3>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Kuriyer qo&apos;shish
        </Button>
      </div>

      {couriers.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">
          Hali kuriyer qo&apos;shilmagan
          <p className="mt-1 text-xs">Xodim qo&apos;shishda &quot;Kuriyer&quot; belgilang yoki yangi kuriyer qo&apos;shing</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {couriers.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-center gap-2.5">
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
                    {c.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div>
                  <p className="text-sm font-semibold">{c.name}</p>
                  {c.phone && (
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <Phone size={11} /> {c.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="accent">
                  <CheckCircle2 size={11} /> {c.delivered} yetkazilgan
                </Badge>
                <Badge tone="warning">
                  <Clock size={11} /> {c.pending} kutilmoqda
                </Badge>
                {c.failed > 0 && (
                  <Badge tone="danger">
                    <XCircle size={11} /> {c.failed} muvaffaqiyatsiz
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <EmployeeFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} defaultIsCourier />
    </div>
  );
}
