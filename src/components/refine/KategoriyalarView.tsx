"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  FolderOpen,
  Layers,
  Package,
  PackageX,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import "./kategoriyalar.css";

export type CategoryRow = { id: string; name: string; productCount: number };

type SortKey = "name-asc" | "name-desc" | "count-desc" | "count-asc";

const SORT_OPTIONS: [SortKey, string][] = [
  ["name-asc", "Nomi: A → Z"],
  ["name-desc", "Nomi: Z → A"],
  ["count-desc", "Mahsulotlar: ko‘pdan kamga"],
  ["count-asc", "Mahsulotlar: kamdan ko‘pga"],
];

async function readError(res: Response) {
  const data = await res.json().catch(() => ({}));
  return (data.error as string | undefined) ?? "Xatolik yuz berdi";
}

export function KategoriyalarView({
  initialCategories,
  totalProducts,
  uncategorized,
}: {
  initialCategories: CategoryRow[];
  totalProducts: number;
  uncategorized: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name-asc");

  // Add / rename modal: `editing` null means "add".
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? initialCategories.filter((c) => c.name.toLowerCase().includes(q)) : [...initialCategories];
    list.sort((a, b) => {
      switch (sortKey) {
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "count-desc":
          return b.productCount - a.productCount || a.name.localeCompare(b.name);
        case "count-asc":
          return a.productCount - b.productCount || a.name.localeCompare(b.name);
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [initialCategories, query, sortKey]);

  const emptyCount = initialCategories.filter((c) => c.productCount === 0).length;
  const maxCount = Math.max(1, ...initialCategories.map((c) => c.productCount));

  function openAdd() {
    setEditing(null);
    setName("");
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(category: CategoryRow) {
    setEditing(category);
    setName(category.name);
    setFormError("");
    setFormOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Nomini kiriting");
      return;
    }
    if (editing && trimmed === editing.name) {
      setFormOpen(false);
      return;
    }
    setSaving(true);
    setFormError("");
    const res = await fetch(editing ? `/api/categories/${editing.id}` : "/api/categories", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setSaving(false);
    if (!res.ok) {
      setFormError(editing && res.status >= 500 ? "Bu nomdagi kategoriya allaqachon mavjud" : await readError(res));
      return;
    }
    setFormOpen(false);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    const res = await fetch(`/api/categories/${deleteTarget.id}`, { method: "DELETE" });
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
            Katalog
          </span>
          <h1 className="t-h1">Kategoriyalar</h1>
          <p className="t-body-sm">Mahsulot kategoriyalarini boshqarish. Jami {initialCategories.length} ta kategoriya.</p>
        </div>
        <div className="acts">
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            <Plus className="ic" size={18} />
            Kategoriya qo‘shish
          </button>
        </div>
      </div>

      <div className="kt-kpis">
        <div className="card kpi kt-kpi">
          <span className="ic-tile">
            <Layers className="ic" size={20} />
          </span>
          <div className="kt-kpi-body">
            <span className="kpi-label">Kategoriyalar</span>
            <span className="kpi-val">{initialCategories.length}</span>
            <span className="kpi-foot">Do‘kondagi barcha kategoriyalar</span>
          </div>
        </div>
        <div className="card kpi kt-kpi">
          <span className="ic-tile success">
            <Package className="ic" size={20} />
          </span>
          <div className="kt-kpi-body">
            <span className="kpi-label">Kategoriyalangan mahsulotlar</span>
            <span className="kpi-val">
              {totalProducts - uncategorized}
              <small>/ {totalProducts}</small>
            </span>
            <span className="kpi-foot">
              {uncategorized > 0 ? `${uncategorized} ta mahsulot kategoriyasiz` : "Barcha mahsulotlarda kategoriya bor"}
            </span>
          </div>
        </div>
        <div className="card kpi kt-kpi">
          <span className="ic-tile warning">
            <FolderOpen className="ic" size={20} />
          </span>
          <div className="kt-kpi-body">
            <span className="kpi-label">Bo‘sh kategoriyalar</span>
            <span className="kpi-val">{emptyCount}</span>
            <span className="kpi-foot">Hali mahsulot biriktirilmagan</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="tbl-bar">
          <div className="control control-sm kt-search">
            <Search className="ic" size={16} />
            <input
              placeholder="Kategoriya nomi bo‘yicha qidirish…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Kategoriya qidirish"
            />
          </div>
          <div className="control control-sm kt-sort">
            <select aria-label="Tartiblash" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown className="ic" size={14} />
          </div>
          {query && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQuery("")}>
              <X className="ic" size={14} />
              Tozalash
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="empty">
            <span className="em-ic">
              <Tag className="ic" size={28} />
            </span>
            {initialCategories.length === 0 ? (
              <>
                <h4>Hali kategoriya qo‘shilmagan</h4>
                <p>Mahsulotlarni guruhlash uchun birinchi kategoriyani yarating.</p>
                <div className="acts">
                  <button type="button" className="btn btn-primary" onClick={openAdd}>
                    <Plus className="ic" size={18} />
                    Kategoriya qo‘shish
                  </button>
                </div>
              </>
            ) : (
              <>
                <h4>Kategoriya topilmadi</h4>
                <p>«{query}» bo‘yicha hech narsa topilmadi.</p>
                <div className="acts">
                  <button type="button" className="btn btn-outline" onClick={() => setQuery("")}>
                    Qidiruvni tozalash
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Kategoriya</th>
                  <th className="kt-col-share">Mahsulotlar ulushi</th>
                  <th className="r">Mahsulotlar</th>
                  <th className="r kt-col-act">
                    <span className="sr">Amallar</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="prod">
                        <span className={`ic-tile sm${c.productCount === 0 ? " neutral" : ""}`}>
                          <Tag className="ic" size={16} />
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <b className="rf-ellipsis">{c.name}</b>
                          <span>{c.productCount === 0 ? "Bo‘sh" : `${c.productCount} ta mahsulot`}</span>
                        </div>
                      </div>
                    </td>
                    <td className="kt-col-share">
                      <div className="prog prog-sm kt-prog">
                        <i style={{ width: `${(c.productCount / maxCount) * 100}%` }} />
                      </div>
                    </td>
                    <td className="r">
                      {c.productCount === 0 ? (
                        <span className="badge badge-outline">0</span>
                      ) : (
                        <span className="mono strong">{c.productCount}</span>
                      )}
                    </td>
                    <td className="r kt-col-act">
                      <div className="kt-acts">
                        <button
                          type="button"
                          className="row-act"
                          onClick={() => openEdit(c)}
                          aria-label={`${c.name} nomini o‘zgartirish`}
                          title="Tahrirlash"
                        >
                          <Pencil className="ic" size={16} />
                        </button>
                        <button
                          type="button"
                          className="row-act kt-danger"
                          onClick={() => {
                            setDeleteError("");
                            setDeleteTarget(c);
                          }}
                          aria-label={`${c.name} kategoriyasini o‘chirish`}
                          title="O‘chirish"
                        >
                          <Trash2 className="ic" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="tbl-foot">
          <span>
            {visible.length === initialCategories.length
              ? `${initialCategories.length} ta kategoriya`
              : `${visible.length} / ${initialCategories.length} ta kategoriya`}
          </span>
          {uncategorized > 0 && (
            <Link href="/admin/yangi-dizayn/ombor" className="kt-foot-link">
              <PackageX className="ic" size={14} />
              {uncategorized} ta mahsulot kategoriyasiz · Omborda ko‘rish
            </Link>
          )}
        </div>
      </div>

      {formOpen && (
        <div className="kt-overlay" onClick={() => !saving && setFormOpen(false)}>
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="kt-form-title"
            style={{ maxWidth: 460 }}
            onClick={(event) => event.stopPropagation()}
            onSubmit={submit}
          >
            <div className="modal-h">
              <span className="ic-tile">
                <Tag className="ic" size={20} />
              </span>
              <div>
                <h3 id="kt-form-title">{editing ? "Kategoriyani tahrirlash" : "Yangi kategoriya"}</h3>
                <p>{editing ? `«${editing.name}» nomini o‘zgartiring.` : "Mahsulotlarni guruhlash uchun nom kiriting."}</p>
              </div>
              <button type="button" className="x-btn" onClick={() => setFormOpen(false)} aria-label="Yopish">
                <X className="ic" size={18} />
              </button>
            </div>
            <div className="modal-b">
              <label className="field">
                <span className="label">
                  Kategoriya nomi <span className="req">*</span>
                </span>
                <span className={`control${formError ? " is-error" : ""}`}>
                  <input
                    autoFocus
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      if (formError) setFormError("");
                    }}
                    placeholder="Masalan: Telefonlar"
                    aria-invalid={!!formError}
                  />
                </span>
                {formError && (
                  <span className="help is-error" role="alert">
                    {formError}
                  </span>
                )}
              </label>
            </div>
            <div className="modal-f">
              <button type="button" className="btn btn-outline" onClick={() => setFormOpen(false)} disabled={saving}>
                Bekor qilish
              </button>
              <button type="submit" className={`btn btn-primary${saving ? " is-loading" : ""}`} disabled={saving}>
                {editing ? "Saqlash" : "Qo‘shish"}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="kt-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="kt-delete-title"
            style={{ maxWidth: 440 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-b kt-confirm-body">
              <span className="ic-tile lg danger">
                <Trash2 className="ic" size={22} />
              </span>
              <h3 className="t-h3" id="kt-delete-title">
                Kategoriyani o‘chirasizmi?
              </h3>
              <p className="t-body-sm">
                {deleteTarget.productCount > 0
                  ? `«${deleteTarget.name}» kategoriyasida ${deleteTarget.productCount} ta mahsulot bor. O‘chirilsa, ular kategoriyasiz qoladi. Bu amalni ortga qaytarib bo‘lmaydi.`
                  : `«${deleteTarget.name}» o‘chiriladi. Bu amalni ortga qaytarib bo‘lmaydi.`}
              </p>
              {deleteError && (
                <div className="alert alert-danger kt-alert" role="alert">
                  <p>{deleteError}</p>
                </div>
              )}
            </div>
            <div className="modal-f">
              <button type="button" className="btn btn-outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Bekor qilish
              </button>
              <button
                type="button"
                className={`btn btn-danger${deleting ? " is-loading" : ""}`}
                onClick={confirmDelete}
                disabled={deleting}
              >
                O‘chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
