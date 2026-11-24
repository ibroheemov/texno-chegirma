"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { TimePicker24 } from "@/components/ui/TimePicker24";
import { DeliveryDatePicker } from "@/components/pos/DeliveryDateTimeFields";

export type EditableAttendance = {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  checkIn: string | null;
  checkOut: string | null;
  employee: { id: string; name: string };
};

const pad = (n: number) => String(n).padStart(2, "0");
const toHHMM = (iso: string | null) => (iso ? `${pad(new Date(iso).getHours())}:${pad(new Date(iso).getMinutes())}` : "");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Admin-only editor: correct an existing attendance record, or add one for a missed day. */
export function AttendanceEditModal({
  open,
  onClose,
  onSaved,
  record,
  employees,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** null = add a new record */
  record: EditableAttendance | null;
  employees: { id: string; name: string }[];
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(dayKey(new Date()));
  const [status, setStatus] = useState<"PRESENT" | "ABSENT" | "LATE">("PRESENT");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setEmployeeId(record?.employee.id ?? employees[0]?.id ?? "");
    setDate(record ? dayKey(new Date(record.date)) : dayKey(new Date()));
    setStatus(record?.status ?? "PRESENT");
    setCheckIn(toHHMM(record?.checkIn ?? null));
    setCheckOut(toHHMM(record?.checkOut ?? null));
  }, [open, record, employees]);

  async function save() {
    setSaving(true);
    setError("");
    const payload = { status, checkInTime: checkIn, checkOutTime: checkOut };
    const res = await fetch(record ? `/api/attendance/${record.id}` : "/api/attendance", {
      method: record ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record ? payload : { ...payload, employeeId, date }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    onSaved();
    onClose();
  }

  async function remove() {
    if (!record || !confirm("Bu davomat yozuvini o'chirasizmi?")) return;
    setSaving(true);
    const res = await fetch(`/api/attendance/${record.id}`, { method: "DELETE" });
    setSaving(false);
    if (!res.ok) {
      setError("Xatolik yuz berdi");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={record ? "Davomatni tahrirlash" : "Davomat qo'shish"}>
      <div className="flex flex-col gap-3">
        {record ? (
          <p className="text-sm text-muted">
            {record.employee.name} · {new Date(record.date).toLocaleDateString("uz-UZ")}
          </p>
        ) : (
          <>
            <Field label="Xodim">
              <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sana">
              <DeliveryDatePicker value={date} onChange={setDate} />
            </Field>
          </>
        )}
        <Field label="Holat">
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="PRESENT">Keldi</option>
            <option value="LATE">Kech qoldi</option>
            <option value="ABSENT">Kelmadi</option>
          </Select>
        </Field>
        {status !== "ABSENT" && (
          <>
            <Field label="Kelgan vaqti (24 soat)">
              <TimePicker24 value={checkIn} onChange={setCheckIn} />
            </Field>
            <Field label="Ketgan vaqti (24 soat, ixtiyoriy)">
              <TimePicker24 value={checkOut} onChange={setCheckOut} />
            </Field>
          </>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          {record && (
            <Button variant="danger" onClick={remove} disabled={saving}>
              O&apos;chirish
            </Button>
          )}
          <Button className="flex-1" onClick={save} disabled={saving}>
            Saqlash
          </Button>
        </div>
      </div>
    </Modal>
  );
}
