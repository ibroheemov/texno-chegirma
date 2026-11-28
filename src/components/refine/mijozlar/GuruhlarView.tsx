"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderOpen, Pencil, Plus, Tag, Trash2, UsersRound, X } from "lucide-react";
import { RfField, RfModal } from "../RfModal";
import { ColorPicker, SegmentBadge, readError } from "./shared";
import type { GroupRow, TagRow } from "@/lib/customerRows";
import type { SegmentColor } from "@/lib/customerSegments";

const BASE = "/admin/yangi-dizayn/mijozlar";

type Kind = "group" | "tag";
type FormState = { kind: Kind; editing: GroupRow | TagRow | null };

export function GuruhlarView({
  groups,
  tags,
  totalCustomers,
}: {
  groups: GroupRow[];
  tags: TagRow[];
  totalCustomers: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: Kind; item: GroupRow | TagRow } | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const grouped = groups.reduce((sum, g) => sum + g.count, 0);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    const res = await fetch(`/api/customer-${deleteTarget.kind === "group" ? "groups" : "tags"}/${deleteTarget.item.id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (!res.ok) {
      setDeleteError(await readError(res));
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <>
      <div className="page-h">
        <div className="ttl">
          <span className="t-overline" style={{ color: "var(--primary-text)" }}>
            Mijozlar
          </span>
          <h1 className="t-h1">Guruhlar va teglar</h1>
          <p className="t-body-sm">
            Mijozlarni guruhlarga ajrating va teglar bilan belgilang. Mijozga guruh va teg «Barcha mijozlar» sahifasida
            tahrirlash oynasidan biriktiriladi.
          </p>
        </div>
        <div className="acts">
          <button type="button" className="btn btn-outline" onClick={() => setForm({ kind: "tag", editing: null })}>
            <Tag className="ic" size={18} />
            Teg qo‘shish
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setForm({ kind: "group", editing: null })}>
            <Plus className="ic" size={18} />
            Guruh qo‘shish
          </button>
        </div>
      </div>

      <div className="mj-kpis">
        <div className="card kpi mj-kpi">
          <span className="ic-tile">
            <FolderOpen className="ic" size={20} />
          </span>
          <div className="mj-kpi-body">
            <span className="kpi-label">Guruhlar</span>
            <span className="kpi-val">{groups.length}</span>
            <span className="kpi-foot">Har bir mijoz bitta guruhda bo‘ladi</span>
          </div>
        </div>
        <div className="card kpi mj-kpi">
          <span className="ic-tile success">
            <UsersRound className="ic" size={20} />
          </span>
          <div className="mj-kpi-body">
            <span className="kpi-label">Guruhlangan mijozlar</span>
            <span className="kpi-val">
              {grouped}
              <small>/ {totalCustomers}</small>
            </span>
            <span className="kpi-foot">
              {totalCustomers - grouped > 0 ? `${totalCustomers - grouped} ta mijoz guruhsiz` : "Barcha mijozlar guruhda"}
            </span>
          </div>
        </div>
        <div className="card kpi mj-kpi">
          <span className="ic-tile warning">
            <Tag className="ic" size={20} />
          </span>
          <div className="mj-kpi-body">
            <span className="kpi-label">Teglar</span>
            <span className="kpi-val">{tags.length}</span>
            <span className="kpi-foot">Mijozda bir nechta teg bo‘lishi mumkin</span>
          </div>
        </div>
      </div>

      <div className="mj-two">
        <section className="card" aria-labelledby="mj-groups-h">
          <div className="mj-card-h">
            <span className="ic-tile sm">
              <FolderOpen className="ic" size={16} />
            </span>
            <div className="grow">
              <h3 id="mj-groups-h">Guruhlar</h3>
              <p>Masalan: Ulgurji xaridorlar, Doimiy mijozlar, Ustalar</p>
            </div>
          </div>
          {groups.length === 0 ? (
            <div className="empty">
              <span className="em-ic">
                <FolderOpen className="ic" size={28} />
              </span>
              <h4>Hali guruh yo‘q</h4>
              <p>Mijozlarni toifalarga ajratish uchun birinchi guruhni yarating.</p>
              <div className="acts">
                <button type="button" className="btn btn-primary" onClick={() => setForm({ kind: "group", editing: null })}>
                  <Plus className="ic" size={18} />
                  Guruh qo‘shish
                </button>
              </div>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.id} className={`mj-grp mj-c-${g.color}`}>
                <span className="mj-grp-mark">
                  <UsersRound className="ic" size={20} />
                </span>
                <div className="mj-grp-body">
                  <b>{g.name}</b>
                  <span>{g.description || "Tavsif yo‘q"}</span>
                </div>
                <Link href={`${BASE}?group=${g.id}`} className="mj-grp-count" title="Shu guruh mijozlarini ko‘rish">
                  {g.count} ta mijoz
                </Link>
                <div className="mj-acts">
                  <button
                    type="button"
                    className="row-act"
                    onClick={() => setForm({ kind: "group", editing: g })}
                    aria-label={`${g.name} guruhini tahrirlash`}
                    title="Tahrirlash"
                  >
                    <Pencil className="ic" size={16} />
                  </button>
                  <button
                    type="button"
                    className="row-act mj-danger"
                    onClick={() => {
                      setDeleteError("");
                      setDeleteTarget({ kind: "group", item: g });
                    }}
                    aria-label={`${g.name} guruhini o‘chirish`}
                    title="O‘chirish"
                  >
                    <Trash2 className="ic" size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="card" aria-labelledby="mj-tags-h">
          <div className="mj-card-h">
            <span className="ic-tile sm warning">
              <Tag className="ic" size={16} />
            </span>
            <div className="grow">
              <h3 id="mj-tags-h">Teglar</h3>
              <p>Masalan: VIP, Ishonchli, Optovik, Yangi</p>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm({ kind: "tag", editing: null })}>
              <Plus className="ic" size={16} />
              Teg
            </button>
          </div>
          {tags.length === 0 ? (
            <div className="empty">
              <span className="em-ic">
                <Tag className="ic" size={28} />
              </span>
              <h4>Hali teg yo‘q</h4>
              <p>Teglar mijozlarni tez topish va filtrlash uchun.</p>
            </div>
          ) : (
            <div className="mj-tagcloud">
              {tags.map((t) => (
                <span key={t.id} className={`mj-tagitem mj-c-${t.color}`}>
                  <Link href={`${BASE}?tag=${t.id}`} title="Shu tegli mijozlarni ko‘rish">
                    {t.name} <span className="n">{t.count}</span>
                  </Link>
                  <button type="button" onClick={() => setForm({ kind: "tag", editing: t })} aria-label={`${t.name} tegini tahrirlash`} title="Tahrirlash">
                    <Pencil className="ic" size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError("");
                      setDeleteTarget({ kind: "tag", item: t });
                    }}
                    aria-label={`${t.name} tegini o‘chirish`}
                    title="O‘chirish"
                  >
                    <X className="ic" size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      {form && (
        <SegmentFormModal
          kind={form.kind}
          editing={form.editing}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            router.refresh();
          }}
        />
      )}

      <RfModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        busy={deleting}
        width={440}
        icon={<Trash2 className="ic" size={20} />}
        iconTone="danger"
        title={deleteTarget?.kind === "group" ? "Guruhni o‘chirasizmi?" : "Tegni o‘chirasizmi?"}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Bekor qilish
            </button>
            <button type="button" className={`btn btn-danger${deleting ? " is-loading" : ""}`} onClick={confirmDelete} disabled={deleting}>
              O‘chirish
            </button>
          </>
        }
      >
        {deleteTarget && (
          <div className="mj-confirm">
            <p className="t-body-sm">
              «{deleteTarget.item.name}» o‘chiriladi.
              {deleteTarget.item.count > 0 &&
                (deleteTarget.kind === "group"
                  ? ` Undagi ${deleteTarget.item.count} ta mijoz guruhsiz qoladi.`
                  : ` U ${deleteTarget.item.count} ta mijozdan olib tashlanadi.`)}{" "}
              Mijozlarning o‘zi o‘chmaydi.
            </p>
            {deleteError && (
              <div className="alert mj-alert" role="alert">
                <p>{deleteError}</p>
              </div>
            )}
          </div>
        )}
      </RfModal>
    </>
  );
}

function SegmentFormModal({
  kind,
  editing,
  onClose,
  onSaved,
}: {
  kind: Kind;
  editing: GroupRow | TagRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isGroup = kind === "group";
  const [name, setName] = useState(editing?.name ?? "");
  const [color, setColor] = useState<SegmentColor>(editing?.color ?? (isGroup ? "blue" : "orange"));
  const [description, setDescription] = useState(editing && "description" in editing ? editing.description ?? "" : "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      setError("Nomini kiriting");
      return;
    }
    setSaving(true);
    setError("");
    const base = `/api/customer-${isGroup ? "groups" : "tags"}`;
    const res = await fetch(editing ? `${base}/${editing.id}` : base, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), color, description }),
    });
    setSaving(false);
    if (!res.ok) {
      setError(await readError(res));
      return;
    }
    onSaved();
  }

  const noun = isGroup ? "guruh" : "teg";

  return (
    <RfModal
      open
      onClose={onClose}
      busy={saving}
      width={480}
      icon={isGroup ? <FolderOpen className="ic" size={20} /> : <Tag className="ic" size={20} />}
      iconTone={isGroup ? undefined : "warning"}
      title={editing ? `${isGroup ? "Guruhni" : "Tegni"} tahrirlash` : `Yangi ${noun}`}
      description={editing ? `«${editing.name}»` : isGroup ? "Mijozlar toifasi uchun nom va rang tanlang." : "Mijozlarni belgilash uchun qisqa nom."}
      onSubmit={save}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Bekor qilish
          </button>
          <button type="submit" className={`btn btn-primary${saving ? " is-loading" : ""}`} disabled={saving}>
            {editing ? "Saqlash" : "Qo‘shish"}
          </button>
        </>
      }
    >
      <RfField label={isGroup ? "Guruh nomi" : "Teg nomi"} required error={error}>
        <span className={`control${error ? " is-error" : ""}`}>
          <input
            autoFocus
            value={name}
            maxLength={40}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError("");
            }}
            placeholder={isGroup ? "Masalan: Ulgurji xaridorlar" : "Masalan: VIP"}
          />
        </span>
      </RfField>
      {isGroup && (
        <RfField label="Tavsif" optional>
          <span className="control">
            <input value={description} maxLength={200} onChange={(event) => setDescription(event.target.value)} placeholder="Qisqa izoh" />
          </span>
        </RfField>
      )}
      <RfField label="Rang" group>
        <ColorPicker value={color} onChange={setColor} />
      </RfField>
      <RfField label="Ko‘rinishi" group>
        <div>
          <SegmentBadge kind={kind} name={name.trim() || (isGroup ? "Guruh" : "Teg")} color={color} />
        </div>
      </RfField>
    </RfModal>
  );
}
