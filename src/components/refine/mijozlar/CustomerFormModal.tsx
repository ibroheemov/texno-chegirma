"use client";

import { useState } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { RfField, RfModal, RfSelect } from "../RfModal";
import { readError } from "./shared";
import type { NdCustomerRow, SegmentRef } from "@/lib/customerRows";

type Props = {
  customer: NdCustomerRow | null;
  groups: SegmentRef[];
  tags: SegmentRef[];
  onClose: () => void;
  onSaved: () => void;
};

/** Add / edit a customer (New design). Mount it only while open so the fields start from `customer`. */
export function CustomerFormModal({ customer, groups, tags, onClose, onSaved }: Props) {
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [note, setNote] = useState(customer?.note ?? "");
  const [groupId, setGroupId] = useState(customer?.group?.id ?? "");
  const [tagIds, setTagIds] = useState<string[]>(customer?.tags.map((t) => t.id) ?? []);
  const [nameError, setNameError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleTag(id: string) {
    setTagIds((current) => (current.includes(id) ? current.filter((t) => t !== id) : [...current, id]));
  }

  async function save() {
    if (!name.trim()) {
      setNameError("Ismni kiriting");
      return;
    }
    setSaving(true);
    setError("");
    // Same customer API as the Old design; group and tags go through the New design segments route.
    const res = await fetch(customer ? `/api/customers/${customer.id}` : "/api/customers", {
      method: customer ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), phone: phone.trim(), address: address.trim(), note: note.trim() }),
    });
    if (!res.ok) {
      setSaving(false);
      setError(await readError(res));
      return;
    }
    const id: string = customer?.id ?? (await res.json()).customer.id;
    const segRes = await fetch(`/api/customers/${id}/segments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: groupId || null, tagIds }),
    });
    setSaving(false);
    if (!segRes.ok) {
      setError(await readError(segRes));
      onSaved();
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <RfModal
      open
      onClose={onClose}
      busy={saving}
      width={560}
      icon={<UserRound className="ic" size={20} />}
      title={customer ? "Mijozni tahrirlash" : "Yangi mijoz"}
      description={customer ? `«${customer.name}» ma’lumotlarini o‘zgartiring.` : "Mijoz ma’lumotlarini kiriting."}
      onSubmit={save}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Bekor qilish
          </button>
          <button type="submit" className={`btn btn-primary${saving ? " is-loading" : ""}`} disabled={saving}>
            {customer ? "Saqlash" : "Qo‘shish"}
          </button>
        </>
      }
    >
      <div className="mj-form-grid">
        <div className="mj-span">
          <RfField label="Ism familiya" required error={nameError}>
            <span className={`control${nameError ? " is-error" : ""}`}>
              <input
                autoFocus
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (nameError) setNameError("");
                }}
                placeholder="Masalan: Farxod aka"
              />
            </span>
          </RfField>
        </div>
        <RfField label="Telefon raqami" optional>
          <span className="control">
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+998 90 123 45 67" inputMode="tel" />
          </span>
        </RfField>
        <RfField label="MFY (Manzil)" optional>
          <span className="control">
            <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Masalan: Chilonzor MFY" />
          </span>
        </RfField>
        <div className="mj-span">
          <RfField label="Izoh" optional>
            <span className="control">
              <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Qo‘shimcha izoh" />
            </span>
          </RfField>
        </div>
        <div className="mj-span">
          <RfField label="Guruh" optional>
            <RfSelect value={groupId} onChange={setGroupId} ariaLabel="Guruh">
              <option value="">Guruhsiz</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </RfSelect>
          </RfField>
        </div>
        <div className="mj-span">
          <RfField label="Teglar" optional group>
            {tags.length === 0 ? (
              <span className="mj-hint">
                Hali teg yo‘q. <Link href="/admin/yangi-dizayn/mijozlar/guruhlar">Guruhlar va teglar</Link> bo‘limida yarating.
              </span>
            ) : (
              <div className="mj-chips">
                {tags.map((t) => {
                  const on = tagIds.includes(t.id);
                  return (
                    <button
                      type="button"
                      key={t.id}
                      className={`mj-chip mj-c-${t.color}${on ? " is-on" : ""}`}
                      aria-pressed={on}
                      onClick={() => toggleTag(t.id)}
                    >
                      <span className="dot" />
                      {t.name}
                    </button>
                  );
                })}
              </div>
            )}
          </RfField>
        </div>
      </div>
      {error && (
        <div className="alert mj-alert" role="alert">
          <p>{error}</p>
        </div>
      )}
    </RfModal>
  );
}
