"use client";

import { useState } from "react";
import type { Employee } from "@prisma/client";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Phone, CheckCircle2, LogOut } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { formatSom } from "@/lib/format";
import { EmployeeFormModal } from "./EmployeeFormModal";
import { Users, UserCheck, UserX, Clock } from "lucide-react";

export type EmployeeRow = Employee & { presentToday: boolean; onShift: boolean };

export function EmployeeTable({ initialEmployees }: { initialEmployees: EmployeeRow[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [marking, setMarking] = useState<string | null>(null);

  const total = initialEmployees.length;
  const presentCount = initialEmployees.filter((e) => e.presentToday).length;
  const onShiftCount = initialEmployees.filter((e) => e.onShift).length;

  async function markPresent(id: string) {
    setMarking(id);
    const geo = await new Promise<GeolocationPosition | null>((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition((pos) => resolve(pos), () => resolve(null), { timeout: 8000 });
    });
    await fetch(`/api/employees/${id}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "PRESENT",
        lat: geo?.coords.latitude,
        lng: geo?.coords.longitude,
      }),
    });
    setMarking(null);
    router.refresh();
  }

  async function markCheckout(id: string) {
    setMarking(id);
    await fetch(`/api/employees/${id}/attendance`, { method: "PATCH" });
    setMarking(null);
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jami xodimlar" value={String(total)} icon={Users} />
        <StatCard label="Bugun kelgan" value={String(presentCount)} icon={UserCheck} />
        <StatCard label="Hozir ishda" value={String(onShiftCount)} icon={Clock} />
        <StatCard label="Kelmagan" value={String(total - presentCount)} icon={UserX} />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Xodimlar ro&apos;yxati</h2>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={16} /> Xodim qo&apos;shish
          </Button>
        </div>

        <div className="mt-4 flex flex-col divide-y divide-border/60">
          {initialEmployees.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-2.5">
                {e.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
                    {e.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div>
                  <p className="text-sm font-semibold">
                    {e.name} {e.isCourier && <Badge tone="info">Kuriyer</Badge>}
                  </p>
                  <p className="text-xs text-muted">
                    {e.position ?? "Lavozim yo'q"} · {formatSom(e.hourlyRate)}/soat
                    {e.phone && (
                      <span className="ml-1 inline-flex items-center gap-1">
                        <Phone size={10} /> {e.phone}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {e.onShift ? (
                  <>
                    <Badge tone="accent">
                      <CheckCircle2 size={12} /> Ishda
                    </Badge>
                    <Button size="sm" variant="secondary" disabled={marking === e.id} onClick={() => markCheckout(e.id)}>
                      <LogOut size={14} /> Chiqish
                    </Button>
                  </>
                ) : e.presentToday ? (
                  <Badge tone="accent">
                    <CheckCircle2 size={12} /> Keldi
                  </Badge>
                ) : (
                  <Button size="sm" variant="secondary" disabled={marking === e.id} onClick={() => markPresent(e.id)}>
                    Kelganini belgilash
                  </Button>
                )}
                <button
                  onClick={() => {
                    setEditing(e);
                    setModalOpen(true);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted text-foreground hover:text-accent"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => remove(e.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted text-foreground hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {initialEmployees.length === 0 && (
            <p className="py-10 text-center text-sm text-muted">Hali xodimlar qo&apos;shilmagan</p>
          )}
        </div>
      </Card>

      <EmployeeFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => router.refresh()}
        employee={editing}
      />
    </div>
  );
}
