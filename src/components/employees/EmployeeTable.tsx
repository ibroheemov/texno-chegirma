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
import { FaceCheckInModal } from "./FaceCheckInModal";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { TimePicker24 } from "@/components/ui/TimePicker24";
import { Users, UserCheck, UserX, Clock } from "lucide-react";

export type EmployeeRow = Employee & { presentToday: boolean; onShift: boolean; unclosedDate: string | null };

export function EmployeeTable({ initialEmployees }: { initialEmployees: EmployeeRow[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [marking, setMarking] = useState<string | null>(null);
  const [checkInTarget, setCheckInTarget] = useState<EmployeeRow | null>(null);
  const [fixTarget, setFixTarget] = useState<EmployeeRow | null>(null);
  const [fixTime, setFixTime] = useState("");
  const [fixError, setFixError] = useState("");

  function localDateKey(iso: string) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  async function saveFix() {
    if (!fixTarget?.unclosedDate || !fixTime) {
      setFixError("Chiqish vaqtini tanlang");
      return;
    }
    const res = await fetch(`/api/employees/${fixTarget.id}/attendance`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: localDateKey(fixTarget.unclosedDate), time: fixTime }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFixError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    setFixTarget(null);
    router.refresh();
  }

  const total = initialEmployees.length;
  const presentCount = initialEmployees.filter((e) => e.presentToday).length;
  const onShiftCount = initialEmployees.filter((e) => e.onShift).length;

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
                    {e.position ?? "Lavozim yo'q"} · {formatSom(e.salary)}/
                    {e.salaryType === "DAILY" ? "kun" : e.salaryType === "HOURLY" ? "soat" : "oy"}
                    {e.phone && (
                      <span className="ml-1 inline-flex items-center gap-1">
                        <Phone size={10} /> {e.phone}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {e.unclosedDate && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setFixTarget(e);
                      setFixTime(e.workEndTime ?? "");
                      setFixError("");
                    }}
                  >
                    <Clock size={14} className="text-warning" /> Chiqish belgilanmagan
                  </Button>
                )}
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
                  <Button size="sm" variant="secondary" onClick={() => setCheckInTarget(e)}>
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
      <Modal open={!!fixTarget} onClose={() => setFixTarget(null)} title="Chiqish vaqtini kiritish">
        {fixTarget?.unclosedDate && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              {fixTarget.name} {new Date(fixTarget.unclosedDate).toLocaleDateString("uz-UZ")} kuni ketganini
              belgilamagan. Haqiqiy ketgan vaqtni kiriting.
            </p>
            <Field label="Chiqish vaqti (24 soat)">
              <TimePicker24 value={fixTime} onChange={setFixTime} />
            </Field>
            {fixError && <p className="text-sm text-danger">{fixError}</p>}
            <Button onClick={saveFix}>Saqlash</Button>
          </div>
        )}
      </Modal>
      {checkInTarget && (
        <FaceCheckInModal
          open={!!checkInTarget}
          onClose={() => setCheckInTarget(null)}
          employeeId={checkInTarget.id}
          employeeName={checkInTarget.name}
          requireLocation={checkInTarget.allowedLat != null && checkInTarget.allowedLng != null}
          requireFace={!!checkInTarget.faceDescriptor}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
