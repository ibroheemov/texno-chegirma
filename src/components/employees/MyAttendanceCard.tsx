"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, LogOut } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FaceCheckInModal } from "./FaceCheckInModal";

function hhmm(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Shown to employee accounts on the Kassa page: they can only mark their own attendance. */
export function MyAttendanceCard({
  employeeId,
  employeeName,
  requireLocation,
  requireFace,
  checkIn,
  checkOut,
}: {
  employeeId: string;
  employeeName: string;
  requireLocation: boolean;
  requireFace: boolean;
  checkIn: string | null;
  checkOut: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function checkOutNow() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/employees/${employeeId}/attendance`, { method: "PATCH" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    router.refresh();
  }

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3">
        <Clock size={20} className="text-muted" />
        <div>
          <p className="text-sm font-semibold">Mening davomatim</p>
          <p className="text-xs text-muted">
            {!checkIn
              ? "Bugun hali kelganingiz belgilanmagan"
              : checkOut
                ? `Keldi ${hhmm(checkIn)} · Ketdi ${hhmm(checkOut)}`
                : `Keldi ${hhmm(checkIn)} · Ish jarayonida`}
          </p>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </div>
      {!checkIn && (
        <Button onClick={() => setOpen(true)}>
          <CheckCircle2 size={16} /> Kelganimni belgilash
        </Button>
      )}
      {checkIn && !checkOut && (
        <Button variant="secondary" onClick={checkOutNow} disabled={busy}>
          <LogOut size={16} /> Chiqishni belgilash
        </Button>
      )}
      {open && (
        <FaceCheckInModal
          open={open}
          onClose={() => setOpen(false)}
          employeeId={employeeId}
          employeeName={employeeName}
          requireLocation={requireLocation}
          requireFace={requireFace}
          onSuccess={() => router.refresh()}
        />
      )}
    </Card>
  );
}
