"use client";

import { useEffect, useState } from "react";
import type { Customer } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";

export function CustomerFormModal({
  open,
  onClose,
  onSaved,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  customer?: Customer | null;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(customer?.name ?? "");
      setPhone(customer?.phone ?? "");
      setAddress(customer?.address ?? "");
      setNote(customer?.note ?? "");
      setError("");
    }
  }, [open, customer]);

  async function save() {
    if (!name) {
      setError("Ismni kiriting");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(customer ? `/api/customers/${customer.id}` : "/api/customers", {
      method: customer ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, address, note }),
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

  return (
    <Modal open={open} onClose={onClose} title={customer ? "Mijozni tahrirlash" : "Yangi mijoz"}>
      <div className="flex flex-col gap-3">
        <Field label="Ism familiya">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Farxod aka" />
        </Field>
        <Field label="Telefon raqami">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" />
        </Field>
        <Field label="MFY (Manzil)">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Masalan: Chilonzor MFY" />
        </Field>
        <Field label="Izoh">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Qo'shimcha izoh" />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button onClick={save} disabled={saving} className="mt-2">
          {saving && <Loader2 size={16} className="animate-spin" />}
          Saqlash
        </Button>
      </div>
    </Modal>
  );
}
